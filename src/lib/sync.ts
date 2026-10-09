// sync.ts
declare const firebase: any;

const firebaseConfig = {
  apiKey: "AIzaSyD0jeZyg4ZNv0OZHaKMrdegHyQ1XuIjrqU",
  authDomain: "kotoba-41ab0.firebaseapp.com",
  projectId: "kotoba-41ab0",
  storageBucket: "kotoba-41ab0.firebasestorage.app",
  messagingSenderId: "792855742091",
  appId: "1:792855742091:web:d19a67284fdc6cf0c0368e",
  measurementId: "G-B9EVNBXG7E"
};

export function setupSync(repository: any, onExternalUpdate: (progress: any) => void, onAuthChange: () => void) {
  try {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    let currentUser = null;
    let unsubscribeSync = null;
    let isSavingToCloud = false;

    const originalSave = repository.save;
    
    repository.save = (progress) => {
      const result = originalSave(progress);
      if (currentUser && !isSavingToCloud) {
        db.collection('users').doc(currentUser.uid).set({
          progress: progress,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => {
          console.error("Firebase sync error:", err);
          alert("Cloud Sync Error: " + err.message + "\n\nPlease ensure you have enabled Firestore Database in your Firebase Console and set up the correct Security Rules.");
        });
      }
      return result;
    };

    auth.onAuthStateChanged(user => {
      currentUser = user;
      if (unsubscribeSync) {
        unsubscribeSync();
        unsubscribeSync = null;
      }
      
      onAuthChange();

      if (user) {
        unsubscribeSync = db.collection('users').doc(user.uid).onSnapshot(doc => {
          if (doc.exists) {
            const data = doc.data();
            if (data.progress) {
              // Prevent save loop when updating from cloud
              isSavingToCloud = true;
              try {
                const validated = repository.validate(data.progress);
                repository.save(validated);
                onExternalUpdate(validated);
              } catch (e) {
                console.error("Invalid cloud progress", e);
                alert("Cloud Sync Error: The progress received from the cloud could not be validated.\n\nDetails: " + (e.message || e) + "\n\nThis usually happens if one of your devices is running an older version of the app. Please clear the website data on this device and reload to update.");
              }
              isSavingToCloud = false;
            }
          }
        });
      }
    });

    return {
      login: () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
      },
      logout: () => auth.signOut(),
      getCurrentUser: () => currentUser
    };
  } catch (err) {
    console.error("Firebase sync setup failed:", err);
    return undefined;
  }
}
