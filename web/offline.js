/* Hosted offline library and an ordered local archive. No cloud endpoint is configured. */
(function (global) {
  'use strict';
  let database, serial = Promise.resolve(), cacheSerial = Promise.resolve(), cacheRequested = false, registration, installing, reloadRequested = false;
  const state = { cache: 'not-enabled', archive: 'not-written', pending: false, error: '' };
  const listeners = new Set();
  function notify() { for (const listener of listeners) listener({ ...state, online: navigator.onLine !== false }); }
  function openDatabase() {
    if (!('indexedDB' in global)) return Promise.reject(new Error('Device archive is unavailable in this browser.'));
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('kotoba-device-archive', 1);
      request.onupgradeneeded = () => {
        for (const name of ['snapshots', 'pending']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = null; }; resolve(request.result); };
      request.onerror = () => { database = null; reject(new Error('The device archive could not be opened.')); };
      request.onblocked = () => { database = null; reject(new Error('Close older Kotoba tabs to update the device archive.')); };
    });
    return database;
  }
  async function transaction(mode, action) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots', 'pending'], mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error('The device archive could not be saved.'));
      try { action(tx, value => { result = value; }); } catch (error) { tx.abort(); reject(error); }
    });
  }
  function archive(progress) {
    const snapshot = structuredClone(progress);
    serial = serial.catch(() => {}).then(async () => {
      const validated = global.KotobaStorage.validateProgress(snapshot);
      const record = { progress: validated, savedAt: new Date().toISOString(), mutationId: global.crypto?.randomUUID?.() || 'device-' + Date.now() + '-' + Math.random().toString(36).slice(2) };
      await transaction('readwrite', tx => {
        tx.objectStore('snapshots').put(record, 'progress');
        // Only a pending local snapshot exists today. A future authenticated sync adapter
        // must first establish a server revision; this is not a timestamp-based merge.
        tx.objectStore('pending').put(record, 'latest');
      });
      state.archive = 'saved'; state.pending = true; state.error = ''; notify();
    }).catch(() => { state.archive = 'unavailable'; state.error = 'Secondary device archive unavailable. Export a JSON backup.'; notify(); });
    return serial;
  }
  async function readArchive() {
    await serial;
    const record = await transaction('readonly', (tx, result) => {
      const request = tx.objectStore('snapshots').get('progress');
      request.onsuccess = () => result(request.result || null);
    });
    return record ? { ...record, progress: global.KotobaStorage.validateProgress(record.progress) } : null;
  }
  function ensure(settings = {}) {
    cacheRequested = settings.offlineCaching === true || settings.offlineCaching !== false && location.protocol === 'https:';
    // Serialize registration/removal so rapidly changing the toggle honors its final value.
    cacheSerial = cacheSerial.catch(() => {}).then(() => manageCache(cacheRequested)).catch(() => {
      state.cache = 'unavailable'; state.error = 'Offline caching is unavailable here. Your study progress is kept.'; notify();
    });
    return cacheSerial;
  }
  async function manageCache(enabled) {
    if (!enabled) {
      if (installing) await installing;
      if (['http:', 'https:'].includes(location.protocol) && 'serviceWorker' in navigator) {
        const scope = new URL('./', location.href).href;
        const previous = registration || await navigator.serviceWorker.getRegistration(scope);
        if (previous?.scope === scope) await previous.unregister();
        const prefix = 'kotoba-library-' + new URL(scope).pathname + ':';
        if ('caches' in global) for (const name of await caches.keys()) if (name.startsWith(prefix)) await caches.delete(name);
      }
      registration = null; state.cache = 'not-enabled'; notify(); return;
    }
    if (!['http:', 'https:'].includes(location.protocol) || !global.isSecureContext || !('serviceWorker' in navigator)) {
      state.cache = 'unavailable'; notify(); return;
    }
    if (installing) return installing;
    if (registration?.active) { state.cache = registration.waiting ? 'update-ready' : 'ready'; notify(); return; }
    state.cache = 'preparing'; notify();
    installing = navigator.serviceWorker.register(new URL('./sw.js', location.href), { scope: new URL('./', location.href).pathname }).then(async result => {
      registration = result;
      result.addEventListener('updatefound', () => result.installing?.addEventListener('statechange', () => {
        if (result.waiting) { state.cache = 'update-ready'; notify(); }
      }));
      await navigator.serviceWorker.ready;
      state.cache = result.waiting ? 'update-ready' : 'ready'; state.error = ''; notify();
    }).catch(() => { state.cache = 'unavailable'; state.error = 'Offline library could not be prepared. Online and direct-file study remain available.'; notify(); }).finally(() => { installing = null; });
    return installing;
  }
  function renderSettings(ctx) {
    const U = global.KotobaUI, { el, button, card, paragraph: p, actions } = U;
    const fileMode = location.protocol === 'file:';
    const settings = ctx.progress().settings;
    const enabled = settings.offlineCaching === true || settings.offlineCaching !== false && location.protocol === 'https:';
    return card(el('h2', {}, 'Offline library and device archive'),
      p(fileMode ? 'This direct-file copy already includes the study assets. Hosted offline caching is available on HTTPS or localhost.' : 'Prepare the hosted study library for offline reloads. Browser voices may still need a network; typing and reading work offline.'),
      el('p', { id: 'offline-library-status', className: 'section-description', role: 'status' }, 'Library: ' + state.cache.replaceAll('-', ' ') + ' · device archive: ' + state.archive.replaceAll('-', ' ')),
      el('label', { className: 'offline-toggle' }, el('input', { type: 'checkbox', id: 'offline-cache-toggle', checked: enabled, disabled: fileMode,
        onChange: event => { ctx.update(current => ({ ...current, settings: { ...current.settings, offlineCaching: event.target.checked } })); ensure(ctx.progress().settings); } }), 'Keep hosted study assets for offline use'),
      actions(
        button('Apply library update and reload', () => {
          const active = ctx.progress().attempts.find(a => a.id === ctx.progress().activeAttemptId);
          if (active?.status === 'in-progress' || ctx.progress().learnlab?.activeSessionId) { ctx.notice('Finish the saved session before applying the library update.'); return; }
          reloadRequested = true; registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }, 'button secondary', { id: 'apply-library-update', hidden: state.cache !== 'update-ready' }),
        button('Download device archive', async () => {
          try {
            const record = await readArchive();
            if (!record) { ctx.notice('The archive is empty. Export current progress instead.'); return; }
            const url = URL.createObjectURL(new Blob([JSON.stringify(record.progress, null, 2)], { type: 'application/json' }));
            const link = el('a', { href: url, download: 'kotoba-device-archive.json' }); document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000); ctx.notice('Archive downloaded. Use Import backup to review and restore it.');
          } catch { ctx.notice('The device archive is unavailable. Current progress can still be exported.'); }
        }, 'button secondary')
      ),
      p('Cloud sync is not connected. Device archive data stays in this browser. Exported backups remain the portable way to move progress.'),
      state.error ? p(state.error) : null);
  }
  addEventListener('online', notify); addEventListener('offline', notify);
  navigator.serviceWorker?.addEventListener('controllerchange', () => { if (reloadRequested) location.reload(); });
  global.KotobaOffline = { archive, readArchive, ensure, renderSettings, state: () => ({ ...state }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
})(window);
