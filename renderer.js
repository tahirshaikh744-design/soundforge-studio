/* ============================================================================
   SOUNDFORGE STUDIO — RENDERER CONTROLLER
   Author: Mohd Tahir Shaikh (NEURON TS LABS)
   Production-hardened, CSP-compliant, zero-memory-leak event architecture
   ============================================================================ */

/* ============================================================================
   CATALOG — 200 GAME VOICE LINES + 2,500 PHYSICAL SFX
   ============================================================================ */
const WORD_LIST_RAW = [
  ["Victory","Praise","win"],["Nice","Praise","up"],["Wonderful","Praise","win"],["Amazing","Praise","win"],
  ["Awesome","Praise","win"],["Fantastic","Praise","win"],["Excellent","Praise","win"],["Brilliant","Praise","up"],
  ["Superb","Praise","up"],["Incredible","Praise","win"],["Outstanding","Praise","win"],["Flawless","Praise","win"],
  ["Magnificent","Praise","win"],["Sensational","Praise","win"],["Perfection","Praise","win"],["Godlike","Praise","epic"],
  ["Unstoppable","Praise","epic"],["Legendary","Praise","epic"],["Great Job","Praise","up"],["Well Played","Praise","up"],
  ["Phenomenal","Praise","win"],["Splendid","Praise","up"],["Terrific","Praise","up"],["Majestic","Praise","win"],
  ["Supreme","Praise","epic"],["Masterpiece","Praise","win"],["Immortal","Praise","epic"],["Radiant","Praise","up"],
  ["Glorious","Praise","win"],["Triumph","Praise","win"],
  ["Game Over","Match Flow","lose"],["You Win","Match Flow","win"],["You Lose","Match Flow","lose"],["Defeat","Match Flow","lose"],
  ["Draw Game","Match Flow","neutral"],["Match Point","Match Flow","alert"],["Final Round","Match Flow","alert"],["Round One","Match Flow","neutral"],
  ["Round Two","Match Flow","neutral"],["Round Three","Match Flow","neutral"],["Ready","Match Flow","up"],["Fight","Match Flow","hit"],
  ["Go","Match Flow","up"],["Sudden Death","Match Flow","alert"],["Time Up","Match Flow","lose"],["Stage Clear","Match Flow","win"],
  ["Level Up","Match Flow","win"],["Mission Complete","Match Flow","win"],["Mission Failed","Match Flow","lose"],["Game Paused","Match Flow","neutral"],
  ["Continue","Match Flow","up"],["Restart","Match Flow","neutral"],["Wave Cleared","Match Flow","win"],["Overtime","Match Flow","alert"],
  ["Prepare Yourself","Match Flow","alert"],["New Challenger","Match Flow","alert"],["Begin","Match Flow","up"],["Finish","Match Flow","hit"],
  ["Victory Is Yours","Match Flow","win"],["Try Again","Match Flow","lose"],
  ["Combo","Combos","up"],["Double Combo","Combos","up"],["Triple Combo","Combos","win"],["Mega Combo","Combos","win"],
  ["Ultra Combo","Combos","epic"],["Super Combo","Combos","win"],["Monster Combo","Combos","epic"],["Combo Breaker","Combos","hit"],
  ["Combo King","Combos","win"],["Chain Reaction","Combos","up"],["Rampage","Combos","epic"],["Killing Spree","Combos","epic"],
  ["Dominating","Combos","epic"],["Blitz","Combos","up"],["Frenzy","Combos","up"],["Overdrive","Combos","epic"],
  ["Maximum Combo","Combos","epic"],["Multiplier Up","Combos","up"],["Score Boost","Combos","up"],["Fever Mode","Combos","win"],
  ["On Fire","Combos","win"],["Unbelievable","Combos","epic"],["Hyper Combo","Combos","epic"],["Insane Combo","Combos","epic"],
  ["Crazy Combo","Combos","win"],["Chain Master","Combos","win"],["Streak","Combos","up"],["Non Stop","Combos","up"],
  ["Full Power","Combos","epic"],["Limit Break","Combos","epic"],
  ["First Blood","Combat","hit"],["Double Kill","Combat","hit"],["Triple Kill","Combat","win"],["Quadra Kill","Combat","epic"],
  ["Penta Kill","Combat","epic"],["Multi Kill","Combat","win"],["Team Wipe","Combat","epic"],["Headshot","Combat","hit"],
  ["Critical Hit","Combat","hit"],["Knockout","Combat","hit"],["Finish Him","Combat","lose"],["Fatality","Combat","lose"],
  ["Brutality","Combat","hit"],["Counter","Combat","up"],["Parry","Combat","up"],["Blocked","Combat","neutral"],
  ["Deflected","Combat","neutral"],["Shattered","Combat","hit"],["Obliterated","Combat","epic"],["Executed","Combat","hit"],
  ["Revenge","Combat","hit"],["Shut Down","Combat","hit"],["Bullseye","Combat","up"],["Direct Hit","Combat","hit"],
  ["Armor Break","Combat","hit"],["Stunned","Combat","neutral"],["Silenced","Combat","neutral"],["One Shot","Combat","hit"],
  ["Savage","Combat","epic"],["Wiped Out","Combat","lose"],
  ["Rolled A Six","Board & Ludo","win"],["Your Turn","Board & Ludo","up"],["Roll Again","Board & Ludo","up"],["Safe Zone","Board & Ludo","up"],
  ["Captured","Board & Ludo","hit"],["Home Run","Board & Ludo","win"],["Star Power","Board & Ludo","win"],["Bankrupt","Board & Ludo","lose"],
  ["Turn Skipped","Board & Ludo","lose"],["Draw Card","Board & Ludo","neutral"],["Wild Card","Board & Ludo","up"],["Uno","Board & Ludo","win"],
  ["Checkmate","Board & Ludo","win"],["Check","Board & Ludo","alert"],["Touchdown","Board & Ludo","win"],["Goal","Board & Ludo","win"],
  ["Strike","Board & Ludo","hit"],["Spare","Board & Ludo","up"],["Foul","Board & Ludo","lose"],["Pass","Board & Ludo","neutral"],
  ["Out Of Moves","Board & Ludo","lose"],["Shuffle","Board & Ludo","neutral"],["Jackpot Roll","Board & Ludo","win"],["Winner Takes All","Board & Ludo","epic"],
  ["Bonus Roll","Board & Ludo","up"],["Piece Home","Board & Ludo","win"],["Double Six","Board & Ludo","epic"],["Blocked Path","Board & Ludo","neutral"],
  ["Lucky Roll","Board & Ludo","up"],["Board Master","Board & Ludo","win"],
  ["Jackpot","Casino & RPG","epic"],["Mega Jackpot","Casino & RPG","epic"],["Big Win","Casino & RPG","win"],["Huge Win","Casino & RPG","win"],
  ["Super Win","Casino & RPG","epic"],["Epic Win","Casino & RPG","epic"],["Lucky","Casino & RPG","up"],["Bingo","Casino & RPG","win"],
  ["Winner","Casino & RPG","win"],["Bonus","Casino & RPG","up"],["Free Spin","Casino & RPG","up"],["Double Down","Casino & RPG","up"],
  ["High Roller","Casino & RPG","win"],["All In","Casino & RPG","alert"],["Cash Out","Casino & RPG","up"],["Coin Shower","Casino & RPG","win"],
  ["Treasure","Casino & RPG","win"],["Grand Prize","Casino & RPG","epic"],["Warning","Casino & RPG","alert"],["Danger","Casino & RPG","alert"],
  ["Hurry Up","Casino & RPG","alert"],["Time Running Out","Casino & RPG","alert"],["Last Chance","Casino & RPG","alert"],["Critical Health","Casino & RPG","lose"],
  ["Speed Up","Casino & RPG","up"],["Boost","Casino & RPG","up"],["Turbo","Casino & RPG","up"],["Nitro","Casino & RPG","up"],
  ["Drift","Casino & RPG","neutral"],["Final Lap","Casino & RPG","alert"],["Check Point","Casino & RPG","up"],["New Record","Casino & RPG","win"],
  ["Fastest Lap","Casino & RPG","win"],["Emergency","Casino & RPG","alert"],["Quest Accepted","Casino & RPG","up"],["Quest Complete","Casino & RPG","win"],
  ["Skill Unlocked","Casino & RPG","win"],["Rank Up","Casino & RPG","win"],["Inventory Full","Casino & RPG","neutral"],["Health Low","Casino & RPG","alert"],
  ["Mana Depleted","Casino & RPG","lose"],["Revived","Casino & RPG","win"],["Resurrected","Casino & RPG","win"],["Cursed","Casino & RPG","lose"],
  ["Poisoned","Casino & RPG","lose"],["Blessed","Casino & RPG","up"],["Level Max","Casino & RPG","epic"],["Legendary Drop","Casino & RPG","epic"],
  ["Spell Cast","Casino & RPG","up"],["Awakened","Casino & RPG","epic"]
];

const WORDS_CATALOG = WORD_LIST_RAW.map((item, idx) => ({
  id: 'word_' + idx, name: item[0], cat: item[1], stinger: item[2], isWord: true
}));

let SFX_CATALOG = [];
let SFX_CATEGORIES = [];

/* ============================================================================
   WEB AUDIO API ENGINE (Zero-Latency, Memory-Leak Free Preview)
   ============================================================================ */
let audioCtx = null;
let activeSourceNode = null;
let gainNode = null;
let playStartTime = 0;
let playDuration = 0;
let playAnimFrame = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function stopPlayback() {
  if (activeSourceNode) {
    try { activeSourceNode.stop(); } catch (_) {}
    try { activeSourceNode.disconnect(); } catch (_) {}
    activeSourceNode = null;
  }
  if (playAnimFrame) {
    cancelAnimationFrame(playAnimFrame);
    playAnimFrame = null;
  }
}

function playBuffer() {
  if (!currentSamples || !currentSamples.length) {
    setStatus('Nothing loaded yet — pick a sound or click Synthesize', '#ef4444');
    return;
  }
  stopPlayback();
  const ctx = getAudioContext();
  gainNode.gain.setValueAtTime(masterVolume(), ctx.currentTime);

  const audioBuffer = ctx.createBuffer(1, currentSamples.length, currentSr);
  audioBuffer.copyToChannel(currentSamples, 0);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);

  playStartTime = ctx.currentTime;
  playDuration = audioBuffer.duration;
  activeSourceNode = source;

  source.onended = () => {
    if (activeSourceNode === source) {
      activeSourceNode = null;
      drawOscilloscope(currentSamples, -1);
    }
  };

  source.start(0);
  startPlayheadAnimation();

  const name = selectedItem ? selectedItem.name : '';
  const suffix = selectedItem && selectedItem.isWord && currentVoiceLabel ? ' · ' + currentVoiceLabel : '';
  setStatus('Playing: "' + name + '"' + suffix + ' (' + (currentSr / 1000).toFixed(1) + ' kHz)', '#06b6d4');
}

function startPlayheadAnimation() {
  if (playAnimFrame) cancelAnimationFrame(playAnimFrame);
  function tick() {
    if (!activeSourceNode || !audioCtx) return;
    const elapsed = audioCtx.currentTime - playStartTime;
    const progress = Math.min(1.0, elapsed / playDuration);
    drawOscilloscope(currentSamples, progress);
    if (progress < 1.0) {
      playAnimFrame = requestAnimationFrame(tick);
    }
  }
  playAnimFrame = requestAnimationFrame(tick);
}

function playTestTone() {
  const n = Math.floor(targetSr * 0.9);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / targetSr;
    s[i] = (Math.sin(2 * Math.PI * 523.25 * t) * 0.5 + Math.sin(2 * Math.PI * 659.25 * t) * 0.3) * Math.exp(-t * 2.8) * 0.7;
  }
  currentSamples = s;
  currentSr = targetSr;
  currentWav = float32ToWav16(s, currentSr);
  playBuffer();
  setStatus('Test tone (C5 Chord) @ ' + (targetSr / 1000).toFixed(1) + ' kHz — audio output OK', '#10b981');
}

/* ============================================================================
   WAV ENCODER (16-Bit PCM with Seeded Deterministic TPDF Dither)
   ============================================================================ */
function float32ToWav16(samples, sr) {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  ws(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);                 // PCM
  v.setUint16(22, 1, true);                 // Mono
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ws(36, 'data');
  v.setUint32(40, n * 2, true);

  // Deterministic PRNG seeded by buffer size and initial samples
  let seed = (n ^ 0x9e3779b9) >>> 0;
  for (let k = 0; k < Math.min(64, n); k++) {
    seed = (Math.imul(seed ^ Math.floor(Math.abs(samples[k]) * 1000000), 1664525) + 1013904223) >>> 0;
  }
  function nextRand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 0) / 4294967296;
  }

  let o = 44;
  let prevRand = 0;
  for (let i = 0; i < n; i++, o += 2) {
    let s = Math.max(-1.0, Math.min(1.0, samples[i]));
    const r = nextRand() - nextRand();
    const dither = (r - prevRand) * 0.5;
    prevRand = r;
    const quant = Math.round(s * 32767.0 + dither);
    const clamped = quant > 32767 ? 32767 : quant < -32768 ? -32768 : quant;
    v.setInt16(o, clamped, true);
  }
  return buf;
}

/* ============================================================================
   STATE & CONTROLS
   ============================================================================ */
let targetSr = 44100;
let currentSamples = null, currentWav = null, currentSr = 44100, lastRawWav = null;
let currentVoiceLabel = '';
let currentMode = 'words', activeCategory = 'All', selectedItem = WORDS_CATALOG[0];
let engineOk = false, voices = [], presets = [], batchCancel = false;
let synthToken = 0;
let sliderDebounceTimer = null;
let activeUnsubscribers = [];

function setTargetSr(sr) {
  targetSr = sr;
  document.getElementById('btnSr44').classList.toggle('active', sr === 44100);
  document.getElementById('btnSr48').classList.toggle('active', sr === 48000);
  document.getElementById('specTag').innerText = (targetSr / 1000).toFixed(1) + 'kHz 16-Bit PCM Mono · ITU-R BS.1770';
  setStatus('Target sample rate set to ' + (sr / 1000).toFixed(1) + ' kHz (' + (sr === 48000 ? 'Unity / Unreal Studio' : 'Mobile Standard') + ')', '#06b6d4');
  if (selectedItem) {
    reRenderCurrent();
  }
}

function masterVolume() {
  const el = document.getElementById('sldVolume');
  return el ? Math.max(0, Math.min(1, parseFloat(el.value) / 100)) : 1;
}

function overrides() {
  return {
    drive: (parseInt(document.getElementById('sldGrit').value, 10) || 0) / 100,
    presence: (parseInt(document.getElementById('sldPresence').value, 10) || 0) / 100,
    body: (parseInt(document.getElementById('sldBody').value, 10) || 0) / 100,
    reverb: (parseInt(document.getElementById('sldReverb').value, 10) || 0) / 100,
    punch: (parseInt(document.getElementById('sldPunch').value, 10) || 0) / 100
  };
}
function pace() { return parseFloat(document.getElementById('sldPace').value) || 1; }
function stingerAmount() { return (parseInt(document.getElementById('sldStinger').value, 10) || 0) / 100; }
function currentPreset() { return document.getElementById('presetSelect').value || 'mobile_crisp'; }
function currentVoice() { return document.getElementById('voiceSelect').value || (voices[0] && voices[0].id) || 'Ryan'; }

function setStatus(text, color) {
  const el = document.getElementById('statusTag');
  el.innerText = text;
  el.style.color = color || '';
  if (color) setTimeout(() => { el.style.color = ''; }, 4500);
}

function setMetrics(m, engineLabel, dur) {
  document.getElementById('mEngine').innerText = engineLabel || '—';
  document.getElementById('mDur').innerText = dur != null ? dur.toFixed(2) + ' s' : '—';
  document.getElementById('mLufs').innerText = m && m.lufs != null ? m.lufs.toFixed(1) + ' LUFS' : '—';
  document.getElementById('mPeak').innerText = m && m.truePeakDb != null ? m.truePeakDb.toFixed(2) + ' dBTP' : '—';
  document.getElementById('mGain').innerText = m && m.limiterGainDb != null ? m.limiterGainDb.toFixed(1) + ' dB' : '0.0 dB';
}

function drawOscilloscope(samples, playheadProgress = -1) {
  const canvas = document.getElementById('waveCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width = Math.max(1, canvas.clientWidth) * (window.devicePixelRatio || 1);
  const h = canvas.height = Math.max(1, canvas.clientHeight) * (window.devicePixelRatio || 1);

  // Background
  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, w, h);

  // Center zero line
  ctx.strokeStyle = '#1a2234';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  if (!samples || !samples.length) return;

  const step = Math.max(1, Math.floor(samples.length / w));
  const mid = h / 2;

  // Waveform gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(0.5, '#3b82f6');
  grad.addColorStop(1, '#06b6d4');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    let min = 1.0, max = -1.0;
    for (let j = 0; j < step; j++) {
      const v = samples[x * step + j] || 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x, mid + min * mid * 0.88);
    ctx.lineTo(x, mid + max * mid * 0.88);
  }
  ctx.stroke();

  // Animated Playhead Line
  if (playheadProgress >= 0 && playheadProgress <= 1.0) {
    const playX = Math.round(playheadProgress * w);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, h);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function setResult(res, engineLabel) {
  currentSamples = new Float32Array(res.samples);
  currentSr = res.sampleRate || targetSr;
  currentWav = float32ToWav16(currentSamples, currentSr);
  drawOscilloscope(currentSamples, -1);
  setMetrics(res.metrics, engineLabel, res.duration);
  document.getElementById('specTag').innerText = (currentSr / 1000).toFixed(1) + 'kHz 16-Bit PCM Mono · ITU-R BS.1770';
}

/* ============================================================================
   SYNTHESIS LOGIC (Voices & SFX)
   ============================================================================ */
async function renderWord(item) {
  const token = ++synthToken;
  if (!window.desktop || !window.desktop.ttsSynthesize) {
    setStatus('Neural engine unavailable — use the desktop build', '#ef4444');
    return false;
  }
  const vid = currentVoice();
  const vname = (voices.find(v => v.id === vid) || {}).name || vid;
  currentVoiceLabel = vname;
  setStatus('Synthesizing "' + item.name + '" with ' + vname + '…', '#f59e0b');

  const res = await window.desktop.ttsSynthesize({
    text: item.name,
    voiceId: vid,
    presetId: currentPreset(),
    overrides: overrides(),
    pace: pace(),
    stingerKind: item.stinger,
    stingerAmount: stingerAmount(),
    targetSr: targetSr
  });

  if (token !== synthToken) return false;
  if (!res || !res.ok) {
    setStatus('TTS error: ' + ((res && res.error) || 'unknown'), '#ef4444');
    return false;
  }
  lastRawWav = res.rawWav || null;
  setResult(res, vname);
  setStatus('Voice: "' + item.name + '" · ' + vname + ' · ' + (res.metrics ? res.metrics.preset : '') + ' · ' + res.duration.toFixed(2) + 's', '#10b981');
  return true;
}

async function renderSfx(item) {
  const token = ++synthToken;
  if (!window.desktop || !window.desktop.sfxSynthesize) {
    setStatus('SFX engine unavailable', '#ef4444');
    return false;
  }
  setStatus('Modeling physical SFX "' + item.name + '"…', '#f59e0b');

  const res = await window.desktop.sfxSynthesize({
    item,
    driveAmt: overrides().drive * 0.6,
    reverbMix: overrides().reverb * 0.4,
    targetSr: targetSr
  });

  if (token !== synthToken) return false;
  if (!res || !res.ok) {
    setStatus('SFX error: ' + ((res && res.error) || 'unknown'), '#ef4444');
    return false;
  }
  setResult({ samples: res.samples, sampleRate: res.sampleRate, duration: res.duration, metrics: null }, res.label || 'Physical');

  let interpNote = '';
  if (res.interpretation && res.interpretation.confidence) {
    if (res.interpretation.confidence === 'high' || res.interpretation.confidence === 'medium') {
      interpNote = ' [Semantic: ' + res.interpretation.category + ' via "' + (res.interpretation.matchedKeyword || '') + '"]';
    } else {
      interpNote = ' [Fallback to Foley — prompt not matched]';
    }
  }

  setStatus('SFX: "' + item.name + '" · ' + item.cat + interpNote + ' · ' + res.duration.toFixed(2) + 's', '#10b981');
  return true;
}

async function renderCurrentAndPlay(item) {
  const target = item || selectedItem;
  if (!target) return;
  const ok = target.isWord ? await renderWord(target) : await renderSfx(target);
  if (!ok) return;
  if (selectedItem !== target) return;
  playBuffer();
}

function onMasterSliderInput() {
  updateLabels();
  if (sliderDebounceTimer) clearTimeout(sliderDebounceTimer);
  sliderDebounceTimer = setTimeout(() => {
    onMasterChange();
  }, 75);
}

async function onMasterChange() {
  if (!selectedItem) return;
  if (selectedItem.isWord && lastRawWav && window.desktop.ttsRemaster) {
    const token = ++synthToken;
    const res = await window.desktop.ttsRemaster({
      rawWav: lastRawWav,
      presetId: currentPreset(),
      overrides: overrides(),
      stingerKind: selectedItem.stinger,
      stingerAmount: stingerAmount(),
      targetSr: targetSr
    });
    if (token !== synthToken) return;
    if (res && res.ok) {
      currentVoiceLabel = (voices.find(v => v.id === currentVoice()) || {}).name || '';
      setResult(res, currentVoiceLabel);
    }
  } else if (!selectedItem.isWord) {
    renderSfx(selectedItem);
  }
}

function reRenderCurrent() {
  updateLabels();
  if (selectedItem) renderCurrentAndPlay();
}

function onVoiceChange() {
  const v = voices.find(x => x.id === currentVoice());
  document.getElementById('voiceHint').innerText = v ? v.desc + ' · ' + v.nativeRate + ' Hz native' : '';
  lastRawWav = null;
  renderCurrentAndPlay();
}

function updateLabels() {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
  set('lblPace', pace().toFixed(2) + 'x');
  set('lblGrit', document.getElementById('sldGrit').value + '%');
  set('lblPresence', document.getElementById('sldPresence').value + '%');
  set('lblBody', document.getElementById('sldBody').value + '%');
  set('lblReverb', document.getElementById('sldReverb').value + '%');
  set('lblPunch', document.getElementById('sldPunch').value + '%');
  set('lblStinger', document.getElementById('sldStinger').value + '%');
  set('lblVolume', document.getElementById('sldVolume').value + '%');
}

function triggerCustom() {
  const txt = document.getElementById('customInput').value.trim() || 'VICTORY';
  if (currentMode === 'words') {
    selectedItem = { id: 'custom_w', name: txt, cat: 'Custom Line', stinger: 'win', isWord: true };
    renderWord(selectedItem);
  } else {
    selectedItem = { id: 'custom_s', name: txt, cat: 'Custom SFX', dur: 0.8, isWord: false };
    renderCurrentAndPlay(selectedItem);
  }
}

async function downloadWav() {
  if (!currentWav) {
    setStatus('Nothing to export — synthesize first', '#ef4444');
    return;
  }
  const cleanName = (document.getElementById('customInput').value || (selectedItem && selectedItem.name) || 'sound')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') + '_' + Math.round(targetSr / 1000) + 'k.wav';

  if (window.desktop && window.desktop.saveWav) {
    const res = await window.desktop.saveWav(cleanName, currentWav);
    if (res && res.ok) {
      const hashShort = res.sha256 ? res.sha256.slice(0, 16) + '…' : '';
      setStatus('Exported: ' + Math.round(res.size / 1024) + ' KB · SHA-256: ' + hashShort + ' → ' + res.path, '#10b981');
      updateAuditBanner(res.sha256, res.path);
    } else if (res && res.error) {
      setStatus('Export failed: ' + res.error, '#ef4444');
    } else {
      setStatus('Export cancelled');
    }
  }
}

function updateAuditBanner(sha256, filePath) {
  let banner = document.getElementById('auditBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'auditBanner';
    banner.className = 'audit-banner';
    const mainPanel = document.getElementById('main');
    const controls = document.querySelector('.controls-section');
    if (mainPanel && controls) mainPanel.insertBefore(banner, controls);
  }
  if (banner && sha256) {
    banner.innerHTML =
      '<div class="audit-info">' +
        '<span>SHA-256 Fingerprint:</span>' +
        '<span class="audit-hash" id="auditHashVal" title="' + sha256 + '">' + sha256.slice(0, 32) + '…</span>' +
      '</div>' +
      '<button class="audit-copy-btn" id="btnCopyHash">📋 Copy Full SHA-256</button>';
    const copyBtn = document.getElementById('btnCopyHash');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(sha256);
        copyBtn.innerText = '✓ Copied';
        setTimeout(() => { copyBtn.innerText = '📋 Copy Full SHA-256'; }, 2000);
      };
    }
  }
}

/* ============================================================================
   BATCH EXPORT WITH REAL CANCELLATION
   ============================================================================ */
function sanitizeName(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

function setBatchUI(active) {
  document.getElementById('btnBatchCat').disabled = active;
  document.getElementById('btnBatchAll').disabled = active;
}

function cancelBatchExport() {
  batchCancel = true;
  if (window.desktop && window.desktop.cancelBatch) {
    window.desktop.cancelBatch();
  }
  setStatus('Cancelling export…', '#ef4444');
}

async function batchExport(scope) {
  if (!window.desktop || !window.desktop.chooseDir) {
    setStatus('Batch export requires the desktop application', '#ef4444');
    return;
  }
  const pick = await window.desktop.chooseDir();
  if (!pick || !pick.ok) return;
  const dir = pick.dir;

  setBatchUI(true);
  batchCancel = false;
  const prog = document.getElementById('batchProgress');
  let voiceWritten = 0, sfxOk = 0;

  const wantWords = scope === 'all' || currentMode === 'words';
  const wantSfx = scope === 'all' || currentMode === 'sfx';

  try {
    if (wantWords && window.desktop.ttsBatch && voices.length) {
      const list = WORDS_CATALOG.filter(i => scope === 'all' || activeCategory === 'All' || i.cat === activeCategory);
      const active = voices.filter(v => v.installed);
      for (const v of active) {
        if (batchCancel) break;
        const items = list.map(it => ({
          text: it.name,
          name: sanitizeName(it.name) + '__' + v.id + '_' + Math.round(targetSr / 1000) + 'k',
          sub: 'Voices/' + sanitizeName(it.cat) + '/' + v.id,
          stingerKind: it.stinger
        }));
        prog.innerText = v.id + ' 0/' + items.length + '…';
        if (window.desktop.onTtsProgress) {
          const unsub = window.desktop.onTtsProgress(p => {
            prog.innerText = v.id + ' ' + p.done + '/' + p.total + ' (' + p.ok + ' saved)';
          });
          if (typeof unsub === 'function') activeUnsubscribers.push(unsub);
        }
        const res = await window.desktop.ttsBatch({
          items,
          voiceId: v.id,
          presetId: currentPreset(),
          overrides: overrides(),
          pace: pace(),
          stingerAmount: stingerAmount(),
          targetSr: targetSr,
          outDir: dir
        });
        if (res && res.ok) voiceWritten += res.written;
        else if (res && res.error) setStatus('Voice export error: ' + res.error, '#ef4444');
      }
    }

    if (wantSfx && window.desktop.sfxBatch && !batchCancel) {
      const scopeArg = scope === 'all' ? 'all' : 'category';
      const catArg = activeCategory === 'All' ? null : activeCategory;
      const list = SFX_CATALOG.filter(i => scope === 'all' || activeCategory === 'All' || i.cat === activeCategory);
      prog.innerText = 'SFX 0/' + list.length + '…';
      if (window.desktop.onSfxProgress) {
        const unsub = window.desktop.onSfxProgress(p => {
          prog.innerText = 'SFX ' + p.done + '/' + p.total + ' (' + p.ok + ' saved)';
        });
        if (typeof unsub === 'function') activeUnsubscribers.push(unsub);
      }
      const res = await window.desktop.sfxBatch({
        scope: scopeArg,
        category: catArg,
        driveAmt: overrides().drive * 0.6,
        reverbMix: overrides().reverb * 0.4,
        targetSr: targetSr,
        outDir: dir
      });
      if (res && res.ok) sfxOk = res.written;
      else if (res && res.error) setStatus('SFX export error: ' + res.error, '#ef4444');
    }

    const total = voiceWritten + sfxOk;
    setStatus((batchCancel ? 'Export cancelled' : 'Mobile export complete') + ': ' + total + ' WAVs (' + (targetSr / 1000).toFixed(1) + ' kHz) → ' + dir, '#10b981');
    if (window.desktop.revealPath) window.desktop.revealPath(dir);
  } catch (err) {
    setStatus('Export error: ' + err.message, '#ef4444');
  } finally {
    setBatchUI(false);
    prog.innerText = '';
  }
}

/* ============================================================================
   HIGH-PERFORMANCE VIRTUAL SCROLLING (Displays 2,500+ Items with 60 FPS)
   ============================================================================ */
const ROW_HEIGHT = 54;
let filteredCatalog = [];

function switchMode(mode) {
  currentMode = mode;
  activeCategory = 'All';
  const pool = mode === 'words' ? WORDS_CATALOG : SFX_CATALOG;
  if (!selectedItem || selectedItem.isWord !== (mode === 'words') || !pool.length) {
    selectedItem = pool[0] || selectedItem;
    lastRawWav = null;
  }
  document.getElementById('tabWords').classList.toggle('active', mode === 'words');
  document.getElementById('tabSfx').classList.toggle('active', mode === 'sfx');
  document.getElementById('itemList').scrollTop = 0;
  renderChips();
  updateFilteredCatalog();
}

function renderChips() {
  const bar = document.getElementById('categoryChips');
  const dropdown = document.getElementById('categoryDropdown');
  const title = document.getElementById('categoryTitle');
  if (!bar) return;
  bar.innerHTML = '';
  if (dropdown) dropdown.innerHTML = '';

  const source = currentMode === 'words' ? WORDS_CATALOG : SFX_CATALOG;
  const cats = ['All'].concat(Array.from(new Set(source.map(i => i.cat))));

  if (title) {
    const totalCount = cats.length - 1;
    title.innerText = (currentMode === 'words' ? 'Genres (' : 'Categories (') + totalCount + ')';
  }

  cats.forEach(c => {
    const count = c === 'All' ? source.length : source.filter(i => i.cat === c).length;

    // 1. Create Chip
    const el = document.createElement('div');
    el.className = 'chip' + (c === activeCategory ? ' active' : '');
    el.innerText = c + (c === 'All' ? '' : ' (' + count + ')');
    el.onclick = () => {
      selectCategory(c);
    };
    bar.appendChild(el);

    // 2. Populate Dropdown
    if (dropdown) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.innerText = c + ' (' + count + ')';
      if (c === activeCategory) opt.selected = true;
      dropdown.appendChild(opt);
    }
  });

  setTimeout(() => {
    const activeEl = bar.querySelector('.chip.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 40);
}

function selectCategory(c) {
  activeCategory = c;
  document.getElementById('itemList').scrollTop = 0;
  const dropdown = document.getElementById('categoryDropdown');
  if (dropdown) dropdown.value = c;
  renderChips();
  updateFilteredCatalog();
}

function slideChips(delta) {
  const bar = document.getElementById('categoryChips');
  if (bar) {
    bar.scrollBy({ left: delta, behavior: 'smooth' });
  }
}

function onSearchInput() {
  document.getElementById('itemList').scrollTop = 0;
  updateFilteredCatalog();
}

function updateFilteredCatalog() {
  const q = document.getElementById('searchBox').value.toLowerCase().trim();
  const source = currentMode === 'words' ? WORDS_CATALOG : SFX_CATALOG;
  filteredCatalog = source.filter(item => {
    const matchCat = activeCategory === 'All' || item.cat === activeCategory;
    const matchQ = !q || item.name.toLowerCase().includes(q) || item.cat.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const scroller = document.getElementById('virtualScroller');
  scroller.style.height = (filteredCatalog.length * ROW_HEIGHT) + 'px';
  renderVirtualRows();

  document.getElementById('catalogCount').innerText =
    'Showing ' + filteredCatalog.length + ' of ' + source.length + ' (' + (currentMode === 'words' ? 'Voices' : 'SFX') + ') · Full Suite: 200 Voices + 2,500 SFX';
}

function onItemListScroll() {
  renderVirtualRows();
}

function renderVirtualRows() {
  const listEl = document.getElementById('itemList');
  const scroller = document.getElementById('virtualScroller');
  if (!listEl || !scroller) return;

  const scrollTop = listEl.scrollTop;
  const clientHeight = listEl.clientHeight;
  const total = filteredCatalog.length;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 3);
  const endIndex = Math.min(total, Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + 3);

  scroller.innerHTML = '';

  for (let idx = startIndex; idx < endIndex; idx++) {
    const item = filteredCatalog[idx];
    const row = document.createElement('div');
    row.className = 'sound-row' + (selectedItem && selectedItem.id === item.id ? ' active' : '');
    row.style.top = (idx * ROW_HEIGHT + 4) + 'px';

    row.innerHTML =
      '<div>' +
        '<div class="sound-title">' + item.name + '</div>' +
        '<div class="sound-sub">' + item.cat + '</div>' +
      '</div>' +
      '<span class="play-pill">▶ Play</span>';

    row.onclick = () => {
      selectedItem = item;
      document.getElementById('customInput').value = item.name;
      renderVirtualRows();
      renderCurrentAndPlay(item);
    };
    scroller.appendChild(row);
  }
}

function isEditableFocused() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/* ============================================================================
   EVENT DELEGATION & LIFECYCLE MANAGEMENT (CSP Compliant)
   ============================================================================ */
function bindUIEvents() {
  document.getElementById('tabWords').addEventListener('click', () => switchMode('words'));
  document.getElementById('tabSfx').addEventListener('click', () => switchMode('sfx'));

  document.getElementById('searchBox').addEventListener('input', onSearchInput);
  document.getElementById('categoryDropdown').addEventListener('change', e => selectCategory(e.target.value));

  document.querySelector('.chip-nav-prev').addEventListener('click', () => slideChips(-180));
  document.querySelector('.chip-nav-next').addEventListener('click', () => slideChips(180));

  document.getElementById('itemList').addEventListener('scroll', onItemListScroll);

  document.getElementById('customInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerCustom();
  });
  document.getElementById('btnSynth').addEventListener('click', triggerCustom);
  document.getElementById('btnPlay').addEventListener('click', playBuffer);
  document.getElementById('btnExport').addEventListener('click', downloadWav);

  document.getElementById('btnSr44').addEventListener('click', () => setTargetSr(44100));
  document.getElementById('btnSr48').addEventListener('click', () => setTargetSr(48000));
  document.getElementById('btnTestTone').addEventListener('click', playTestTone);
  document.getElementById('btnBatchCat').addEventListener('click', () => batchExport('category'));
  document.getElementById('btnBatchAll').addEventListener('click', () => batchExport('all'));

  document.getElementById('sldVolume').addEventListener('input', updateLabels);

  document.getElementById('voiceSelect').addEventListener('change', onVoiceChange);
  document.getElementById('presetSelect').addEventListener('change', reRenderCurrent);

  document.getElementById('sldPace').addEventListener('input', updateLabels);
  document.getElementById('sldPace').addEventListener('change', reRenderCurrent);

  const sliderIds = ['sldGrit', 'sldPresence', 'sldBody', 'sldReverb', 'sldPunch', 'sldStinger'];
  sliderIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', onMasterSliderInput);
  });
}

/* ============================================================================
   INITIALIZATION
   ============================================================================ */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    bindUIEvents();
    renderChips();
    updateFilteredCatalog();
    updateLabels();

    const chipsBar = document.getElementById('categoryChips');
    if (chipsBar) {
      chipsBar.addEventListener('wheel', e => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          chipsBar.scrollLeft += e.deltaY;
        }
      }, { passive: false });

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;
      chipsBar.addEventListener('mousedown', e => {
        isDown = true;
        chipsBar.classList.add('dragging');
        startX = e.pageX - chipsBar.offsetLeft;
        scrollLeft = chipsBar.scrollLeft;
      });
      window.addEventListener('mouseup', () => {
        if (isDown) {
          isDown = false;
          chipsBar.classList.remove('dragging');
        }
      });
      chipsBar.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - chipsBar.offsetLeft;
        const walk = (x - startX) * 1.6;
        chipsBar.scrollLeft = scrollLeft - walk;
      });
    }
  } catch (e) {
    setStatus('UI init error: ' + e.message, '#ef4444');
    return;
  }

  if (window.desktop) {
    try {
      SFX_CATALOG = (await window.desktop.sfxCatalog()) || [];
      SFX_CATEGORIES = Array.from(new Set(SFX_CATALOG.map(i => i.cat)));
      renderChips();
      updateFilteredCatalog();

      const st = await window.desktop.ttsStatus();
      engineOk = !!(st && st.available);
      const badge = document.getElementById('engineBadge');
      if (engineOk) {
        badge.innerText = 'Neural TTS Online';
        badge.classList.remove('off');
      } else {
        badge.innerText = 'Neural Engine Offline';
        badge.classList.add('off');
      }

      voices = (await window.desktop.ttsVoices()) || [];
      presets = (await window.desktop.ttsPresets()) || [];

      const vs = document.getElementById('voiceSelect');
      vs.innerHTML = '';
      voices.forEach(v => {
        const o = document.createElement('option');
        o.value = v.id;
        const statusLabel = v.installed ? '' : ' (' + (v.status || 'missing') + ')';
        o.innerText = v.name + statusLabel;
        if (!v.installed) o.disabled = true;
        vs.appendChild(o);
      });

      const ps = document.getElementById('presetSelect');
      ps.innerHTML = '';
      presets.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.innerText = p.label;
        ps.appendChild(o);
      });
      ps.value = 'arena';

      // Register menu handlers with cleanup management
      if (window.desktop.onMenuExportWav) {
        const unsub = window.desktop.onMenuExportWav(() => downloadWav());
        if (typeof unsub === 'function') activeUnsubscribers.push(unsub);
      }
      if (window.desktop.onMenuSynthesize) {
        const unsub = window.desktop.onMenuSynthesize(() => triggerCustom());
        if (typeof unsub === 'function') activeUnsubscribers.push(unsub);
      }
      if (window.desktop.onMenuPlay) {
        const unsub = window.desktop.onMenuPlay(() => playBuffer());
        if (typeof unsub === 'function') activeUnsubscribers.push(unsub);
      }

      if (voices.length) onVoiceChange();
      else if (selectedItem) renderCurrentAndPlay();
    } catch (e) {
      setStatus('Engine init failed: ' + e.message, '#ef4444');
    }
  } else {
    document.getElementById('engineBadge').innerText = 'Browser Mode';
  }

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !isEditableFocused()) {
      e.preventDefault();
      playBuffer();
    }
  });

  window.addEventListener('resize', () => {
    if (currentSamples) drawOscilloscope(currentSamples, -1);
    renderVirtualRows();
  });

  window.addEventListener('unload', () => {
    while (activeUnsubscribers.length) {
      const unsub = activeUnsubscribers.pop();
      try { unsub(); } catch (_) {}
    }
  });
});
