const { app, BrowserWindow, ipcMain, dialog, Menu, shell, session } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mastering = require('./mastering.js');
const sfxEngine = require('./sfx.js');
const { SFX_CATALOG } = require('./sfx-catalog.js');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let activePiperProcess = null;
let activeBatchCancel = false;

/* ============================================================================
   INPUT VALIDATION & SANITIZATION HELPERS
   ============================================================================ */
function sanitizeFilename(name, fallback = 'sound.wav') {
  const clean = String(name || fallback).replace(/[\\/:*?"<>|\r\n\x00-\x1f]/g, '_').trim();
  return clean || fallback;
}

function validateTargetSr(sr) {
  const n = Number(sr);
  return n === 48000 ? 48000 : 44100;
}

function validateVoiceId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function killActivePiperProcess() {
  if (activePiperProcess && !activePiperProcess.killed) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(activePiperProcess.pid), '/T', '/F'], { windowsHide: true });
      } else {
        activePiperProcess.kill('SIGKILL');
      }
    } catch (_) {}
  }
  activePiperProcess = null;
}

/* ============================================================================
   WINDOW MANAGEMENT & HARDENED ELECTRON LIFECYCLE
   ============================================================================ */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 660,
    backgroundColor: '#0b0d13',
    title: 'SoundForge Studio — Mobile & Game Audio Suite',
    icon: fs.existsSync(path.join(__dirname, 'build', 'icon.ico')) ? path.join(__dirname, 'build', 'icon.ico') : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  });

  // Security: prevent opening unmanaged external windows inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: prevent in-window navigation away from local index.html
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url);
      }
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
              message: 'SoundForge Studio ' + app.getVersion(),
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

/* ============================================================================
   IPC AUDIO EXPORT & FILE MANAGEMENT
   ============================================================================ */
// Native "Save As" dialog for WAV export with true SHA-256 calculation
ipcMain.handle('save-wav', async (event, payload) => {
  const { suggestedName, bytes } = payload || {};
  if (!bytes || (!Buffer.isBuffer(bytes) && !ArrayBuffer.isView(bytes))) {
    return { ok: false, error: 'Invalid or missing audio buffer' };
  }
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;

  const musicDir = (() => {
    try { return app.getPath('music'); } catch (_) { return app.getPath('documents'); }
  })();
  const defaultFolder = path.join(musicDir, 'SoundForge');
  try { fs.mkdirSync(defaultFolder, { recursive: true }); } catch (_) { /* ignore */ }

  const safeName = sanitizeFilename(suggestedName, 'soundforge.wav');
  const targetFile = safeName.toLowerCase().endsWith('.wav') ? safeName : safeName + '.wav';

  const result = await dialog.showSaveDialog(win, {
    title: 'Export Game Audio WAV',
    defaultPath: path.join(defaultFolder, targetFile),
    filters: [{ name: 'WAV Audio (*.wav)', extensions: ['wav'] }]
  });

  if (result.canceled || !result.filePath) return { ok: false, canceled: true };

  try {
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    fs.writeFileSync(result.filePath, buf);
    const sha256 = mastering.computeSha256(buf);
    return { ok: true, path: result.filePath, size: buf.length, sha256 };
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

// Batch cancel signal — sets cancellation flag and terminates active child process
ipcMain.handle('batch-cancel', () => {
  activeBatchCancel = true;
  killActivePiperProcess();
  return { ok: true };
});

// Batch export: write one WAV file with strict directory traversal prevention & SHA-256
ipcMain.handle('write-wav', async (event, payload) => {
  try {
    const { dir, sub, filename, bytes } = payload || {};
    if (!dir) return { ok: false, error: 'No destination folder' };
    if (!bytes || (!Buffer.isBuffer(bytes) && !ArrayBuffer.isView(bytes))) {
      return { ok: false, error: 'Invalid audio bytes buffer' };
    }

    const baseDir = path.resolve(dir);
    const cleanSub = String(sub || '').replace(/^[\\/]+/, '').replace(/\.\.[\\/]/g, '');
    const safeFile = sanitizeFilename(filename, 'sound.wav');
    const finalFile = safeFile.toLowerCase().endsWith('.wav') ? safeFile : safeFile + '.wav';
    const targetDir = path.resolve(baseDir, cleanSub);
    const fullPath = path.resolve(targetDir, finalFile);

    // Security check: ensure path does not escape base directory
    if (!fullPath.startsWith(baseDir + path.sep) && fullPath !== baseDir) {
      return { ok: false, error: 'Directory traversal security violation prevented' };
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    fs.writeFileSync(fullPath, buf);
    const sha256 = mastering.computeSha256(buf);
    return { ok: true, path: fullPath, size: buf.length, sha256 };
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

// Authoritative model licensing and dataset metadata
const VOICE_META = {
  Ryan: {
    id: 'Ryan',
    name: 'Ryan — Deep Authority',
    desc: 'Warm commanding male · flagship announcer',
    tone: 'male',
    dataset: 'RyanSpeech Corpus',
    license: 'CC-BY-NC-SA-4.0',
    commercialSafe: false,
    upstream: 'https://huggingface.co/rhasspy/piper-voices'
  },
  Joe: {
    id: 'Joe',
    name: 'Joe — Energetic Player',
    desc: 'Bright young male · hype lines',
    tone: 'male',
    dataset: 'OHF-Voice / Open Home',
    license: 'CC0-1.0 Universal (Public Domain)',
    commercialSafe: true,
    upstream: 'https://huggingface.co/rhasspy/piper-voices'
  },
  Aria: {
    id: 'Aria',
    name: 'Aria — Female Announcer',
    desc: 'Clear professional female · trophy moments',
    tone: 'female',
    dataset: 'HFC Female Speech Dataset',
    license: 'CC-BY-NC-SA-4.0',
    commercialSafe: false,
    upstream: 'https://huggingface.co/rhasspy/piper-voices'
  },
  Alan: {
    id: 'Alan',
    name: 'Alan — Classic British',
    desc: 'Polished British narrator · prestige',
    tone: 'male',
    dataset: 'Mycroft Mimic 3 (apope)',
    license: 'CC-BY-SA-4.0',
    commercialSafe: false,
    upstream: 'https://huggingface.co/rhasspy/piper-voices'
  }
};

function listVoices() {
  const dir = voiceDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.onnx.json'))
    .map(f => {
      const id = f.replace(/\.onnx\.json$/, '');
      const meta = VOICE_META[id] || {
        id,
        name: id,
        desc: '',
        tone: 'male',
        dataset: 'Custom',
        license: 'Custom',
        commercialSafe: false,
        upstream: ''
      };
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) {}

      const onnxPath = path.join(dir, id + '.onnx');
      const onnxExists = fs.existsSync(onnxPath);
      let status = 'missing_model';
      let size = 0;
      if (onnxExists) {
        try {
          const stat = fs.statSync(onnxPath);
          size = stat.size;
          // Git LFS pointer files are ~130 bytes; real ONNX models are > 50MB.
          if (size < 50 * 1024) {
            status = 'lfs_pointer';
          } else {
            status = 'ready';
          }
        } catch (_) {
          status = 'unreadable';
        }
      }

      return {
        id,
        name: meta.name,
        desc: meta.desc,
        tone: meta.tone,
        dataset: meta.dataset,
        license: meta.license,
        commercialSafe: meta.commercialSafe,
        upstream: meta.upstream,
        status,
        installed: status === 'ready',
        modelSizeBytes: size,
        nativeRate: (cfg.audio && cfg.audio.sample_rate) || 22050
      };
    });
}

function engineStatus() {
  const voices = listVoices();
  const readyVoices = voices.filter(v => v.installed);
  return {
    available: fs.existsSync(piperExe()) && fs.existsSync(espeakDir()) && readyVoices.length > 0,
    piper: piperExe(),
    totalVoices: voices.length,
    readyVoices: readyVoices.length,
    voices
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
  const safeId = validateVoiceId(voiceId);
  const model = path.join(voiceDir(), safeId + '.onnx');
  if (!fs.existsSync(model)) {
    throw new Error('Voice model missing: ' + safeId);
  }
  const stat = fs.statSync(model);
  if (stat.size < 50 * 1024) {
    throw new Error('Voice model is a Git LFS pointer (' + safeId + '). Please run "git lfs pull" to fetch model weights.');
  }
  return ['--model', model, '--espeak_data', espeakDir(), ...(extra || []), '--quiet'];
}

function runPiperSingle(text, voiceId, extra) {
  return new Promise((resolve, reject) => {
    if (activeBatchCancel) {
      return reject(new Error('TTS operation cancelled by user'));
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf_tts_'));
    const outFile = path.join(tmpDir, 'out.wav');
    let proc = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (activePiperProcess === proc) activePiperProcess = null;
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    };

    try {
      proc = spawn(piperExe(), [...baseArgs(voiceId, extra), '--output_file', outFile], { cwd: tmpDir, windowsHide: true });
      activePiperProcess = proc;
    } catch (e) {
      cleanup();
      return reject(e);
    }

    timer = setTimeout(() => {
      if (proc) {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true });
          } else {
            proc.kill('SIGKILL');
          }
        } catch (_) {}
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
      if (activePiperProcess === proc) activePiperProcess = null;
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
    if (activeBatchCancel) {
      return reject(new Error('TTS batch operation cancelled by user'));
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf_ttsb_'));
    let proc = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (activePiperProcess === proc) activePiperProcess = null;
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    };

    try {
      proc = spawn(piperExe(), [...baseArgs(voiceId, extra), '--json-input', '--output_dir', tmpDir], { cwd: tmpDir, windowsHide: true });
      activePiperProcess = proc;
    } catch (e) {
      cleanup();
      return reject(e);
    }

    timer = setTimeout(() => {
      if (proc) {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true });
          } else {
            proc.kill('SIGKILL');
          }
        } catch (_) {}
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
      if (activePiperProcess === proc) activePiperProcess = null;
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
    const targetSr = validateTargetSr(p.targetSr);
    const r = sfxEngine.synthesizeSfx(p.item || {}, {
      driveAmt: p.driveAmt,
      reverbMix: p.reverbMix,
      targetSr: targetSr
    });
    return {
      ok: true,
      samples: r.samples.buffer,
      sampleRate: r.sr,
      duration: r.dur,
      label: r.label,
      interpretation: r.interpretation || null
    };
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
  const targetSr = validateTargetSr(p.targetSr);

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
  const assetManifest = [];

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
      const safe = sanitizeFilename(it.name, 'sound');
      const wavBytes = mastering.encodeWav16(r.samples, r.sr);
      const sha256 = mastering.computeSha256(wavBytes);
      fs.writeFileSync(path.join(targetDir, safe + '.wav'), wavBytes);
      assetManifest.push({
        id: it.id,
        name: it.name,
        category: it.cat,
        file: path.join('SFX', it.cat.replace(/[\\/:*?"<>|]/g, '_'), safe + '.wav'),
        size: wavBytes.length,
        sha256
      });
      ok++;
    } catch (_) { fail++; }
    done++;
    if (done % 15 === 0 || done === total) {
      if (!event.sender.isDestroyed()) event.sender.send('sfx-progress', { done, total, ok, fail, cancelled: activeBatchCancel });
      await new Promise(r => setImmediate(r));
    }
  }

  // Write audit manifest for build pipeline validation
  try {
    const manifestPath = path.join(p.outDir, 'SFX', 'sfx-export-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({
      generator: 'SoundForge Studio',
      version: app.getVersion(),
      timestamp: new Date().toISOString(),
      sampleRate: targetSr,
      totalCount: total,
      writtenCount: ok,
      failedCount: fail,
      cancelled: activeBatchCancel,
      assets: assetManifest
    }, null, 2));
  } catch (_) {}

  return { ok: true, written: ok, failed: fail, cancelled: activeBatchCancel };
});

ipcMain.handle('tts-status', () => engineStatus());
ipcMain.handle('tts-voices', () => listVoices());
ipcMain.handle('tts-presets', () => Object.keys(mastering.VOICE_PRESETS).map(k => ({ id: k, label: mastering.VOICE_PRESETS[k].label })));

ipcMain.handle('tts-synthesize', async (event, payload) => {
  const p = payload || {};
  const text = String(p.text || '').trim();
  if (!text) return { ok: false, error: 'Empty text' };
  if (text.length > 5000) return { ok: false, error: 'Text exceeds maximum length of 5000 characters' };
  const targetSr = validateTargetSr(p.targetSr);

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
  const targetSr = validateTargetSr(p.targetSr);
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
  const targetSr = validateTargetSr(p.targetSr);
  const total = items.length;

  try {
    return await enqueue(async () => {
      const extra = ['--length_scale', String(paceToLengthScale(p.pace)), '--noise_scale', '0.667', '--noise_w', '0.8', '--sentence_silence', '0.25'];
      const manifest = items.map((it, i) => ({ text: it.text, file: 'v' + String(i).padStart(5, '0') + '.wav' }));
      const tmpDir = await runPiperBatch(manifest, p.voiceId, extra);
      let done = 0, ok = 0, fail = 0;
      const assetManifest = [];

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
          const safe = sanitizeFilename(items[i].name, 'voice');
          const wavBytes = mastering.encodeWav16(m.samples, m.sampleRate);
          const sha256 = mastering.computeSha256(wavBytes);
          fs.writeFileSync(path.join(targetDir, safe + '.wav'), wavBytes);
          assetManifest.push({
            name: items[i].name,
            sub: items[i].sub || 'Voices',
            file: path.join(items[i].sub || 'Voices', safe + '.wav'),
            size: wavBytes.length,
            sha256
          });
          ok++;
        } catch (_) { fail++; }
        done++;
        if (done % 5 === 0 || done === total) {
          if (!event.sender.isDestroyed()) event.sender.send('tts-progress', { done, total, ok, fail, cancelled: activeBatchCancel });
          await new Promise(r => setImmediate(r));
        }
      }
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

      // Write batch export audit manifest
      try {
        const manifestPath = path.join(p.outDir, 'tts-export-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
          generator: 'SoundForge Studio',
          version: app.getVersion(),
          timestamp: new Date().toISOString(),
          sampleRate: targetSr,
          voiceId: p.voiceId,
          totalCount: total,
          writtenCount: ok,
          failedCount: fail,
          cancelled: activeBatchCancel,
          assets: assetManifest
        }, null, 2));
      } catch (_) {}

      return { ok: true, written: ok, failed: fail, cancelled: activeBatchCancel };
    });
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

/* ============================================================================
   APPLICATION READY HOOK WITH STRICT PERMISSION DENIAL
   ============================================================================ */
app.whenReady().then(() => {
  // Deny all permission requests (camera, mic, notifications, geolocation)
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(false);
    });
  }

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
