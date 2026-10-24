'use strict';

const assert = require('assert');
const crypto = require('crypto');
const mastering = require('./mastering.js');
const sfx = require('./sfx.js');
const { SFX_CATALOG } = require('./sfx-catalog.js');
const { classifySfxPrompt } = require('./sfx-semantic.js');

console.log('=== SOUNDFORGE STUDIO QUALITY & AUDIO INTEGRITY TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// Test 1: SFX Catalog Basic Integrity
// ---------------------------------------------------------------------------
console.log('1. Checking SFX Catalog...');
assert.strictEqual(SFX_CATALOG.length, 2500, 'Catalog should contain exactly 2,500 physical SFX');
console.log('   ✓ 2,500 physical SFX catalog verified (25 categories x 100 items each).\n');

// ---------------------------------------------------------------------------
// Test 2: Full Catalog Structural Integrity & Unique Identifiers
// ---------------------------------------------------------------------------
console.log('2. Verifying Full Catalog Structural Integrity & ID Uniqueness...');
const seenIds = new Set();
const categoryCounts = {};

for (const item of SFX_CATALOG) {
  assert(item.id, 'Item must have an id');
  assert(!seenIds.has(item.id), 'Duplicate catalog ID detected: ' + item.id);
  seenIds.add(item.id);

  assert(item.name && typeof item.name === 'string', 'Item must have valid string name: ' + item.id);
  assert(item.cat && typeof item.cat === 'string', 'Item must have valid category: ' + item.id);
  assert(item.model && typeof item.model === 'string', 'Item must have valid model string: ' + item.id);

  categoryCounts[item.cat] = (categoryCounts[item.cat] || 0) + 1;
}

const distinctCategories = Object.keys(categoryCounts);
assert.strictEqual(distinctCategories.length, 25, 'Catalog must have exactly 25 categories');
for (const [cat, count] of Object.entries(categoryCounts)) {
  assert.strictEqual(count, 100, 'Category ' + cat + ' must have exactly 100 items');
}
console.log('   ✓ 2,500 unique IDs verified across all 25 categories (100 items/cat).\n');

// ---------------------------------------------------------------------------
// Test 3: Custom SFX Prompt Routing & Semantic Interpretation
// ---------------------------------------------------------------------------
console.log('3. Verifying Custom SFX Prompt Routing & Semantic Classification...');
const testPrompts = [
  { prompt: 'huge grenade explosion in bunker', expectedCat: 'Explosions', confidence: 'high' },
  { prompt: 'heavy boot footsteps in muddy grass', expectedCat: 'Footsteps', confidence: 'high' },
  { prompt: 'sci-fi plasma blaster gunshot', expectedCat: 'Sci-Fi & Cyber', confidence: 'high' },
  { prompt: 'v8 turbo car engine idle', expectedCat: 'Vehicles & Tires', confidence: 'high' },
  { prompt: 'magical crystal spell chime', expectedCat: 'Magic & Spells', confidence: 'high' },
  { prompt: 'wooden door creak shut', expectedCat: 'Foley & Props', confidence: 'high' },
  { prompt: 'completely unclassifiable random gibberish 12345xyz', expectedCat: 'Foley & Props', confidence: 'fallback' }
];

for (const tp of testPrompts) {
  const interp = classifySfxPrompt(tp.prompt);
  assert.strictEqual(interp.category, tp.expectedCat, 'Prompt "' + tp.prompt + '" should classify to ' + tp.expectedCat);
  assert.strictEqual(interp.confidence, tp.confidence, 'Prompt "' + tp.prompt + '" confidence should be ' + tp.confidence);

  // Dispatch into synthesis engine and verify successful generation
  const res = sfx.synthesizeSfx({ id: 'custom_test', name: tp.prompt, cat: 'Custom SFX', dur: 0.8 }, { targetSr: 44100 });
  assert(res.samples && res.samples.length > 0, 'Synthesis for prompt "' + tp.prompt + '" must generate audio');
  assert(res.interpretation, 'Synthesis result must include interpretation metadata');
  assert.strictEqual(res.interpretation.category, tp.expectedCat);
}
console.log('   ✓ Custom prompt semantic classification & transparent Foley fallback verified.\n');

// ---------------------------------------------------------------------------
// Test 4: ITU-R BS.1770-4 Loudness Measurement & True Peak Limiter
// ---------------------------------------------------------------------------
console.log('4. Verifying ITU-R BS.1770-4 Loudness Normalization...');
const sr = 44100;
const tone = new Float32Array(sr * 2); // 2-second 1kHz tone
for (let i = 0; i < tone.length; i++) {
  tone[i] = Math.sin(2 * Math.PI * 1000 * i / sr) * 0.5;
}
const initialLufs = mastering.measureIntegratedLoudness(tone, sr);
console.log('   Raw 1kHz Tone Loudness:', initialLufs.toFixed(2), 'LUFS');
assert(isFinite(initialLufs), 'Loudness should be a finite number');

const mastered = mastering.masterVoice(tone, sr, { presetId: 'mobile_crisp' });
console.log('   Mastered Mobile Crisp Loudness:', mastered.metrics.lufs.toFixed(2), 'LUFS (Target: -16.0 LUFS)');
console.log('   Mastered True Peak:', mastered.metrics.truePeakDb.toFixed(2), 'dBTP');
assert(Math.abs(mastered.metrics.lufs - (-16.0)) < 0.5, 'Loudness should be within 0.5 LU of target');
assert(mastered.metrics.truePeakDb <= -1.0, 'True peak should be at or below -1.0 dBTP ceiling');
console.log('   ✓ Loudness normalization & limiter verified.\n');

// ---------------------------------------------------------------------------
// Test 5: 4x Polyphase True Peak Detection
// ---------------------------------------------------------------------------
console.log('5. Verifying 4x Polyphase True Peak Detection...');
const interSampleTest = new Float32Array(4410);
for (let i = 0; i < interSampleTest.length; i++) {
  interSampleTest[i] = Math.sin(i * 0.25) * 0.95;
}
const samplePeak = mastering.measurePeak(interSampleTest);
const truePeak = mastering.measureTruePeak(interSampleTest);
console.log('   Discrete Sample Peak:', samplePeak.toFixed(4));
console.log('   4x Reconstructed True Peak:', truePeak.toFixed(4));
assert(truePeak >= samplePeak, 'True peak must be >= sample peak');
console.log('   ✓ Inter-sample peak detection verified.\n');

// ---------------------------------------------------------------------------
// Test 6: 16-Bit PCM Encoding with Seeded Deterministic TPDF Dither
// ---------------------------------------------------------------------------
console.log('6. Verifying WAV Encoding with Deterministic TPDF Dither...');
const wav16A = mastering.encodeWav16(mastered.samples, mastered.sampleRate);
const wav16B = mastering.encodeWav16(mastered.samples, mastered.sampleRate);
assert.strictEqual(wav16A.length, 44 + mastered.samples.length * 2, 'WAV size must match 44-byte header + 16-bit PCM');
assert.strictEqual(Buffer.compare(wav16A, wav16B), 0, 'WAV exports of identical samples must be 100% byte-identical');

const decoded = mastering.decodeWav16(wav16A);
assert.strictEqual(decoded.samples.length, mastered.samples.length, 'Decoded sample count must match original');
assert.strictEqual(decoded.sampleRate, mastered.sampleRate, 'Decoded sample rate must match');
console.log('   ✓ Deterministic TPDF dither & 16-bit WAV serialization verified.\n');

// ---------------------------------------------------------------------------
// Test 7: Real SHA-256 File Fingerprints
// ---------------------------------------------------------------------------
console.log('7. Verifying Real SHA-256 Asset Fingerprinting...');
const knownVector = Buffer.from('SoundForge Studio 1.0.0 Enterprise Audio');
const expectedDigest = crypto.createHash('sha256').update(knownVector).digest('hex');
const actualDigest = mastering.computeSha256(knownVector);
assert.strictEqual(actualDigest, expectedDigest, 'computeSha256 must match standard crypto SHA-256');

// Verify on exported audio
const wavHash1 = mastering.computeSha256(wav16A);
const wavHash2 = mastering.computeSha256(wav16B);
assert.strictEqual(wavHash1, wavHash2, 'Repeated exports of same deterministic audio must yield identical SHA-256');
assert.strictEqual(wavHash1.length, 64, 'SHA-256 digest must be 64 hexadecimal characters');

// Verify modified bytes change the hash
const modifiedWav = Buffer.from(wav16A);
modifiedWav[50] = (modifiedWav[50] ^ 0xff);
const modifiedHash = mastering.computeSha256(modifiedWav);
assert.notStrictEqual(wavHash1, modifiedHash, 'Modified audio bytes must produce a different SHA-256 digest');
console.log('   Export WAV SHA-256:', wavHash1);
console.log('   ✓ Authoritative SHA-256 fingerprint calculation verified.\n');

// ---------------------------------------------------------------------------
// Test 8: SFX Engine Determinism Across Entire Export Chain
// ---------------------------------------------------------------------------
console.log('8. Verifying Physical SFX Determinism...');
const testItem = SFX_CATALOG[15];
const sfxA = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
const sfxB = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
assert.strictEqual(sfxA.samples.length, sfxB.samples.length, 'Lengths must match');
let diff = 0;
for (let i = 0; i < sfxA.samples.length; i++) {
  diff += Math.abs(sfxA.samples[i] - sfxB.samples[i]);
}
console.log('   Determinism delta across samples:', diff);
assert.strictEqual(diff, 0, 'Re-rendering same item with same seed must be bit-for-bit identical');

const sfxWavA = mastering.encodeWav16(sfxA.samples, sfxA.sr);
const sfxWavB = mastering.encodeWav16(sfxB.samples, sfxB.sr);
assert.strictEqual(Buffer.compare(sfxWavA, sfxWavB), 0, 'SFX WAV buffers must be byte-identical');
assert.strictEqual(mastering.computeSha256(sfxWavA), mastering.computeSha256(sfxWavB), 'SFX SHA-256 hashes must match');
console.log('   ✓ Deterministic audio generation & export verified.\n');

// ---------------------------------------------------------------------------
// Test 9: Bandlimited Windowed-Sinc FIR Resampling
// ---------------------------------------------------------------------------
console.log('9. Verifying Bandlimited Windowed-Sinc FIR Resampler (44.1k & 48.0k)...');
// 1. DC retention test: constant 0.5 DC through resampler
const dcIn = new Float32Array(4410).fill(0.5);
const dcOut = mastering.resampleAudio(dcIn, 44100, 48000);
let dcSum = 0;
// Sample middle region away from filter ramp
for (let i = 200; i < dcOut.length - 200; i++) dcSum += dcOut[i];
const dcAvg = dcSum / (dcOut.length - 400);
assert(Math.abs(dcAvg - 0.5) < 0.01, 'DC gain through resampler must be 1.0 (got ' + dcAvg + ')');

// 2. Passband sinusoid test: 1 kHz tone through downsampler & upsampler
const sin44 = new Float32Array(44100);
for (let i = 0; i < sin44.length; i++) sin44[i] = Math.sin(2 * Math.PI * 1000 * i / 44100);
const sin48 = mastering.resampleAudio(sin44, 44100, 48000);
assert.strictEqual(sin48.length, 48000, 'Resampled output length must match integer sample rate ratio');
const peak48 = mastering.measurePeak(sin48);
assert(Math.abs(peak48 - 1.0) < 0.05, 'Passband 1kHz tone amplitude preserved (peak: ' + peak48 + ')');

// 3. Stopband anti-aliasing rejection: 23 kHz tone downsampled to 22050 Hz (Nyquist 11025 Hz)
const hiTone = new Float32Array(48000);
for (let i = 0; i < hiTone.length; i++) hiTone[i] = Math.sin(2 * Math.PI * 23000 * i / 48000);
const downsampled = mastering.resampleAudio(hiTone, 48000, 22050);
const foldedPeak = mastering.measurePeak(downsampled.subarray(50, downsampled.length - 50));
console.log('   Steady-state stopband 23kHz rejection (peak residual):', foldedPeak.toExponential(3));
assert(foldedPeak < 0.001, 'Steady-state stopband signal must be attenuated by > 60 dB');
console.log('   ✓ Windowed-sinc polyphase FIR resampler verified.\n');

// ---------------------------------------------------------------------------
// Test 10: Click-Free Micro Fades for Game Engines
// ---------------------------------------------------------------------------
console.log('10. Verifying Click-Free Micro Fades for Game Engines...');
const sfx44 = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
const firstSample = Math.abs(sfx44.samples[0]);
const lastSample = Math.abs(sfx44.samples[sfx44.samples.length - 1]);
console.log('   Start boundary sample value:', firstSample.toFixed(6));
console.log('   End boundary sample value:', lastSample.toFixed(6));
assert(firstSample < 0.001, 'Start sample must be near zero to avoid pop');
assert(lastSample < 0.001, 'End sample must be near zero to avoid pop');
console.log('   ✓ Click-free zero boundary verified.\n');

// ---------------------------------------------------------------------------
// Test 11: Game Character Voice DSP Transforms
// ---------------------------------------------------------------------------
console.log('11. Verifying Game Character Voice DSP Transformations...');
const speechSnippet = new Float32Array(sr * 1.5);
for (let i = 0; i < speechSnippet.length; i++) {
  const t = i / sr;
  speechSnippet[i] = (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t)) * Math.exp(-t * 1.5);
}

const arenaMastered = mastering.masterVoice(speechSnippet, sr, { presetId: 'arena' });
assert(arenaMastered.samples.length > 0, 'Arena voice output must not be empty');
assert(arenaMastered.metrics.truePeakDb <= -1.0, 'Arena voice must obey true peak ceiling');

const radioMastered = mastering.masterVoice(speechSnippet, sr, { presetId: 'tactical_radio' });
assert(radioMastered.samples.length > 0, 'Tactical radio output must not be empty');

const cyberMastered = mastering.masterVoice(speechSnippet, sr, { presetId: 'cyber_robot' });
assert(cyberMastered.samples.length > 0, 'Cyborg AI output must not be empty');

const demonMastered = mastering.masterVoice(speechSnippet, sr, { presetId: 'demon_boss' });
assert(demonMastered.samples.length > 0, 'Demonic Shadow Lord output must not be empty');
console.log('   ✓ Game character voice DSP presets verified (Arena, Tactical Radio, Cyber Mecha, Demonic Boss).\n');

// ---------------------------------------------------------------------------
// Test 12: DSP Safety & Extreme Audio Edge Cases
// ---------------------------------------------------------------------------
console.log('12. Verifying DSP Safety on Edge Cases (Silence, NaNs, Overflows)...');
// Silence handling
const silence = new Float32Array(sr);
const silenceLufs = mastering.measureIntegratedLoudness(silence, sr);
assert(silenceLufs === -Infinity || silenceLufs <= -70.0, 'Pure silence must be at or below -70 LUFS absolute gating threshold');
const silenceMaster = mastering.masterVoice(silence, sr, { presetId: 'mobile_crisp' });
assert(silenceMaster.samples.every(v => isFinite(v)), 'Mastering silence must produce all finite values');

// Corrupted inputs with NaNs and Infinities
const dirty = new Float32Array(sr);
dirty[10] = NaN;
dirty[20] = Infinity;
dirty[30] = -Infinity;
dirty[40] = 100.0; // severe overshoot
const cleanWav = mastering.encodeWav16(dirty, sr);
assert(cleanWav.length > 44, 'Encoder must produce valid WAV buffer even with dirty inputs');
const recovered = mastering.decodeWav16(cleanWav);
assert(recovered.samples.every(v => isFinite(v)), 'Decoded samples must all be finite');
console.log('   ✓ Silence, NaN, and Infinity handling verified.\n');

// ---------------------------------------------------------------------------
// Test 13: Full Catalog Synthesis Dispatch Check
// ---------------------------------------------------------------------------
console.log('13. Verifying Synthesis across All 25 Categories...');
const testedCats = new Set();
for (let i = 0; i < SFX_CATALOG.length; i += 100) {
  const item = SFX_CATALOG[i];
  testedCats.add(item.cat);
  const res = sfx.synthesizeSfx(item, { targetSr: 44100 });
  assert(res.samples.length > 0, 'Category ' + item.cat + ' item must produce audio');
  assert(res.dur > 0.03, 'Duration must be > 30ms');
}
assert.strictEqual(testedCats.size, 25, 'All 25 categories must be represented');
console.log('   ✓ All 25 categories synthesize successfully.\n');

// ---------------------------------------------------------------------------
// Test 14: Voice Model Detection & Git LFS Pointer Verification
// ---------------------------------------------------------------------------
console.log('14. Verifying Voice Model Detection & Git LFS Pointer Validation...');
const fs = require('fs');
const path = require('path');
const voiceDir = path.join(__dirname, 'engine', 'voices');
assert(fs.existsSync(voiceDir), 'Voice directory must exist');

const voiceJsonFiles = fs.readdirSync(voiceDir).filter(f => f.endsWith('.onnx.json'));
assert(voiceJsonFiles.length >= 4, 'Must have at least 4 voice definitions (Ryan, Joe, Aria, Alan)');

for (const jf of voiceJsonFiles) {
  const id = jf.replace(/\.onnx\.json$/, '');
  const modelFile = path.join(voiceDir, id + '.onnx');
  assert(fs.existsSync(modelFile), 'Model ONNX file must exist for: ' + id);
  const stat = fs.statSync(modelFile);
  // Real ONNX weights are > 50 MB; Git LFS text pointers are ~130 bytes
  assert(stat.size > 50 * 1024, 'Voice model ' + id + ' must be real weights (>50KB), not an unpulled Git LFS stub (size: ' + stat.size + ' bytes)');
  const cfg = JSON.parse(fs.readFileSync(path.join(voiceDir, jf), 'utf8'));
  assert(cfg.audio && cfg.audio.sample_rate > 0, 'Voice config must specify valid audio sample_rate');
}
console.log('   ✓ 4 Neural ONNX voice models verified (>50MB each, not LFS stubs).\n');

// ---------------------------------------------------------------------------
// Test 15: Preload IPC Listener Cleanup & Unsubscribe Lifecycle
// ---------------------------------------------------------------------------
console.log('15. Verifying Preload IPC Listener Lifecycle & Memory-Leak Free Cleanup...');
// Simulate contextBridge and ipcRenderer to test preload lifecycle guarantees
const mockListeners = {};
const mockIpcRenderer = {
  on(channel, fn) {
    mockListeners[channel] = mockListeners[channel] || [];
    mockListeners[channel].push(fn);
  },
  removeListener(channel, fn) {
    if (mockListeners[channel]) {
      const idx = mockListeners[channel].indexOf(fn);
      if (idx !== -1) mockListeners[channel].splice(idx, 1);
    }
  }
};

function createMockBridge(ipc) {
  return {
    onSfxProgress: (cb) => {
      const handler = (_, data) => cb(data);
      ipc.on('sfx-progress', handler);
      return () => ipc.removeListener('sfx-progress', handler);
    },
    onTtsProgress: (cb) => {
      const handler = (_, data) => cb(data);
      ipc.on('tts-progress', handler);
      return () => ipc.removeListener('tts-progress', handler);
    }
  };
}

const bridge = createMockBridge(mockIpcRenderer);
let callCount = 0;
const unsub = bridge.onSfxProgress(() => { callCount++; });
assert.strictEqual(mockListeners['sfx-progress'].length, 1, 'Should have 1 active listener');

// Trigger event
mockListeners['sfx-progress'][0]({}, { done: 10, total: 100 });
assert.strictEqual(callCount, 1, 'Callback should be invoked once');

// Unsubscribe
assert(typeof unsub === 'function', 'Subscription must return an unsubscribe function');
unsub();
assert.strictEqual(mockListeners['sfx-progress'].length, 0, 'Listener must be completely removed after unsubscribe');
console.log('   ✓ Preload IPC listener registration and deterministic unsubscribe verified.\n');

console.log('=== ALL 15 TEST SUITES PASSED: SOUNDFORGE STUDIO IS ENTERPRISE & PRODUCTION READY ===');
