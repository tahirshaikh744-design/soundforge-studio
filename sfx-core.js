'use strict';

/* ============================================================================
   SFX.JS — Per-item physical/acoustic synthesis bank for 1,500 game SFX.

   Every item is routed by NAME KEYWORD into a domain model bank (vehicle,
   weapon, blast, liquid, foley, magic, creature, impact, ambient, ui, chip).
   Durations are derived from the name + category, never a category constant.
   A deterministic per-item seed makes every one of the 1,500 items unique.
   ============================================================================ */

const SR = 44100;

/* ---------- deterministic PRNG (hash of name+variant) ---------- */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry(seed) {
  let a = (typeof seed === 'string' ? hash32(seed) : (seed || 0)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- DSP primitives ---------- */
function biquadCoeffs(type, sr, f0, Q, gainDb) {
  const A = Math.pow(10, (gainDb || 0) / 40);
  const w0 = 2 * Math.PI * Math.min(Math.max(f0, 10), sr * 0.48) / sr;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Math.max(0.05, Q));
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lowpass') {
    b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2;
    a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  } else if (type === 'peaking') {
    b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
    a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
  } else if (type === 'highshelf') {
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
    a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s;
  } else if (type === 'lowshelf') {
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
    a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s;
  } else { b0 = 1; b1 = b2 = a1 = a2 = 0; }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function biquad(data, c) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    data[i] = y;
  }
}
function lowpass(d, sr, f, q) { biquad(d, biquadCoeffs('lowpass', sr, f, q || 0.707, 0)); }
function highpass(d, sr, f, q) { biquad(d, biquadCoeffs('highpass', sr, f, q || 0.707, 0)); }
function peaking(d, sr, f, q, g) { biquad(d, biquadCoeffs('peaking', sr, f, q, g)); }

function noiseBuf(n, rnd, kind) {
  const out = new Float32Array(n);
  if (kind === 'brown') {
    let b = 0;
    for (let i = 0; i < n; i++) { const w = rnd() * 2 - 1; b = (b + 0.02 * w) / 1.02; out[i] = b * 3.5; }
  } else if (kind === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
  } else {
    for (let i = 0; i < n; i++) out[i] = rnd() * 2 - 1;
  }
  return out;
}
function noiseAt(seed, kind) { return noiseBuf(1, mulberry(seed), kind)[0]; }

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const db2lin = db => Math.pow(10, db / 20);
const lin2db = l => 20 * Math.log10(Math.max(1e-9, l));

/* ---------- envelopes ---------- */
function makeBuf(dur) { const n = Math.max(64, Math.floor(SR * dur)); return new Float32Array(n); }
function addAt(out, src, offset, gain) {
  const o = Math.max(0, Math.floor(offset * SR));
  for (let i = 0; i < src.length; i++) { const j = o + i; if (j < out.length) out[j] += src[i] * gain; }
}
function envDecay(n, tau, curve) {
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = Math.exp(-t / tau);
    if (curve === 'perc') v *= 1 - Math.exp(-t / 0.0015);
    if (curve === 'slow') v = Math.min(1, t / 0.01) * v;
    e[i] = v;
  }
  return e;
}

/* modal bank: real struck-bar / membrane / plate ratios.
   Each partial is only rendered for as long as its decay is audible
   (maxFrames), which keeps scattered-debris models cheap. */
function modal(out, cfg, gain) {
  const { f, tau, start } = cfg;
  const ratios = cfg.ratios;
  const amps = cfg.amps || ratios.map((r, i) => 1 / (1 + i * 1.1));
  const off = Math.floor((start || 0) * SR);
  if (off >= out.length) return;
  const g = gain === undefined ? 1 : gain;
  for (let m = 0; m < ratios.length; m++) {
    const fm = f * ratios[m];
    if (fm > SR * 0.45) continue;
    const w = 2 * Math.PI * fm / SR;
    const tauM = tau / (1 + m * 0.85);
    const ph = (hash32(cfg.seed + ':' + m) % 1000) / 1000 * Math.PI * 2;
    const avail = out.length - off;
    const maxFrames = Math.min(avail, Math.ceil(tauM * SR * 7));
    const a = amps[m] * g;
    for (let i = 0; i < maxFrames; i++) {
      const t = i / SR;
      out[off + i] += Math.sin(w * i + ph) * a * Math.exp(-t / tauM);
    }
  }
}

/* Minnaert bubble: f(t) = f0*sqrt(f0² + (k/r²)t) rising chirp, exponentially damped */
function bubble(out, f0, r0, amp, start, p, p_end) {
  const n = out.length - Math.floor(start * SR);
  if (n <= 0) return;
  let phase = 0;
  const st = start * SR | 0;
  const A = f0 * f0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const r2 = Math.max(1e-6, r0 * r0 * (1 - t / Math.max(1e-3, p || 0.1)));
    const fi = Math.sqrt(A + 8 * p * (p_end || p) / r2 * 2.2 * t);
    const inst = clamp(fi, 40, SR * 0.45);
    phase += inst / SR;
    out[st + i] += Math.sin(2 * Math.PI * phase) * amp * Math.exp(-t / 0.035);
  }
}

/* stick-slip friction excitation (tires, skids, creaks) */
function stickSlipExcite(n, seed, f0, modulationDepth, slipRate) {
  const rnd = mulberry(seed);
  const out = new Float32Array(n);
  const vib1 = 18 + rnd() * 25;
  const vib2 = 60 + rnd() * 40;
  const vphase1 = rnd() * 6.28, vphase2 = rnd() * 6.28;
  let p1 = 0, p2 = 0;
  const slip = slipRate || 0.02;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const flutter = 1 + modulationDepth * (Math.sin(2 * Math.PI * vib1 * t + vphase1) + 0.4 * Math.sin(2 * Math.PI * vib2 * t + vphase2));
    p1 += (f0 * flutter) / SR;
    p2 += (f0 * (1.488 + 0.3 * slip) * flutter) / SR;
    // Real non-linear hyperbolic tangent friction pulses instead of raw aliased sawtooth
    const s1 = Math.tanh(2.6 * Math.sin(2 * Math.PI * p1));
    const s2 = Math.tanh(1.8 * Math.sin(2 * Math.PI * p2)) * 0.45;
    const subH = Math.sin(Math.PI * p1) * 0.22;
    out[i] = (s1 * 0.65 + s2 * 0.35 + subH);
  }
  return out;
}

/* granular metal shimmer */
function metalShimmer(n, seed, center, bandwidth) {
  const rnd = mulberry(seed);
  const nz = noiseBuf(n, rnd, 'white');
  const tmp = Float32Array.from(nz);
  peaking(tmp, SR, center, 3.5, 9);
  peaking(tmp, SR, center * 1.51, 5, 6);
  const res = new Float32Array(n);
  const r = Math.exp(-Math.PI * (bandwidth || 900) / SR);
  const c = 2 * r * Math.cos(2 * Math.PI * center / SR);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const y = (1 - r) * tmp[i] + c * y1 - r * r * y2;
    y2 = y1; y1 = y; res[i] = y;
  }
  return res;
}

/* granular impacts scattered in time (hail, rattle, chatter, debris) */
function scatterImpacts(out, count, cfg, seed, spread) {
  const rnd = mulberry(seed);
  for (let k = 0; k < count; k++) {
    const t = (count === 1 ? 0 : rnd()) * (spread || 0.3);
    const f = cfg.f * (0.7 + rnd() * 0.7);
    const tau = cfg.tau * (0.7 + rnd() * 0.8);
    modal(out, { f, tau, ratios: cfg.ratios, amps: cfg.amps, seed: seed + ':' + k, start: t }, (cfg.gain || 1) * (0.6 + rnd() * 0.6));
  }
}

/* physics-based bouncing with restitution coefficient (dice, balls, shells, coins) */
function multiBounce(out, cfg) {
  const e = cfg.e || 0.65;
  const num = cfg.numBounces || 6;
  let t = cfg.start || 0;
  let interval = cfg.initInterval || 0.09;
  const rnd = mulberry(cfg.seed);
  for (let k = 0; k < num; k++) {
    const energy = Math.pow(e, k);
    if (energy < 0.012 || t >= out.length / SR) break;
    const f = cfg.f0 * (0.94 + rnd() * 0.12);
    const tau = cfg.tau * (0.7 + 0.3 * energy);
    modal(out, { f, tau, ratios: cfg.ratios, amps: cfg.amps, seed: cfg.seed + ':mb:' + k, start: t }, (cfg.gain || 1) * energy);
    t += interval * (0.85 + rnd() * 0.3);
    interval *= e;
  }
}

/* surface friction / granular scrape (cards, felt, stone, blades, sand, cloth) */
function granularScrape(out, cfg) {
  const dur = cfg.dur || 0.5;
  const rnd = mulberry(cfg.seed);
  const n = Math.min(out.length, Math.floor(dur * SR));
  const nz = noiseBuf(n, rnd, cfg.noiseKind || 'white');
  if (cfg.hp) highpass(nz, SR, cfg.hp, 0.7);
  if (cfg.lp) lowpass(nz, SR, cfg.lp, 0.7);
  if (cfg.peak) peaking(nz, SR, cfg.peak.f, cfg.peak.q || 2.5, cfg.peak.gain || 6);

  const startIdx = Math.floor((cfg.start || 0) * SR);
  const attack = Math.floor((cfg.attack || 0.02) * SR);
  const release = Math.floor((cfg.release || 0.05) * SR);

  for (let i = 0; i < n; i++) {
    let env = 1.0;
    if (i < attack) env = i / attack;
    else if (i > n - release) env = (n - i) / release;
    const flutter = 1.0 + (cfg.flutter || 0.2) * Math.sin(2 * Math.PI * (12 + rnd() * 16) * i / SR);
    const outIdx = startIdx + i;
    if (outIdx < out.length) {
      out[outIdx] += nz[i] * env * flutter * (cfg.gain || 0.8);
    }
  }
}

/* transient sub-thump + attack snap (punches, kicks, heavy doors, cannon bore) */
function transientPunch(out, cfg) {
  const dur = cfg.dur || 0.25;
  const fStart = cfg.fStart || 160;
  const fEnd = cfg.fEnd || 45;
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / dur;
    const f = fEnd + (fStart - fEnd) * Math.exp(-t * (cfg.dropRate || 14));
    phase += f / SR;
    const env = Math.exp(-t / (cfg.tau || 0.08));
    out[startIdx + i] += Math.sin(2 * Math.PI * phase) * env * (cfg.gain || 1.0);
  }
}

/* authentic 8-bit chiptune pulse wave with duty cycle and pitch sweep */
function chiptunePulse(out, cfg) {
  const dur = cfg.dur || 0.3;
  const f0 = cfg.f0 || 440;
  const sweep = cfg.sweep || 0;
  const duty = cfg.duty || 0.5;
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = Math.max(20, f0 * (1 + sweep * t));
    phase += f / SR;
    const env = Math.exp(-t / (cfg.tau || dur * 0.8));
    const pulse = (phase % 1.0) < duty ? 0.7 : -0.7;
    out[startIdx + i] += pulse * env * (cfg.gain || 0.6);
  }
}

/* authentic 8-bit LFSR noise for retro crunches and hits */
function chiptuneNoise(out, cfg) {
  const dur = cfg.dur || 0.2;
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));
  let shift = 0x7FFF;
  const isMetallic = !!cfg.metallic;
  const rate = cfg.rate || 16;
  let counter = 0;
  let curVal = 0;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    counter++;
    if (counter >= rate) {
      counter = 0;
      const feedback = (shift & 1) ^ ((shift >> (isMetallic ? 6 : 1)) & 1);
      shift = (shift >> 1) | (feedback << 14);
      curVal = (shift & 1) ? 0.6 : -0.6;
    }
    const env = Math.exp(-t / (cfg.tau || dur * 0.7));
    out[startIdx + i] += curVal * env * (cfg.gain || 0.7);
  }
}

/* multi-formant vocal tract resonator (monsters, dragons, beasts, groans) */
function vocalFormant(out, cfg) {
  const dur = cfg.dur || 1.2;
  const fBase = cfg.fBase || 55;
  const f1 = cfg.f1 || 350;
  const f2 = cfg.f2 || 850;
  const f3 = cfg.f3 || 2100;
  const flutterHz = cfg.flutterHz || 14;
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));

  const pulseBuf = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / dur;
    const flutter = 1.0 + (cfg.growlDepth || 0.4) * Math.sin(2 * Math.PI * flutterHz * t);
    const fCur = fBase * (1.1 - 0.3 * p) * flutter;
    phase += fCur / SR;
    const ph = phase % 1.0;
    pulseBuf[i] = ph < 0.25 ? Math.sin(Math.PI * ph / 0.25) : 0;
  }

  const b1 = Float32Array.from(pulseBuf);
  const b2 = Float32Array.from(pulseBuf);
  const b3 = Float32Array.from(pulseBuf);
  peaking(b1, SR, f1, 3.5, 14);
  peaking(b2, SR, f2, 4.0, 12);
  peaking(b3, SR, f3, 4.5, 10);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1.0, t / (cfg.attack || 0.08)) * (t > dur - 0.25 ? (dur - t) / 0.25 : 1.0);
    out[startIdx + i] += (b1[i] * 0.5 + b2[i] * 0.35 + b3[i] * 0.2) * env * (cfg.gain || 1.0);
  }
}

/* 2-operator FM synthesis (sci-fi, lasers, cyber, metallic bells) */
function fmSynth(out, cfg) {
  const dur = cfg.dur || 0.6;
  const fCarrier = cfg.fCarrier || 440;
  const fMod = cfg.fMod || 220;
  const modIndex = cfg.modIndex || 3.0;
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));

  let cPhase = 0, mPhase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / dur;
    const sweep = cfg.sweep ? Math.exp(-t * cfg.sweep) : 1.0;
    const curFc = fCarrier * sweep;
    const curFm = fMod * sweep;
    const curMod = modIndex * Math.exp(-t / (cfg.modTau || dur * 0.5));
    mPhase += curFm / SR;
    const modSig = Math.sin(2 * Math.PI * mPhase) * curMod;
    cPhase += (curFc + modSig * curFc) / SR;
    const env = Math.exp(-t / (cfg.tau || dur * 0.6));
    out[startIdx + i] += Math.sin(2 * Math.PI * cPhase) * env * (cfg.gain || 0.7);
  }
}

/* musical chord & fanfare synthesizer (triumphs, rewards, casino jackpots) */
function musicalChord(out, cfg) {
  const dur = cfg.dur || 1.2;
  const root = cfg.root || 261.63; // C4
  const intervals = cfg.intervals || [1.0, 1.25, 1.5, 2.0]; // Major chord
  const startIdx = Math.floor((cfg.start || 0) * SR);
  const n = Math.min(out.length - startIdx, Math.floor(dur * SR));

  for (let k = 0; k < intervals.length; k++) {
    const freq = root * intervals[k];
    const delay = cfg.isArp ? k * (cfg.arpDelay || 0.08) : 0;
    const delaySamples = Math.floor(delay * SR);
    const voiceLen = n - delaySamples;
    if (voiceLen <= 0) continue;

    for (let i = 0; i < voiceLen; i++) {
      const t = i / SR;
      const env = Math.min(1.0, t / (cfg.attack || 0.03)) * Math.exp(-t / (cfg.tau || dur * 0.6));
      let wave = Math.sin(2 * Math.PI * freq * t);
      if (cfg.isBrass) {
        wave = wave * 0.6 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 + Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
      }
      out[startIdx + delaySamples + i] += wave * env * (0.8 / intervals.length) * (cfg.gain || 1.0);
    }
  }
}

module.exports = {
  SR,
  hash32,
  mulberry,
  biquadCoeffs,
  biquad,
  lowpass,
  highpass,
  peaking,
  noiseBuf,
  noiseAt,
  clamp,
  db2lin,
  lin2db,
  makeBuf,
  addAt,
  envDecay,
  modal,
  bubble,
  stickSlipExcite,
  metalShimmer,
  scatterImpacts,
  multiBounce,
  granularScrape,
  transientPunch,
  chiptunePulse,
  chiptuneNoise,
  vocalFormant,
  fmSynth,
  musicalChord
};