'use strict';

/* ============================================================================
   SFX-DOMAIN.JS — Keyword-routed acoustic models. Each renderer returns
   { dur, render(out, ctx) }. Durations come from the physical effect, so
   "tire screech" sustains, "UI click" is 40ms, "explosion" tails for seconds.
   ============================================================================ */

const C = require('./sfx-core.js');
const { SR, mulberry, lowpass, highpass, peaking, noiseBuf, makeBuf, modal, bubble, stickSlipExcite, metalShimmer, scatterImpacts, clamp, db2lin } = C;

/* ======================= VEHICLE / TIRE ======================= */
const vehicle = [
  /* --- slick tire screech: stick-slip, band-passed, sustained --- */
  { kw: ['screech'], dur: 3.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'vs');
      const exc = stickSlipExcite(out.length, ctx.seed, 900 + rnd() * 300, 0.28, 0.08);
      const band = new Float32Array(out.length);
      for (let i = 0; i < out.length; i++) band[i] = exc[i] * (0.6 + 0.4 * Math.sin(2 * Math.PI * (7 + rnd() * 5) * i / SR));
      const center = 1500 + rnd() * 900;
      lowpass(band, SR, center * 1.9, 1.1);
      highpass(band, SR, 700, 0.7);
      peaking(band, SR, center, 2.2, 8);
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'grit'), 'white');
      lowpass(nz, SR, 5200, 0.7);
      const attack = 0.05, rel = 0.25;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let e = Math.min(1, t / attack) * (1 - Math.pow(clamp(t / ctx.dur, 0, 1), 2.2));
        e *= (0.75 + 0.25 * Math.sin(2 * Math.PI * 5.5 * t + rnd() * 6));
        out[i] += (band[i] * 1.0 + nz[i] * 0.35) * e;
      }
      void rel;
  }},
  /* --- ABS / brake skid: pulsing squeal + rumble --- */
  { kw: ['skid', 'abs'], dur: 2.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sk');
      const exc = stickSlipExcite(out.length, ctx.seed, 1400 + rnd() * 400, 0.16, 0.05);
      lowpass(exc, SR, 3600, 1.0); highpass(exc, SR, 900, 0.8);
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'brown');
      lowpass(nz, SR, 900, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const pulse = 0.6 + 0.4 * Math.sin(2 * Math.PI * 8 * t);
        const e = Math.min(1, t / 0.04) * Math.pow(1 - t / ctx.dur, 1.6);
        out[i] += (exc[i] * 0.7 * pulse + nz[i] * 0.8) * e;
      }
  }},
  /* --- burnout / peel: rumble + rising screech --- */
  { kw: ['burnout', 'peel'], dur: 2.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'bo');
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'brown');
      lowpass(nz, SR, 1400, 0.7);
      const exc = stickSlipExcite(out.length, ctx.seed, 700 + rnd() * 200, 0.3, 0.1);
      highpass(exc, SR, 800, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.12) * Math.pow(1 - t / ctx.dur, 1.4);
        const roar = 0.5 + 0.5 * Math.sin(2 * Math.PI * (6 + t * 2) * t);
        out[i] += (nz[i] * 1.1 * roar + exc[i] * 0.8) * e;
      }
  }},
  /* --- engine rev: firing-order pulse train, harmonic-rich --- */
  { kw: ['engine', 'rev', 'throttle', 'v8', 'motorcycle', 'high rev'], dur: 2.5, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'en');
      const base = 40 + rnd() * 40;                    // idle->rev fundamental
      const cyl = ctx.name.toLowerCase().includes('v8') ? 4 : ctx.name.toLowerCase().includes('motorcycle') ? 1 : 3;
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      const lp = new Float32Array(out.length);
      for (let i = 0; i < out.length; i++) { lp[i] = nz[i]; }
      lowpass(lp, SR, 3000, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const rev = Math.pow(t / ctx.dur, 0.7);
        const f = base * (1 + 3.2 * rev);
        const fire = f * cyl;
        const ph = (t * fire) % 1;
        const pulse = Math.exp(-ph * 9) * (Math.random ? 1 : 1); // deterministic below
        const g = 0.7 + 0.3 * Math.sin(2 * Math.PI * (2 + t) * t);
        let v = pulse * g;
        v += 0.4 * Math.sin(2 * Math.PI * fire * t) * 0.5;
        v += lp[i] * 0.5 * (0.3 + rev);
        const e = Math.min(1, t / 0.15) * (t > ctx.dur - 0.3 ? (ctx.dur - t) / 0.3 : 1);
        out[i] += v * e;
      }
  }},
  /* --- horn: stacked detuned brass --- */
  { kw: ['horn', 'herald'], dur: 1.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'hn');
      const base = 400 + rnd() * 80;
      const partials = [1, 1.005, 1.5, 2.0, 2.505, 3.0];
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        let v = 0;
        for (let k = 0; k < partials.length; k++) v += Math.sin(2 * Math.PI * base * partials[k] * t) * (1 / (1 + k * 0.8));
        const e = Math.min(1, t / 0.03) * (t > ctx.dur - 0.15 ? (ctx.dur - t) / 0.15 : 1) * (t > ctx.dur / 2 ? (ctx.dur - t) / (ctx.dur / 2) : 1);
        out[i] += v * e * 0.4;
      }
  }},
  /* --- air brake / hiss / valve --- */
  { kw: ['air brake', 'blow-off', 'valve', 'hiss', 'exhale'], dur: 1.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'ab'), 'white');
      highpass(nz, SR, 1800, 0.7);
      peaking(nz, SR, 4200, 1.5, 5);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.01) * Math.exp(-t * 4.5);
        out[i] += nz[i] * e;
      }
  }},
  /* --- generic whoosh / passby --- */
  { kw: ['passby', 'whoosh'], dur: 1.2, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'w'), 'white');
      lowpass(nz, SR, 3600, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const p = clamp(t / ctx.dur, 0, 1);
        const env = Math.sin(Math.PI * p);
        out[i] += nz[i] * 0.85 * env;
      }
  }},
];

function vehicleDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('screech')) return 3.0;
  if (n.includes('skid') || n.includes('abs')) return 2.4;
  if (n.includes('burnout') || n.includes('peel')) return 2.6;
  if (n.includes('rev') || n.includes('engine') || n.includes('v8') || n.includes('motorcycle')) return 2.5;
  if (n.includes('horn')) return 1.4;
  if (n.includes('brake') || n.includes('valve') || n.includes('hiss')) return 1.0;
  return 1.2;
}

/* ======================= WEAPONS / GUNS ======================= */
const weapon = [
  { kw: ['pistol', 'crack', '9mm'], dur: 0.55, render(out, ctx) {
      gunshot(out, ctx, { blast: 2600, crack: 55, sub: 95, tail: 0.5, level: 1.0 });
  }},
  { kw: ['shotgun', '12-gauge'], dur: 0.8, render(out, ctx) {
      gunshot(out, ctx, { blast: 1500, crack: 38, sub: 70, tail: 0.7, level: 1.1 });
  }},
  { kw: ['sniper', '.50', 'bmg', 'rifle'], dur: 1.4, render(out, ctx) {
      gunshot(out, ctx, { blast: 3200, crack: 70, sub: 60, tail: 1.1, level: 1.2, echo: 0.35 });
  }},
  { kw: ['burst', 'assault'], dur: 0.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'b');
      const rounds = 3;
      for (let r = 0; r < rounds; r++) {
        const buf = makeBuf(0.5);
        const sub = { blast: 2400, crack: 45, sub: 110, tail: 0.4, level: 0.8, seed: ctx.seed + 'r' + r };
        gunshot(buf, ctx, sub);
        C.addAt(out, buf, r * (0.07 + rnd() * 0.02), 1);
      }
  }},
  { kw: ['silenced', 'pew'], dur: 0.35, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'sp'), 'white');
      lowpass(nz, SR, 1200, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] += nz[i] * Math.exp(-t * 22) * 0.8;
      }
      modal(out, { f: 2200, tau: 0.03, ratios: [1, 2.1], seed: ctx.seed + 'mech' }, 0.3);
  }},
  { kw: ['reload', 'bolt', 'action', 'casing', 'shell', 'brass'], dur: 0.9, render(out, ctx) {
      // metallic clacks at intervals
      const rnd = mulberry(ctx.seed + 'rl');
      const times = [0, 0.18, 0.4, 0.62];
      times.forEach((t, i) => {
        modal(out, { f: 1200 + rnd() * 800, tau: 0.02, ratios: [1, 2.756, 5.4], seed: ctx.seed + 'm' + i, start: t }, 0.6);
        const cl = noiseBuf(SR * 0.05, mulberry(ctx.seed + 'c' + i), 'white');
        C.addAt(out, cl, t, 0.3);
      });
  }},
  { kw: ['laser', 'plasma', 'blaster', 'ion'], dur: 0.7, render(out, ctx) {
      // descending zap: high sine sweep + electric noise
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'lz'), 'white');
      highpass(nz, SR, 2000, 0.7);
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 3800 * Math.pow(0.25, p);
        phase += f / SR;
        const e = Math.sin(Math.PI * Math.min(1, p)) * 0.6;
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.5 + nz[i] * 0.4) * e;
      }
  }},
  { kw: ['cannon', 'artillery'], dur: 1.6, render(out, ctx) {
      gunshot(out, ctx, { blast: 700, crack: 25, sub: 55, tail: 1.4, level: 1.3 });
  }},
];
function weaponDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('silenced')) return 0.35;
  if (n.includes('laser') || n.includes('plasma') || n.includes('blaster') || n.includes('ion')) return 0.7;
  if (n.includes('shotgun')) return 0.8;
  if (n.includes('burst')) return 0.6;
  if (n.includes('reload') || n.includes('bolt') || n.includes('casing') || n.includes('shell') || n.includes('brass')) return 0.9;
  if (n.includes('sniper') || n.includes('.50') || n.includes('artillery') || n.includes('cannon')) return 1.4;
  return 0.55;
}
function gunshot(out, ctx, o) {
  const seed = o.seed || ctx.seed;
  const rnd = mulberry(seed);
  const nz = noiseBuf(out.length, mulberry(seed + 'n'), 'white');
  const crack = new Float32Array(out.length);
  highpass(nz, SR, o.blast * 0.4, 0.7);
  peaking(nz, SR, o.blast, 1.2, 10);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    crack[i] = nz[i] * Math.exp(-t / (o.crack / 1000)) ;
  }
  // low-frequency bore thump
  const sub = new Float32Array(out.length);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = o.sub * Math.exp(-t * 3);
    phase += f / SR;
    sub[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t / (o.tail * 0.5));
  }
  // tail rumble
  const brown = noiseBuf(out.length, mulberry(seed + 'b'), 'brown');
  lowpass(brown, SR, 300, 0.7);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const tail = Math.exp(-t / o.tail) * 0.5;
    out[i] += (crack[i] * (o.level || 1) + sub[i] * (o.level || 1) * 1.2 + brown[i] * tail) ;
  }
  if (o.echo) {
    const d = Math.floor(0.18 * SR);
    for (let i = d; i < out.length; i++) out[i] += out[i - d] * o.echo * 0.5;
  }
  void rnd;
}

module.exports = { vehicle, vehicleDur, weapon, weaponDur, gunshot };