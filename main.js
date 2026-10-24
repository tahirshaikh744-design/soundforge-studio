const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mastering = require('./mastering.js');
const sfxEngine = require('./sfx.js');
const { SFX_CATALOG } = require('./sfx-catalog.js');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let activeBatchCancel = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 660,
    backgroundColor: '#0b0d13',
    title: 'SoundForge Studio — Mobile & Game Audio Suite',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  // Security: prevent navigation away from local app & deny new windows
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export WAV…',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-export-wav');
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play Current Buffer',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-play');
          }
        },
        {
          label: 'Synthesize from Prompt',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('menu-synthesize');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Full Screen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SoundForge Studio',
          click: async () => {
            await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About SoundForge Studio',
              message: 'SoundForge Studio 1.0.0',
              detail:
                'HQ Game Audio Asset Generator — Mobile & Studio Grade.\n\n' +
                '• Developer: Mohd Tahir Shaikh\n' +
                '• Brand: NEURON TS LABS\n' +
                '• Contact: tahirshaikh744@gmail.com\n' +
                '• GitHub: https://github.com/tahirshaikh744-design\n\n' +
                '• Offline Piper Neural TTS Engine with ITU-R BS.1770-4 loudness compliance.\n' +
                '• 2,500 Physical Acoustic SFX models with 44.1 kHz / 48.0 kHz mobile engine export.\n' +
                '• Click-free micro-fades, true-peak lookahead limiter, and TPDF dither.\n' +
                '• 100% offline — zero cloud latency.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Native "Save As" dialog for WAV export
ipcMain.handle('save-wav', async (event, payload) => {
  const { suggestedName, bytes } = payload || {};
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;

  const musicDir = (() => {
    try { return app.getPath('music'); } catch (_) { return app.getPath('documents'); }
  })();
  const defaultFolder = path.join(musicDir, 'SoundForge');
  try { fs.mkdirSync(defaultFolder, { recursive: true }); } catch (_) { /* ignore */ }

  const safeName = String(suggestedName || 'soundforge.wav').replace(/[\\/:*?"<>|]/g, '_');
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Game Audio WAV',
    defaultPath: path.join(defaultFolder, safeName.endsWith('.wav') ? safeName : safeName + '.wav'),
    filters: [{ name: 'WAV Audio (*.wav)', extensions: ['wav'] }]
  });

  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  try {
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    fs.writeFileSync(result.filePath, buf);
    return { ok: true, path: result.filePath, size: buf.length };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

// Reveal path in OS file explorer with validation
ipcMain.handle('reveal-path', async (event, targetPath) => {
  if (typeof targetPath === 'string' && fs.existsSync(targetPath)) {
    shell.showItemInFolder(path.resolve(targetPath));
    return true;
  }
  return false;
});

// Batch export: pick destination folder
ipcMain.handle('choose-dir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const musicDir = (() => { try { return app.getPath('music'); } catch (_) { return app.getPath('documents'); } })();
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose Destination Folder for Mobile Game Audio Assets',
    defaultPath: musicDir,
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths || !result.filePaths.length) return { ok: false, canceled: true };
  return { ok: true, dir: result.filePaths[0] };
});

// Batch cancel signal
ipcMain.handle('batch-cancel', () => {
  activeBatchCancel = true;
  return { ok: true };
});

// Batch export: write one WAV file with strict directory traversal prevention
ipcMain.handle('write-wav', async (event, payload) => {
  try {
    const { dir, sub, filename, bytes } = payload || {};
    if (!dir) return { ok: false, error: 'No destination folder' };

    const baseDir = path.resolve(dir);
    const cleanSub = String(sub || '').replace(/^[\\/]+/, '');
    const safeFile = String(filename || 'sound.wav').replace(/[\\/:*?"<>|]/g, '_');
    const targetDir = path.resolve(baseDir, cleanSub);
    const fullPath = path.resolve(targetDir, safeFile);

    // Security check: ensure path does not escape base directory
    if (!fullPath.startsWith(baseDir + path.sep) && fullPath !== baseDir) {
      return { ok: false, error: 'Directory traversal security violation prevented' };
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    fs.writeFileSync(fullPath, buf);
    return { ok: true, path: fullPath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('get-app-info', () => ({
  name: app.getName(),
  version: app.getVersion(),
  platform: process.platform,
  musicPath: (() => { try { return app.getPath('music'); } catch (_) { return ''; } })()
}));

/* ============================================================================
   NEURAL TTS ENGINE (Piper / ONNX) — Bundled Offline
   ============================================================================ */
function engineDir() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, 'engine');
}
function piperExe() { return path.join(engineDir(), 'piper', 'piper.exe'); }
function espeakDir() { return path.join(engineDir(), 'piper', 'espeak-ng-data'); }
function voiceDir() { return path.join(engineDir(), 'voices'); }

const VOICE_META = {
  Ryan: { id: 'Ryan', name: 'Ryan — Deep Authority', desc: 'Warm commanding male · flagship announcer', tone: 'male' },
  Joe:  { id: 'Joe',  name: 'Joe — Energetic Player', desc: 'Bright young male · hype lines', tone: 'male' },
  Aria: { id: 'Aria', name: 'Aria — Female Announcer', desc: 'Clear professional female · trophy moments', tone: 'female' },
  Alan: { id: 'Alan', name: 'Alan — Classic British', desc: 'Polished British narrator · prestige', tone: 'male' }
};

function listVoices() {
  const dir = voiceDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.onnx.json'))
    .map(f => {
      const id = f.replace(/\.onnx\.json$/, '');
      const meta = VOICE_META[id] || { id, name: id, desc: '', tone: 'male' };
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) {}
      return {
        id,
        name: meta.name,
        desc: meta.desc,
        tone: meta.tone,
        installed: fs.existsSync(path.join(dir, id + '.onnx')),
        nativeRate: (cfg.audio && cfg.audio.sample_rate) || 22050
      };
    });
}

function engineStatus() {
  return {
    available: fs.existsSync(piperExe()) && fs.existsSync(espeakDir()),
    piper: piperExe(),
    voices: listVoices().length
  };
}

let ttsChain = Promise.resolve();
function enqueue(fn) {
  const p = ttsChain.then(fn, fn);
  ttsChain = p.then(() => {}, () => {});
  return p;
}

function paceToLengthScale(pace) {
  const p = Math.min(1.8, Math.max(0.55, Number(pace) || 1));
  return Math.round((1 / p) * 1000) / 1000;
}

function baseArgs(voiceId, extra) {
  const model = path.join(voiceDir(), voiceId + '.onnx');
  if (!fs.existsSync(model)) throw new Error('Voice model missing: ' + voiceId);
  return ['--model', model, '--espeak_data', espeakDir(), ...(extra || []), '--quiet'];
}

function runPiperSingle(text, voiceId, extra) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf_tts_'));
    const outFile = path.join(tmpDir, 'out.wav');
    let proc = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    };

    try {
      proc = spawn(piperExe(), [...baseArgs(voiceId, extra), '--output_file', outFile], { cwd: tmpDir, windowsHide: true });
    } catch (e) {
      cleanup();
      return reject(e);
    }

    timer = setTimeout(() => {
      if (proc) {
        try { proc.kill('SIGKILL'); } catch (_) {}
      }
      cleanup();
      reject(new Error('Piper synthesis timed out (25s)'));
    }, 25000);

    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('error', e => {
      cleanup();
      reject(e);
    });

    proc.on('close', code => {
      try {
        if (code !== 0 || !fs.existsSync(outFile)) {
          cleanup();
          return reject(new Error('Piper exited ' + code + (err ? ': ' + err.slice(0, 300) : '')));
        }
        const dec = mastering.decodeWav16(fs.readFileSync(outFile));
        cleanup();
        resolve(dec);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    proc.stdin.on('error', () => {});
    proc.stdin.write(String(text));
    proc.stdin.end();
  });
}

function runPiperBatch(items, voiceId, extra) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf_ttsb_'));
    let proc = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    };

    try {
      proc = spawn(piperExe(), [...baseArgs(voiceId, extra), '--json-input', '--output_dir', tmpDir], { cwd: tmpDir, windowsHide: true });
    } catch (e) {
      cleanup();
      return reject(e);
    }

    timer = setTimeout(() => {
      if (proc) {
        try { proc.kill('SIGKILL'); } catch (_) {}
      }
      cleanup();
      reject(new Error('Piper batch synthesis timed out (180s)'));
    }, 180000);

    let err = '';
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('error', e => {
      cleanup();
      reject(e);
    });

    proc.on('close', code => {
      if (timer) clearTimeout(timer);
      if (code !== 0) {
        cleanup();
        return reject(new Error('Piper batch exited ' + code + ': ' + err.slice(0, 300)));
      }
      resolve(tmpDir);
    });

    proc.stdin.on('error', () => {});
    for (const it of items) proc.stdin.write(JSON.stringify({ text: it.text, output_file: it.file }) + '\n');
    proc.stdin.end();
  });
}

/* ============================================================================
   PHYSICAL SFX ENGINE (Acoustic modeling with 44.1k/48k mobile target)
   ============================================================================ */
ipcMain.handle('sfx-catalog', () => SFX_CATALOG);

ipcMain.handle('sfx-synthesize', async (event, payload) => {
  const p = payload || {};
  try {
    const targetSr = p.targetSr || 44100;
    const r = sfxEngine.synthesizeSfx(p.item || {}, {
      driveAmt: p.driveAmt,
      reverbMix: p.reverbMix,
      targetSr: targetSr
    });
    return { ok: true, samples: r.samples.buffer, sampleRate: r.sr, duration: r.dur, label: r.label };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('sfx-batch', async (event, payload) => {
  const p = payload || {};
  activeBatchCancel = false;
  const wanted = Array.isArray(p.ids) && p.ids.length ? p.ids : null;
  const scope = p.scope || 'all';
  const category = p.category || null;
  const targetSr = p.targetSr || 44100;

  let items = SFX_CATALOG;
  if (scope === 'category' && category) items = items.filter(i => i.cat === category);
  if (wanted) {
    const set = new Set(wanted);
    items = items.filter(i => set.has(i.id));
  }
  if (!items.length) return { ok: false, error: 'Nothing to export' };
  if (!p.outDir || !fs.existsSync(p.outDir)) return { ok: false, error: 'Destination folder missing' };

  const total = items.length;
  let done = 0, ok = 0, fail = 0;

  for (const it of items) {
    if (activeBatchCancel) break;
    try {
      const r = sfxEngine.synthesizeSfx(it, {
        driveAmt: p.driveAmt,
        reverbMix: p.reverbMix,
        targetSr: targetSr
      });
      const targetDir = path.join(p.outDir, 'SFX', it.cat.replace(/[\\/:*?"<>|]/g, '_'));
      fs.mkdirSync(targetDir, { recursive: true });
      const safe = it.name.replace(/[\\/:*?"<>|]/g, '_');
      fs.writeFileSync(path.join(targetDir, safe + '.wav'), mastering.encodeWav16(r.samples, r.sr));
      ok++;
    } catch (_) { fail++; }
    done++;
    if (done % 15 === 0 || done === total) {
      if (!event.sender.isDestroyed()) event.sender.send('sfx-progress', { done, total, ok, fail, cancelled: activeBatchCancel });
      await new Promise(r => setImmediate(r));
    }
  }
  return { ok: true, written: ok, failed: fail, cancelled: activeBatchCancel };
});

ipcMain.handle('tts-status', () => engineStatus());
ipcMain.handle('tts-voices', () => listVoices());
ipcMain.handle('tts-presets', () => Object.keys(mastering.VOICE_PRESETS).map(k => ({ id: k, label: mastering.VOICE_PRESETS[k].label })));

ipcMain.handle('tts-synthesize', async (event, payload) => {
  const p = payload || {};
  const text = String(p.text || '').trim();
  if (!text) return { ok: false, error: 'Empty text' };
  const targetSr = p.targetSr || 44100;

  try {
    return await enqueue(async () => {
      const extra = ['--length_scale', String(paceToLengthScale(p.pace)), '--noise_scale', '0.667', '--noise_w', '0.8', '--sentence_silence', '0.25'];
      const dec = await runPiperSingle(text, p.voiceId, extra);
      const rawWav = mastering.encodeWav16(dec.samples, dec.sampleRate);
      const m = mastering.masterVoice(dec.samples, dec.sampleRate, {
        presetId: p.presetId,
        overrides: p.overrides,
        stingerKind: p.stingerKind,
        stingerAmount: p.stingerAmount,
        targetSr: targetSr
      });
      return {
        ok: true,
        samples: m.samples.buffer,
        sampleRate: m.sampleRate,
        duration: m.duration,
        metrics: m.metrics,
        rawWav: rawWav.buffer.slice(rawWav.byteOffset, rawWav.byteOffset + rawWav.byteLength)
      };
    });
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('tts-remaster', async (event, payload) => {
  const p = payload || {};
  const targetSr = p.targetSr || 44100;
  try {
    const rawBuf = p.rawWav ? Buffer.from(p.rawWav) : null;
    if (!rawBuf) return { ok: false, error: 'No source audio' };
    const dec = mastering.decodeWav16(rawBuf);
    const m = mastering.masterVoice(dec.samples, dec.sampleRate, {
      presetId: p.presetId,
      overrides: p.overrides,
      stingerKind: p.stingerKind,
      stingerAmount: p.stingerAmount,
      targetSr: targetSr
    });
    return {
      ok: true,
      samples: m.samples.buffer,
      sampleRate: m.sampleRate,
      duration: m.duration,
      metrics: m.metrics
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('tts-batch', async (event, payload) => {
  const p = payload || {};
  activeBatchCancel = false;
  const items = Array.isArray(p.items) ? p.items : [];
  if (!items.length) return { ok: false, error: 'Nothing to export' };
  if (!fs.existsSync(p.outDir)) return { ok: false, error: 'Destination folder missing' };
  const targetSr = p.targetSr || 44100;
  const total = items.length;

  try {
    return await enqueue(async () => {
      const extra = ['--length_scale', String(paceToLengthScale(p.pace)), '--noise_scale', '0.667', '--noise_w', '0.8', '--sentence_silence', '0.25'];
      const manifest = items.map((it, i) => ({ text: it.text, file: 'v' + String(i).padStart(5, '0') + '.wav' }));
      const tmpDir = await runPiperBatch(manifest, p.voiceId, extra);
      let done = 0, ok = 0, fail = 0;

      for (let i = 0; i < total; i++) {
        if (activeBatchCancel) break;
        const f = path.join(tmpDir, manifest[i].file);
        try {
          const dec = mastering.decodeWav16(fs.readFileSync(f));
          const m = mastering.masterVoice(dec.samples, dec.sampleRate, {
            presetId: p.presetId,
            overrides: p.overrides,
            stingerKind: items[i].stingerKind,
            stingerAmount: p.stingerAmount,
            targetSr: targetSr
          });
          const targetDir = path.join(p.outDir, items[i].sub || 'Voices');
          fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(path.join(targetDir, items[i].name + '.wav'), mastering.encodeWav16(m.samples, m.sampleRate));
          ok++;
        } catch (_) { fail++; }
        done++;
        if (done % 5 === 0 || done === total) {
          if (!event.sender.isDestroyed()) event.sender.send('tts-progress', { done, total, ok, fail, cancelled: activeBatchCancel });
          await new Promise(r => setImmediate(r));
        }
      }
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      return { ok: true, written: ok, failed: fail, cancelled: activeBatchCancel };
    });
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  console.error('SoundForge Studio uncaught exception:', err);
});
