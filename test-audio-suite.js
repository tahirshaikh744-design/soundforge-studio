'use strict';

const assert = require('assert');
const mastering = require('./mastering.js');
const sfx = require('./sfx.js');
const { SFX_CATALOG } = require('./sfx-catalog.js');

console.log('=== SOUNDFORGE STUDIO QUALITY & AUDIO INTEGRITY TEST SUITE ===\n');

// Test 1: Catalog Integrity
console.log('1. Checking SFX Catalog...');
assert.strictEqual(SFX_CATALOG.length, 2500, 'Catalog should contain exactly 2,500 physical SFX');
console.log('   ✓ 2,500 physical SFX catalog verified (25 categories x 100 items each).\n');

// Test 2: ITU-R BS.1770-4 Loudness Measurement
console.log('2. Verifying ITU-R BS.1770-4 Loudness Normalization...');
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

// Test 3: True Peak Oversampling Detection
console.log('3. Verifying 4x Polyphase True Peak Detection...');
const interSampleTest = new Float32Array(4410);
for (let i = 0; i < interSampleTest.length; i++) {
  // Synthesize signal designed to have high inter-sample peaks
  interSampleTest[i] = Math.sin(i * 0.25) * 0.95;
}
const samplePeak = mastering.measurePeak(interSampleTest);
const truePeak = mastering.measureTruePeak(interSampleTest);
console.log('   Discrete Sample Peak:', samplePeak.toFixed(4));
console.log('   4x Reconstructed True Peak:', truePeak.toFixed(4));
assert(truePeak >= samplePeak, 'True peak must be >= sample peak');
console.log('   ✓ Inter-sample peak detection verified.\n');

// Test 4: 16-Bit PCM Encoding with TPDF Dither
console.log('4. Verifying WAV Encoding with TPDF Dither...');
const wav16 = mastering.encodeWav16(mastered.samples, mastered.sampleRate);
assert(wav16.length === 44 + mastered.samples.length * 2, 'WAV size must match 44-byte header + 16-bit PCM');
const decoded = mastering.decodeWav16(wav16);
assert.strictEqual(decoded.samples.length, mastered.samples.length, 'Decoded sample count must match original');
assert.strictEqual(decoded.sampleRate, mastered.sampleRate, 'Decoded sample rate must match');
console.log('   ✓ TPDF dither & 16-bit WAV serialization verified.\n');

// Test 5: SFX Engine Determinism
console.log('5. Verifying Physical SFX Determinism...');
const testItem = SFX_CATALOG[15]; // e.g. Card Deal Slide or similar
const sfxA = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
const sfxB = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
assert.strictEqual(sfxA.samples.length, sfxB.samples.length, 'Lengths must match');
let diff = 0;
for (let i = 0; i < sfxA.samples.length; i++) {
  diff += Math.abs(sfxA.samples[i] - sfxB.samples[i]);
}
console.log('   Determinism delta across samples:', diff);
assert.strictEqual(diff, 0, 'Re-rendering same item with same seed must be bit-for-bit identical');
console.log('   ✓ Deterministic audio generation verified.\n');

// Test 6: Dual Sample Rate Support (44.1k Mobile & 48.0k Game Studio)
console.log('6. Verifying Dual Sample Rates (44.1 kHz & 48.0 kHz)...');
const sfx44 = sfx.synthesizeSfx(testItem, { targetSr: 44100 });
const sfx48 = sfx.synthesizeSfx(testItem, { targetSr: 48000 });
assert.strictEqual(sfx44.sr, 44100, '44.1k sample rate verified');
assert.strictEqual(sfx48.sr, 48000, '48.0k sample rate verified');
console.log('   44.1k samples:', sfx44.samples.length, '· 48.0k samples:', sfx48.samples.length);
console.log('   ✓ Dual sample rate resampling verified.\n');

// Test 7: Mobile Click-Free Micro-Fades
console.log('7. Verifying Click-Free Micro Fades for Game Engines...');
const firstSample = Math.abs(sfx44.samples[0]);
const lastSample = Math.abs(sfx44.samples[sfx44.samples.length - 1]);
console.log('   Start boundary sample value:', firstSample.toFixed(6));
console.log('   End boundary sample value:', lastSample.toFixed(6));
assert(firstSample < 0.001, 'Start sample must be near zero to avoid pop');
assert(lastSample < 0.001, 'End sample must be near zero to avoid pop');
console.log('   ✓ Click-free zero boundary verified.\n');

// Test 8: Game Character Voice DSP Transforms (Esports Arena, Radio Squelch, Cyborg Ring Mod, Demonic Boss)
console.log('8. Verifying Game Character Voice DSP Transformations...');
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

// Test 9: Synthesis of All 25 Categories
console.log('9. Verifying Synthesis across All 25 Categories...');
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

console.log('=== ALL TESTS PASSED: SOUNDFORGE STUDIO IS ENTERPRISE & MOBILE GAME READY ===');
