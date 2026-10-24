const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  // Authoritative SFX catalog (2,500 entries), fetched once at preload so the
  // renderer list and the main-process audio engine can never disagree.
  sfxCatalog: async () => (await ipcRenderer.invoke('sfx-catalog')) || [],

  saveWav: (suggestedName, arrayBuffer) =>
    ipcRenderer.invoke('save-wav', {
      suggestedName,
      bytes: new Uint8Array(arrayBuffer)
    }),
  revealPath: (targetPath) => ipcRenderer.invoke('reveal-path', targetPath),
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  writeWav: (dir, sub, filename, arrayBuffer) =>
    ipcRenderer.invoke('write-wav', {
      dir,
      sub,
      filename,
      bytes: new Uint8Array(arrayBuffer)
    }),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  sfxSynthesize: (opts) => ipcRenderer.invoke('sfx-synthesize', opts),
  sfxBatch: (opts) => ipcRenderer.invoke('sfx-batch', opts),
  cancelBatch: () => ipcRenderer.invoke('batch-cancel'),
  onSfxProgress: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = (event, payload) => cb(payload);
    ipcRenderer.on('sfx-progress', handler);
    return () => {
      try { ipcRenderer.removeListener('sfx-progress', handler); } catch (_) {}
    };
  },

  ttsStatus: () => ipcRenderer.invoke('tts-status'),
  ttsVoices: () => ipcRenderer.invoke('tts-voices'),
  ttsPresets: () => ipcRenderer.invoke('tts-presets'),
  ttsSynthesize: (opts) => ipcRenderer.invoke('tts-synthesize', opts),
  ttsRemaster: (opts) => ipcRenderer.invoke('tts-remaster', opts),
  ttsBatch: (opts) => ipcRenderer.invoke('tts-batch', opts),
  onTtsProgress: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = (event, payload) => cb(payload);
    ipcRenderer.on('tts-progress', handler);
    return () => {
      try { ipcRenderer.removeListener('tts-progress', handler); } catch (_) {}
    };
  },

  onMenuExportWav: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('menu-export-wav', handler);
    return () => {
      try { ipcRenderer.removeListener('menu-export-wav', handler); } catch (_) {}
    };
  },
  onMenuPlay: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('menu-play', handler);
    return () => {
      try { ipcRenderer.removeListener('menu-play', handler); } catch (_) {}
    };
  },
  onMenuSynthesize: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('menu-synthesize', handler);
    return () => {
      try { ipcRenderer.removeListener('menu-synthesize', handler); } catch (_) {}
    };
  }
});