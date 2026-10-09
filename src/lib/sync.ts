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
    originalSave(progress);
    if (currentUser && !isSavingToCloud) {
      db.collection('users').doc(currentUser.uid).set({
        progress: progress,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.error("Firebase sync error:", err));
    }
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
}
