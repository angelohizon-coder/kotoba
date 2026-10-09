// Generated from src/lib/progress-repository.ts and its local imports. Edit src/ then run tools/build-browser.mjs.
(function(global){
'use strict';
const compiled={};
compiled["src/lib/progress-repository.ts"] = (() => {
const { loadProgress, saveProgress, STORAGE_KEY, validateProgress } = global.KotobaStorage;

// A future authenticated API implements this port. It is never instantiated by the static app.
                                           
                                    
                                                         
 
                                   
                                    
                                    
                                   
 
                                          
                                          
                                                            
                                   
                                     
 

// Preserve synchronous saves, the existing key, recoverable raw bytes and plain JSON backups.
// Revision comparison belongs in a server transaction; localStorage is not atomic across tabs.
function createLocalProgressRepository(port                   )                          {
  const storage = port || {
    loadProgress, saveProgress,
    readOriginalRaw: () => localStorage.getItem(STORAGE_KEY),
  };
  return {
    load: () => storage.loadProgress(),
    save: progress => storage.saveProgress(progress),
    readOriginalRaw: () => storage.readOriginalRaw(),
    validate: input => validateProgress(input),
  };
}
return {createLocalProgressRepository};
})();
global.KotobaRepository=compiled["src/lib/progress-repository.ts"];
})(window);
