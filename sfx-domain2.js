'use strict';

/* ============================================================================
   SFX-DOMAIN2.JS — blast, liquid, foley/impact, magic/chip, creature,
   ambient/weather, and UI/casino models.
   ============================================================================ */

const C = require('./sfx-core.js');
const { SR, hash32, mulberry, lowpass, highpass, peaking, noiseBuf, makeBuf, modal, bubble, scatterImpacts, clamp } = C;
const { gunshot } = require('./sfx-domain.js');

/* helpers used by a couple of models */
function e_drone(t, dur) {
  const a = Math.min(1, t / 0.6);
  const b = t > dur - 0.8 ? Math.max(0, (dur - t) / 0.8) : 1;
  return a * b;
}

/* ======================= BLAST / EXPLOSION ======================= */
function explosion(out, ctx, o) {
  const seed = o.seed || ctx.seed;
  const rnd = mulberry(seed);
  const n = out.length;
  // 1. blast front: broadband crack, very fast
  const nz = noiseBuf(n, mulberry(seed + 'n'), 'white');
  const front = new Float32Array(n);
  for (let i = 0; i < n; i++) front[i] = nz[i] * Math.exp(-i / SR / (o.front || 0.008));
  lowpass(front, SR, 6000, 0.6);
  // 2. body: brown-noise rumble
  const brown = noiseBuf(n, mulberry(seed + 'b'), 'brown');
  lowpass(brown, SR, o.bodyCut || 220, 0.8);
  // 3. sub drop
  const sub = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = o.sub * Math.exp(-t * 2.2);
    phase += f / SR;
    sub[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t / (o.subDecay || 0.4));
  }
  const tail = o.tail || 1.2;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const rumble = Math.exp(-t / tail) * (0.7 + 0.3 * Math.sin(2 * Math.PI * (7 + rnd() * 3) * t));
    out[i] += front[i] * (o.level || 1) + brown[i] * rumble * 1.1 + sub[i] * 1.2;
  }
  // debris scatter
  if (o.debris) scatterImpacts(out, o.debrisCount || 6, { f: 900 + rnd() * 600, tau: 0.03, ratios: [1, 1.7, 3.1], gain: 0.25 }, seed + 'd', tail * 0.7);
  if (o.echo) { const d = Math.floor(0.25 * SR); for (let i = d; i < n; i++) out[i] += out[i - d] * o.echo * 0.4; }
}

const blast = [
  { kw: ['mine', 'trigger'], dur: 2.4, render(out, ctx) { explosion(out, ctx, { front: 0.008, sub: 75, tail: 1.5, debris: true, debrisCount: 10 }); } },
  { kw: ['frag', 'grenade', 'detonation'], dur: 2.2, render(out, ctx) { explosion(out, ctx, { front: 0.006, sub: 80, tail: 1.4, debris: true, debrisCount: 8, level: 1.0 }); } },
  { kw: ['c4', 'structural', 'blast'], dur: 3.0, render(out, ctx) { explosion(out, ctx, { front: 0.01, sub: 65, tail: 2.0, debris: true, debrisCount: 14, echo: 0.4, level: 1.1 }); } },
  { kw: ['distant', 'rumble', 'bunker'], dur: 3.5, render(out, ctx) { explosion(out, ctx, { front: 0.03, sub: 40, tail: 2.5, bodyCut: 140, level: 0.7, echo: 0.5 }); } },
  { kw: ['barrel', 'rupture'], dur: 1.8, render(out, ctx) { explosion(out, ctx, { front: 0.007, sub: 90, tail: 1.0, debris: true, debrisCount: 6 }); } },
  { kw: ['sonic', 'boom'], dur: 2.0, render(out, ctx) { explosion(out, ctx, { front: 0.02, sub: 50, tail: 1.4, echo: 0.6, level: 0.9 }); } },
  { kw: ['wall', 'collapse', 'stone'], dur: 3.2, render(out, ctx) {
      explosion(out, ctx, { front: 0.01, sub: 55, tail: 1.8, bodyCut: 180, debris: true, debrisCount: 18 });
      scatterImpacts(out, 20, { f: 300, tau: 0.06, ratios: [1, 1.5, 2.4], gain: 0.4 }, ctx.seed + 'rubble', 2.4);
  }},
  { kw: ['depth charge', 'underwater'], dur: 3.0, render(out, ctx) {
      explosion(out, ctx, { front: 0.02, sub: 35, tail: 2.2, bodyCut: 110, level: 0.8 });
      lowpass(out, SR, 700, 0.7);
  }},
  { kw: ['meteor', 'impact', 'crater'], dur: 3.5, render(out, ctx) { explosion(out, ctx, { front: 0.012, sub: 45, tail: 2.4, bodyCut: 160, debris: true, debrisCount: 16, echo: 0.35, level: 1.1 }); } },
  { kw: ['fireworks', 'sky burst'], dur: 2.6, render(out, ctx) {
      const buf = makeBuf(0.6); explosion(buf, ctx, { front: 0.004, sub: 120, tail: 0.4, level: 0.9 });
      C.addAt(out, buf, 0.3, 1);
      // whistle up then crack
      const rnd = mulberry(ctx.seed + 'fw');
      scatterImpacts(out, 30, { f: 1400 + rnd() * 2000, tau: 0.05, ratios: [1, 1.6], gain: 0.2 }, ctx.seed + 'pops', 1.6);
  }},
];
function blastDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('distant') || n.includes('rumble')) return 3.5;
  if (n.includes('meteor') || n.includes('crater') || n.includes('collapse') || n.includes('c4') || n.includes('structural')) return 3.2;
  if (n.includes('depth')) return 3.0;
  if (n.includes('firework')) return 2.6;
  if (n.includes('mine') || n.includes('trigger')) return 2.4;
  if (n.includes('frag') || n.includes('grenade')) return 2.2;
  if (n.includes('sonic')) return 2.0;
  return 1.8;
}

/* ======================= LIQUID / WATER ======================= */
const liquid = [
  { kw: ['bubble', 'bloop', 'glug'], dur: 0.5, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'bb');
      const count = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < count; k++) bubble(out, 200 + rnd() * 300, 0.003 + rnd() * 0.004, 0.8 - k * 0.15, k * (0.12 + rnd() * 0.08), 0.12, 0.001);
  }},
  { kw: ['droplet', 'drip'], dur: 0.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'dp');
      bubble(out, 600 + rnd() * 200, 0.002, 0.8, 0, 0.06, 0.0005);
      bubble(out, 900, 0.0015, 0.4, 0.18, 0.05, 0.0004);
  }},
  { kw: ['splash', 'plunge', 'oar'], dur: 1.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'sp'), 'white');
      highpass(nz, SR, 800, 0.6);
      const brown = noiseBuf(out.length, mulberry(ctx.seed + 'sb'), 'brown');
      lowpass(brown, SR, 400, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.02) * Math.exp(-t / 0.22);
        out[i] += (nz[i] * 0.9 + brown[i] * 0.7) * e;
      }
      bubble(out, 350, 0.006, 0.3, 0.02, 0.2, 0.002);
  }},
  { kw: ['uncork', 'bottle'], dur: 0.7, render(out, ctx) {
      modal(out, { f: 380, tau: 0.05, ratios: [1, 2.1, 3.4], seed: ctx.seed + 'cork' }, 0.7);
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'pff'), 'white');
      highpass(nz, SR, 3000, 0.7);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * Math.exp(-i / SR / 0.12) * 0.3;
  }},
  { kw: ['trickle', 'fountain', 'stream'], dur: 2.6, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'tr'), 'white');
      const bp = new Float32Array(out.length);
      highpass(nz, SR, 1500, 0.8); lowpass(nz, SR, 7000, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const sparkle = 1 + 0.4 * Math.sin(2 * Math.PI * 30 * t);
        const e = Math.min(1, t / 0.15) * (t > ctx.dur - 0.3 ? (ctx.dur - t) / 0.3 : 1);
        out[i] += nz[i] * 0.6 * sparkle * e;
      }
      void bp;
  }},
  { kw: ['squish', 'slime'], dur: 0.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sq');
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 500 * (1 - 0.6 * t / ctx.dur);
        phase += f / SR;
        const e = Math.min(1, t / 0.01) * Math.exp(-t / 0.12);
        out[i] += Math.sin(2 * Math.PI * phase) * e * 0.7 + (rnd() * 2 - 1) * e * 0.1;
      }
  }},
  { kw: ['sizzle', 'acid', 'dissolve'], dur: 2.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'sz'), 'white');
      highpass(nz, SR, 3500, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.1) * Math.exp(-t / 0.8);
        out[i] += nz[i] * 0.5 * e * (1 + 0.5 * Math.sin(2 * Math.PI * 25 * t));
      }
  }},
  { kw: ['lava', 'boiling'], dur: 1.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'lv');
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'ln'), 'brown');
      lowpass(nz, SR, 500, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.1) * Math.exp(-t / 0.6);
        out[i] += nz[i] * e;
      }
      for (let k = 0; k < 8; k++) bubble(out, 90 + rnd() * 60, 0.01 + rnd() * 0.01, 0.5, rnd() * 1.4, 0.2, 0.004);
  }},
];
function liquidDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('trickle') || n.includes('fountain') || n.includes('stream')) return 2.6;
  if (n.includes('sizzle') || n.includes('acid') || n.includes('dissolve')) return 2.0;
  if (n.includes('lava') || n.includes('boiling')) return 1.6;
  if (n.includes('splash') || n.includes('plunge') || n.includes('oar')) return 1.0;
  return 0.5;
}

/* ======================= FOL / IMPACT / DEBRIS ======================= */
const foley = [
  /* creature footfall / body slam: heavy low thump, short and physical */
  { kw: ['footfall', 'stomp', 'trample'], dur: 0.5, render(out, ctx) {
      const heavy = /footfall|stomp|trample/i.test(ctx.name);
      modal(out, { f: 62, tau: 0.09, ratios: [1, 1.55, 2.3], seed: ctx.seed + 'body' }, 1);
      modal(out, { f: 130, tau: 0.04, ratios: [1, 2.1], seed: ctx.seed + 'thud' }, 0.6);
      const nz = noiseBuf(Math.floor(0.12 * SR), mulberry(ctx.seed + 'grit'), heavy ? 'brown' : 'white');
      if (heavy) lowpass(nz, SR, 900, 0.7);
      C.addAt(out, nz, 0, heavy ? 0.7 : 0.4);
  }},
  /* pouring liquid into a container / stream into a vessel */
  { kw: ['pour', 'decant', 'fill'], dur: 2.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'p'), 'white');
      const bp = new Float32Array(out.length);
      highpass(nz, SR, 1200, 0.7);
      lowpass(nz, SR, 6500, 0.6);
      const rnd = mulberry(ctx.seed + 'r');
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const trickle = 1 + 0.35 * Math.sin(2 * Math.PI * (28 + rnd() * 18) * t);
        // pitch drops as the vessel fills
        const tilt = 1 - 0.25 * p;
        const e = Math.min(1, p / 0.08) * (p > 0.88 ? Math.max(0, (1 - p) / 0.12) : 1);
        out[i] += nz[i] * 0.55 * trickle * tilt * e;
        // occasional droplet bounce
        if (t > 0.4 && rnd() < 0.0004) modal(out, { f: 900 + rnd() * 900, tau: 0.01, ratios: [1, 2.2], seed: ctx.seed + 'd' + i }, 0.2);
      }
      void bp;
  }},
  /* digging / soil: dry granular scrape + grit, declared before generic impacts
     so "Shovel Dirt Dig" does not route to 'shatter' */
  { kw: ['dig', 'dirt', 'soil', 'shovel', 'trowel'], dur: 0.55, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'dg'), 'white');
      const bp = new Float32Array(out.length);
      highpass(nz, SR, 900, 0.7);
      lowpass(nz, SR, 7000, 0.6);
      const grit = C.stickSlipExcite(out.length, ctx.seed + 't', 220, 0.6, 0.4);
      lowpass(grit, SR, 2600, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const e = Math.min(1, p / 0.1) * (p > 0.6 ? Math.max(0, (1 - p) / 0.4) : 1);
        out[i] += (nz[i] * 0.55 + grit[i] * 0.45) * e * (0.8 + 0.2 * Math.sin(2 * Math.PI * 18 * t));
      }
      void bp;
  }},
  /* footstep family: heel/toe impact with material colouration (declared before
     the generic impact bank so "Floor Step"/"Boots Squelch" never route to 'tick') */
  { kw: ['footstep', 'floor step', 'step', 'tread', 'sole', 'boot', 'heel', 'gravel', 'snow', 'mud', 'leaves', 'puddle', 'sand', 'grass', 'squelch', 'sink'], dur: 0.32, render(out, ctx) {
      const mat = ctx.material;
      const n = ' ' + ctx.name.toLowerCase() + ' ';
      const soft = n.includes('snow') || n.includes('grass') || n.includes('sand') || n.includes('mud') || n.includes('leaves');
      const bright = n.includes('gravel') || n.includes('marble') || n.includes('grate') || n.includes('puddle');
      modal(out, { f: soft ? 150 : (bright ? 420 : 240), tau: soft ? 0.05 : 0.03, ratios: soft ? [1, 1.4] : mat.ratios, seed: ctx.seed + 'h' }, soft ? 0.5 : 1);
      modal(out, { f: soft ? 260 : 700, tau: 0.015, ratios: [1, 2.2], seed: ctx.seed + 't', start: 0.045 }, 0.4);
      const nz = noiseBuf(Math.floor(0.09 * SR), mulberry(ctx.seed + 'n'), soft ? 'pink' : 'white');
      if (bright) highpass(nz, SR, 1800, 0.6); else if (!soft) peaking(nz, SR, mat.f0 * 2, 2, 6);
      C.addAt(out, nz, 0, soft ? 0.25 : 0.5);
  }},
  /* sustained dread drone must win over any incidental "crack" in the name */
  { kw: ['dread drone', 'sub-bass', 'dread'], dur: 3.0, render(out, ctx) {
      const f = 28 + (hash32(ctx.seed) % 18);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.6) * (t > ctx.dur - 0.8 ? (ctx.dur - t) / 0.8 : 1);
        const wob = 1 + 0.04 * Math.sin(2 * Math.PI * 0.7 * t) + 0.02 * Math.sin(2 * Math.PI * 2.3 * t);
        const fv = f * wob;
        out[i] += (Math.sin(2 * Math.PI * fv * t) * 0.7 + Math.sin(2 * Math.PI * fv * 1.005 * t) * 0.5) * e;
      }
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'brown');
      lowpass(nz, SR, 180, 0.8);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * e_drone(i / SR, ctx.dur) * 0.6;
  }},
  /* generic struck-object modal hit (wood/glass/metal/plastic tuned by material) */
  { kw: ['slap', 'hit', 'clack', 'tap', 'knock', 'thunk', 'clop', 'smack', 'hop', 'turn', 'clash', 'crackle'], dur: 0.35, render(out, ctx) {
      const mat = ctx.material;
      modal(out, { f: mat.f0, tau: mat.tau, ratios: mat.ratios, amps: mat.amps, seed: ctx.seed }, 1);
      const nz = noiseBuf(Math.floor(0.03 * SR), mulberry(ctx.seed + 'tr'), 'white');
      C.addAt(out, nz, 0, 0.5 * mat.tr);
  }},
  { kw: ['rattle', 'jingle', 'tumble', 'cascade', 'clatter', 'chime', 'riffle'], dur: 1.4, render(out, ctx) {
      const mat = ctx.material;
      const n = ctx.name.toLowerCase();
      // Staff/weapon flourish is a whoosh + wood knock, not a debris rattle.
      if (/staff|quarterstaff|bo staff|nunchaku/i.test(n)) {
        const nz = noiseBuf(out.length, mulberry(ctx.seed + 'w'), 'white');
        highpass(nz, SR, 700, 0.6);
        for (let i = 0; i < out.length; i++) {
          const p = i / out.length;
          out[i] += nz[i] * Math.sin(Math.PI * p) * 0.6;
        }
        lowpass(nz, SR, 3000, 0.6);
        modal(out, { f: 380, tau: 0.08, ratios: mat.ratios, seed: ctx.seed + 'k' }, 0.8);
        return;
      }
      scatterImpacts(out, ctx.impactCount || 10, { f: mat.f0, tau: mat.tau * 0.5, ratios: mat.ratios, amps: mat.amps, gain: 0.7 }, ctx.seed, (spreadOf(ctx) || 1.2));
  }},
  { kw: ['shatter', 'break', 'smash', 'crash', 'facade'], dur: 1.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sh');
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      highpass(nz, SR, 2200, 0.6);
      // initial crack
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * Math.exp(-i / SR / 0.08) * 0.7;
      // falling shards over ~1s, not a single 0.9s burst
      scatterImpacts(out, 26, { f: 2200 + rnd() * 3400, tau: 0.05, ratios: [1, 1.7, 2.9], gain: 0.34 }, ctx.seed + 'g', ctx.dur * 0.85);
      // debris tinkles on the floor
      scatterImpacts(out, 14, { f: 3800 + rnd() * 2600, tau: 0.02, ratios: [1, 2.4, 5.1], gain: 0.16 }, ctx.seed + 't', ctx.dur * 0.8);
      const brown = noiseBuf(out.length, mulberry(ctx.seed + 'br'), 'brown');
      lowpass(brown, SR, 700, 0.7);
      for (let i = 0; i < out.length; i++) out[i] += brown[i] * Math.exp(-i / SR / 0.25) * 0.5;
  }},
  /* campfire / log crackle: low ember bed + scattered resin pops */
  { kw: ['crackle', 'campfire', 'ember'], dur: 2.4, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'f'), 'brown');
      lowpass(nz, SR, 800, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.2) * (t > ctx.dur - 0.4 ? (ctx.dur - t) / 0.4 : 1);
        out[i] += nz[i] * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3.5 * t)) * e;
      }
      const rnd = mulberry(ctx.seed + 'pops');
      const pops = Math.max(10, Math.floor(ctx.dur * 11));
      for (let k = 0; k < pops; k++) {
        const t = rnd() * (ctx.dur - 0.15);
        modal(out, { f: 800 + rnd() * 2400, tau: 0.006 + rnd() * 0.012, ratios: [1, 1.6], seed: ctx.seed + 'p' + k, start: t }, 0.14 + rnd() * 0.14);
      }
  }},
  /* ore strike: pickaxe on rock — sharp metallic transient + short stone ring */
  { kw: ['ore', 'pickaxe'], dur: 0.5, render(out, ctx) {
      modal(out, { f: 2400 + (hash32(ctx.seed) % 1200), tau: 0.02, ratios: [1, 2.4, 4.3, 6.1], amps: [1, 0.6, 0.35, 0.2], seed: ctx.seed }, 0.7);
      modal(out, { f: 420 + (hash32(ctx.seed) % 200), tau: 0.08, ratios: [1, 1.6, 2.4], seed: ctx.seed + 'stone' }, 0.6);
      const nz = noiseBuf(Math.floor(0.03 * SR), mulberry(ctx.seed + 'n'), 'white');
      C.addAt(out, nz, 0, 0.55);
  }},
  /* dread/string swell: slow dissonant cluster rise (distinct from furniture drag) */
  { kw: ['terror sting', 'panic string', 'cluster chord', 'doom chord', 'sting rise', 'dissonant'], dur: 2.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ts');
      const root = 90 + rnd() * 40;
      const ratios = [1, 1.19, 1.414, 1.78, 2.0];
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const swell = Math.pow(p, 1.7);
        const cut = p > 0.92 ? Math.max(0, (1 - p) / 0.08) : 1;
        let v = 0;
        for (let k = 0; k < ratios.length; k++) {
          const f = root * ratios[k] * (1 + 0.02 * Math.sin(2 * Math.PI * (0.4 + k * 0.2) * t));
          v += Math.sin(2 * Math.PI * f * t) / (1 + k * 1.3);
        }
        out[i] += v * swell * cut * 0.5;
      }
      const sh = C.metalShimmer(out.length, ctx.seed + 'sh', 900 + rnd() * 600, 1200);
      for (let i = 0; i < out.length; i++) out[i] += sh[i] * Math.pow(i / out.length, 2) * 0.25;
  }},
  { kw: ['creak', 'groan'], dur: 1.2, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'cr');
      let phase = 0;
      const f0 = 90 + rnd() * 60;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const warble = 1 + 0.5 * Math.sin(2 * Math.PI * (7 + rnd() * 6) * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t));
        phase += f0 * warble / SR;
        const e = Math.sin(Math.PI * clamp(t / ctx.dur, 0, 1)) * 0.7;
        out[i] += Math.sin(2 * Math.PI * phase) * e;
      }
      // stick-slip texture
      const ex = C.stickSlipExcite(out.length, ctx.seed, 300, 0.4, 0.2);
      lowpass(ex, SR, 2000, 0.7);
      for (let i = 0; i < out.length; i++) out[i] += ex[i] * 0.2;
  }},
  { kw: ['slide', 'swipe', 'scrape', 'draw', 'deal', 'slide'], dur: 0.6, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'sl'), 'white');
      const bp = new Float32Array(out.length);
      highpass(nz, SR, 1000, 0.7); lowpass(nz, SR, 6000, 0.6);
      const rnd = mulberry(ctx.seed + 'r');
      const tex = C.stickSlipExcite(out.length, ctx.seed + 't', 500 + rnd() * 200, 0.5, 0.3);
      lowpass(tex, SR, 3000, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const e = Math.sin(Math.PI * p) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 20 * t));
        out[i] += (nz[i] * 0.6 + tex[i] * 0.4) * e;
      }
      void bp;
  }},
  { kw: ['tick', 'clock', 'beep', 'blip'], dur: 0.2, render(out, ctx) {
      modal(out, { f: ctx.freq || 2000, tau: 0.02, ratios: [1, 2.7, 5.4], seed: ctx.seed }, 0.6);
  }},
  { kw: ['snap', 'crack', 'twang', 'string', 'tighten', 'slam'], dur: 0.4, render(out, ctx) {
      const mat = ctx.material;
      modal(out, { f: mat.f0 * 2, tau: 0.05, ratios: [1, 2.7], seed: ctx.seed }, 0.8);
      const nz = noiseBuf(Math.floor(0.02 * SR), mulberry(ctx.seed + 'n'), 'white');
      C.addAt(out, nz, 0, 0.4);
      // heavy door/floor slam adds a low thud
      if (/slam|crush|strike/i.test(ctx.name)) {
        modal(out, { f: 70, tau: 0.12, ratios: [1, 1.6, 2.4], seed: ctx.seed + 'thud' }, 0.9);
      }
  }},
  { kw: ['fizz', 'spark', 'flare'], dur: 0.7, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'fz'), 'white');
      highpass(nz, SR, 4000, 0.6);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] += nz[i] * Math.exp(-t / 0.15) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 40 * t));
      }
  }},
];
function spreadOf(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('cascade') || n.includes('shower') || n.includes('tray')) return 1.4;
  return 1.0;
}

/* material presets used by foley */
const MATERIALS = {
  wood:  { f0: 420, tau: 0.09, ratios: [1, 2.756, 5.404], tr: 0.5, amps: [1, 0.5, 0.25] },
  glass: { f0: 2600, tau: 0.05, ratios: [1, 2.4, 4.1, 6.2], tr: 0.6, amps: [1, 0.6, 0.4, 0.2] },
  metal: { f0: 1800, tau: 0.12, ratios: [1, 1.414, 2.732, 3.141, 4.6], tr: 0.5, amps: [1, 0.7, 0.5, 0.3, 0.2] },
  plastic:{ f0: 900, tau: 0.05, ratios: [1, 2.2, 3.5], tr: 0.4, amps: [1, 0.4, 0.2] },
  stone: { f0: 300, tau: 0.06, ratios: [1, 1.6, 2.5], tr: 0.6, amps: [1, 0.5, 0.3] },
};

/* ======================= MAGIC / CHIP / FANFARE (tonal) ======================= */
function tone(out, f, start, dur, amp, wave) {
  const n = Math.floor(dur * SR), off = Math.floor(start * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = Math.min(1, t / 0.005) * (1 - t / dur);
    let v;
    if (wave === 'square') v = ((f * t) % 1) < 0.5 ? 1 : -1;
    else if (wave === 'saw') v = ((f * t) % 1) * 2 - 1;
    else if (wave === 'tri') v = 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;
    else v = Math.sin(2 * Math.PI * f * t);
    const j = off + i; if (j < out.length) out[j] += v * e * amp;
  }
}
const magic = [
  { kw: ['zap', 'bolt'], dur: 1.6, render(out, ctx) {
      // sharp electric crack over a rising charge
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'z'), 'white');
      highpass(nz, SR, 2500, 0.6);
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 120 + 2600 * Math.pow(p, 2);
        phase += f / SR;
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.5 + nz[i] * 0.4 * Math.exp(-t / 0.1)) * Math.min(1, p / 0.15);
      }
      modal(out, { f: 180, tau: 0.1, ratios: [1, 2.1], seed: ctx.seed + 'hit' }, 0.4);
  }},
  { kw: ['cast', 'spell', 'fireball', 'arcane'], dur: 1.6, render(out, ctx) {
      // rising sweep + sparkle + impact
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 200 + 900 * Math.pow(p, 1.6);
        phase += f / SR;
        const e = Math.min(1, p / 0.2) * Math.exp(-p * 3);
        out[i] += Math.sin(2 * Math.PI * phase) * e * 0.5;
      }
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      highpass(nz, SR, 3000, 0.6);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        out[i] += nz[i] * Math.exp(-t / 0.2) * (0.3 + 0.4 * Math.sin(2 * Math.PI * 20 * t));
      }
      modal(out, { f: 200, tau: 0.15, ratios: [1, 2.2, 3.6], seed: ctx.seed + 'imp' }, 0.4);
  }},
  { kw: ['shimmer', 'heal', 'angelic', 'choir', 'bell'], dur: 2.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sh');
      const root = 523.25;
      [1, 1.26, 1.5, 2].forEach((r, k) => tone(out, root * r * (0.99 + rnd() * 0.02), 0, ctx.dur, 0.2 / (k + 1), 'sine'));
  }},
  { kw: ['freeze', 'ice', 'crystal', 'shatter'], dur: 1.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ic');
      scatterImpacts(out, 12, { f: 2000 + rnd() * 3000, tau: 0.06, ratios: [1, 1.7, 2.8], gain: 0.35 }, ctx.seed, 0.8);
      tone(out, 1200, 0, ctx.dur, 0.15, 'sine');
  }},
  { kw: ['whoosh', 'portal', 'teleport', 'sweep', 'slow'], dur: 1.4, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'w'), 'white');
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const cut = 300 + 4000 * Math.sin(Math.PI * p);
        out[i] += nz[i] * 0.6 * Math.sin(Math.PI * p);
        void cut;
      }
      lowpass(nz, SR, 5000, 0.6);
  }},
  { kw: ['siren', 'alarm'], dur: 2.4, render(out, ctx) {
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 600 + 400 * Math.sin(2 * Math.PI * 1.2 * t);
        phase += f / SR;
        const e = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.2 * t);
        out[i] += Math.sin(2 * Math.PI * phase) * e * 0.5;
      }
  }},
  { kw: ['warn', 'danger', 'alert'], dur: 2.4, render(out, ctx) {
      // two-tone alert bleep
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const seg = Math.floor(t / 0.35) % 2;
        const f = seg ? 660 : 880;
        phase += f / SR;
        const e = Math.min(1, (t % 0.35) / 0.01) * (0.35 - (t % 0.35) < 0.05 ? 0.3 : 1);
        out[i] += Math.sin(2 * Math.PI * phase) * e * 0.45;
      }
  }},
  { kw: ['hum', 'drone', 'field', 'energy'], dur: 2.5, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'hm');
      const f = 50 + rnd() * 40;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.3) * (t > ctx.dur - 0.3 ? (ctx.dur - t) / 0.3 : 1);
        out[i] += (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.5 + Math.sin(2 * Math.PI * f * 2.01 * t) * 0.3) * e * 0.4;
      }
  }},
  { kw: ['chime', 'ding', 'reward', 'treasure', 'prize', 'discover', 'pickup', 'coin'], dur: 1.2, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ch');
      const root = 880 + rnd() * 200;
      tone(out, root, 0, 0.4, 0.4, 'sine'); tone(out, root * 1.5, 0.08, 0.5, 0.3, 'sine'); tone(out, root * 2, 0.16, 0.6, 0.2, 'sine');
  }},
  { kw: ['fanfare', 'victory', 'trumpet', 'horn'], dur: 2.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ff');
      const root = 261.6;
      const seq = [[0, 1], [0.3, 1.26], [0.6, 1.5], [0.9, 2]];
      seq.forEach(([s, r]) => tone(out, root * r, s, 0.5, 0.25, 'saw'));
      void rnd;
  }},
  { kw: ['arp', 'chip', '8-bit', 'retro', 'power-up', '1-up', 'mushroom', 'jump'], dur: 0.8, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ar');
      const root = 440 + rnd() * 100;
      const steps = [0, 4, 7, 12];
      steps.forEach((s, k) => tone(out, root * Math.pow(2, s / 12), k * 0.08, 0.16, 0.3, 'square'));
  }},
  { kw: ['laser', 'pew'], dur: 0.5, render(out, ctx) {
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 3000 * Math.pow(0.3, p);
        phase += f / SR;
        out[i] += (((phase) % 1) < 0.5 ? 1 : -1) * Math.sin(Math.PI * p) * 0.3;
      }
  }},
];
function magicDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('fanfare') || n.includes('victory')) return 2.6;
  if (n.includes('hum') || n.includes('drone') || n.includes('field')) return 2.5;
  if (n.includes('alarm') || n.includes('siren')) return 2.4;
  if (n.includes('shimmer') || n.includes('choir') || n.includes('heal')) return 2.0;
  if (n.includes('cast') || n.includes('fireball') || n.includes('bolt')) return 1.6;
  if (n.includes('freeze') || n.includes('ice') || n.includes('portal') || n.includes('teleport')) return 1.4;
  if (n.includes('chime') || n.includes('coin') || n.includes('reward')) return 1.2;
  return 1.2;
}

/* ======================= CREATURE / MONSTER / HORROR ======================= */
const creature = [
  /* massive footfall / trample (declared first so it beats "roar" in
     "T Rex Footfall Stomp" - keyword 'footfall' appears earlier in the name) */
  { kw: ['footfall', 'trample', 'stomp'], dur: 0.5, render(out, ctx) {
      modal(out, { f: 58, tau: 0.1, ratios: [1, 1.5, 2.2], seed: ctx.seed + 'body' }, 1);
      modal(out, { f: 124, tau: 0.045, ratios: [1, 2.1], seed: ctx.seed + 'thud' }, 0.6);
      const nz = noiseBuf(Math.floor(0.14 * SR), mulberry(ctx.seed + 'grit'), 'brown');
      lowpass(nz, SR, 950, 0.7);
      C.addAt(out, nz, 0, 0.75);
  }},
  { kw: ['howl', 'shriek'], dur: 1.8, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'hw');
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        // sustained rising-then-falling wail (wolf howl) vs short shriek
        const arc = /howl/i.test(ctx.name)
          ? Math.sin(Math.PI * Math.pow(p, 0.7))
          : Math.sin(Math.PI * p);
        const f = (300 + rnd() * 200) * (1 + 1.6 * arc);
        phase += f / SR;
        const breathy = 0.5 + 0.5 * Math.sin(2 * Math.PI * (5 + rnd() * 3) * t);
        const e = Math.min(1, p / 0.08) * arc;
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.6 + (rnd() * 2 - 1) * 0.08) * e * breathy;
      }
  }},
  { kw: ['burp', 'moan', 'groan', 'whimper'], dur: 1.6, render(out, ctx) {
      const isBurp = /burp/i.test(ctx.name);
      let phase = 0;
      const f0 = isBurp ? 70 + (hash32(ctx.seed) % 25) : 55 + (hash32(ctx.seed) % 20);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        if (isBurp) {
          // rising gurgle then abrupt release
          const f = f0 * (1 + 2.2 * p);
          phase += f / SR;
          const gurgle = 0.5 + 0.5 * Math.sin(2 * Math.PI * (18 + p * 30) * t);
          const e = Math.min(1, p / 0.1) * (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1);
          out[i] += Math.sin(2 * Math.PI * phase) * e * (0.5 + 0.5 * gurgle) * 0.8;
        } else {
          phase += (f0 * (1 + 0.25 * Math.sin(2 * Math.PI * 4 * t))) / SR;
          out[i] += Math.sin(2 * Math.PI * phase) * Math.sin(Math.PI * p) * 0.6;
        }
      }
  }},
  { kw: ['roar', 'growl', 'bellow'], dur: 2.5, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ro');
      const f = 70 + rnd() * 40;
      let phase = 0;
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'brown');
      lowpass(nz, SR, 500, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const wob = 1 + 0.3 * Math.sin(2 * Math.PI * (5 + rnd() * 4) * t) + 0.2 * Math.sin(2 * Math.PI * 13 * t);
        const fv = f * wob;
        phase += fv / SR;
        const e = Math.min(1, p / 0.15) * (1 - Math.pow(p, 2));
        const growl = 0.6 + 0.4 * Math.sin(2 * Math.PI * (8 + p * 10) * t);
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.7 + nz[i] * 0.5) * e * growl;
      }
  }},
  { kw: ['screech', 'chitter', 'cackle'], dur: 1.8, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sh');
      let phase = 0;
      const f = 400 + rnd() * 300;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const fv = f * (1 + 1.2 * Math.sin(2 * Math.PI * (2 + rnd() * 2) * t));
        phase += fv / SR;
        const e = Math.sin(Math.PI * p) * 0.5;
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.5 + (rnd() * 2 - 1) * 0.2) * e;
      }
  }},
  { kw: ['heartbeat', 'pulse', 'thump'], dur: 2.0, render(out, ctx) {
      const beats = 4;
      for (let b = 0; b < beats; b++) {
        const t = b * 0.45;
        modal(out, { f: 55, tau: 0.06, ratios: [1, 1.6], seed: ctx.seed + 'b' + b, start: t }, 0.8);
        modal(out, { f: 50, tau: 0.05, ratios: [1, 1.6], seed: ctx.seed + 'b2' + b, start: t + 0.15 }, 0.5);
      }
  }},
  { kw: ['drone', 'sub', 'dread'], dur: 3.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'dr');
      const f = 30 + rnd() * 20;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.5) * (t > ctx.dur - 0.6 ? (ctx.dur - t) / 0.6 : 1);
        out[i] += (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.01 * t) * 0.7) * e * 0.5;
      }
  }},
];
function creatureDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('footfall') || n.includes('trample') || n.includes('stomp')) return 0.5;
  if (n.includes('roar') || n.includes('growl')) return 2.5;
  if (n.includes('heartbeat')) return 2.0;
  if (n.includes('shriek') || n.includes('howl')) return 1.8;
  if (n.includes('drone') || n.includes('dread')) return 3.0;
  return 1.8;
}

/* ======================= AMBIENT / WEATHER ======================= */
const ambient = [
  { kw: ['crackle'], dur: 3.0, render(out, ctx) {
      // campfire: low roar bed + random pops
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'f'), 'brown');
      lowpass(nz, SR, 700, 0.7);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3 * i / SR));
      const rnd = mulberry(ctx.seed + 'pops');
      for (let k = 0; k < 28; k++) {
        const t = rnd() * (ctx.dur - 0.2);
        modal(out, { f: 700 + rnd() * 2200, tau: 0.008 + rnd() * 0.012, ratios: [1, 1.6], seed: ctx.seed + 'p' + k, start: t }, 0.16 + rnd() * 0.12);
      }
  }},
  { kw: ['lightning'], dur: 3.5, render(out, ctx) {
      // close strike: sharp initial crack, then long rolling rumble
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'b'), 'brown');
      lowpass(nz, SR, 260, 0.7);
      const crack = noiseBuf(out.length, mulberry(ctx.seed + 'c'), 'white');
      highpass(crack, SR, 1800, 0.6);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const crackEnv = Math.exp(-t / 0.035) * 0.9;
        const rumble = Math.exp(-t / 1.8) * (1 + 0.5 * Math.sin(2 * Math.PI * 4 * t + Math.sin(2 * Math.PI * 1.3 * t)));
        out[i] += crack[i] * crackEnv + nz[i] * rumble * 1.1;
      }
      scatterImpacts(out, 12, { f: 400 + (hash32(ctx.seed) % 300), tau: 0.08, ratios: [1, 1.5, 2.3], gain: 0.3 }, ctx.seed + 'r', 2.6);
  }},
  { kw: ['thunder'], dur: 3.5, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 't'), 'brown');
      lowpass(nz, SR, 300, 0.7);
      const crack = noiseBuf(out.length, mulberry(ctx.seed + 'c'), 'white');
      highpass(crack, SR, 1500, 0.6);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const crackEnv = Math.exp(-t / 0.05);
        const rumble = Math.exp(-t / 1.5) * (1 + 0.4 * Math.sin(2 * Math.PI * 3 * t));
        out[i] += crack[i] * crackEnv * 0.7 + nz[i] * rumble;
      }
  }},
  { kw: ['wind', 'gust', 'blizzard', 'tornado', 'vortex'], dur: 4.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'w'), 'brown');
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.3 * t + Math.sin(2 * Math.PI * 0.1 * t));
        out[i] += nz[i] * mod * Math.sin(Math.PI * Math.min(1, p * 1.2));
      }
      lowpass(nz, SR, 800, 0.6);
  }},
  { kw: ['rain', 'patter'], dur: 3.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'r'), 'white');
      highpass(nz, SR, 1200, 0.6);
      scatterImpacts(out, 40, { f: 3000, tau: 0.02, ratios: [1, 1.7], gain: 0.15 }, ctx.seed + 'drops', 2.8);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * 0.3;
  }},
  { kw: ['wave', 'ocean', 'surf'], dur: 4.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'o'), 'brown');
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = (t % 1.6) / 1.6;
        const env = Math.pow(Math.sin(Math.PI * p), 1.5);
        out[i] += nz[i] * env * 1.5;
      }
      lowpass(nz, SR, 1200, 0.6);
  }},
  { kw: ['fire', 'roar', 'crackle'], dur: 3.0, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'f'), 'brown');
      lowpass(nz, SR, 700, 0.7);
      const rnd = mulberry(ctx.seed + 'cr');
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * (0.7 + 0.3 * Math.sin(2 * Math.PI * 3 * i / SR));
      scatterImpacts(out, 25, { f: 800 + rnd() * 2000, tau: 0.01, ratios: [1, 1.6], gain: 0.12 }, ctx.seed + 'pops', 2.5);
  }},
  { kw: ['hail', 'tin'], dur: 2.5, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'h');
      scatterImpacts(out, 30, { f: 1800 + rnd() * 1500, tau: 0.03, ratios: [1, 2.7, 5.4], gain: 0.3 }, ctx.seed, 2.2);
  }},
  { kw: ['earthquake', 'tremor', 'rumble'], dur: 3.5, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'e'), 'brown');
      lowpass(nz, SR, 120, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const shake = 0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t) * Math.sin(2 * Math.PI * 1.5 * t);
        const e = Math.min(1, t / 0.5) * (t > ctx.dur - 0.8 ? (ctx.dur - t) / 0.8 : 1);
        out[i] += nz[i] * shake * e * 2;
      }
  }},
  { kw: ['volcano', 'eruption', 'ash'], dur: 4.0, render(out, ctx) {
      explosion(out, ctx, { front: 0.02, sub: 40, tail: 2.5, bodyCut: 150, debris: true, debrisCount: 20, level: 1.1 });
      scatterImpacts(out, 25, { f: 500, tau: 0.05, ratios: [1, 1.6, 2.4], gain: 0.2 }, ctx.seed + 'rocks', 3);
  }},
  /* glacier calving / ice shelf break: deep groan then violent fracture */
  { kw: ['glacier', 'calving', 'ice shelf'], dur: 3.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'gl');
      // pressure groan
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 38 + 22 * Math.sin(2 * Math.PI * 0.25 * t) + 8 * Math.sin(2 * Math.PI * 0.9 * t);
        phase += f / SR;
        const e = p < 0.35 ? Math.min(1, p / 0.12) : 1;
        out[i] += Math.sin(2 * Math.PI * phase) * e * 0.8;
      }
      // fracture crack at ~1s
      const crackAt = Math.floor(1.0 * SR);
      const nz = noiseBuf(out.length - crackAt, mulberry(ctx.seed + 'cr'), 'white');
      highpass(nz, SR, 900, 0.6);
      const brown = noiseBuf(out.length - crackAt, mulberry(ctx.seed + 'rb'), 'brown');
      lowpass(brown, SR, 350, 0.7);
      for (let i = 0; i < nz.length; i++) {
        const t = i / SR;
        out[crackAt + i] += (nz[i] * Math.exp(-t / 0.06) * 0.8 + brown[i] * Math.exp(-t / 0.9) * 1.4);
      }
      scatterImpacts(out, 24, { f: 300 + rnd() * 500, tau: 0.12, ratios: [1, 1.5, 2.4], gain: 0.35 }, ctx.seed + 'ice', 2.2);
  }},
  { kw: ['rockslide', 'echo'], dur: 3.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'rk');
      scatterImpacts(out, 20, { f: 250 + rnd() * 200, tau: 0.1, ratios: [1, 1.5, 2.3], gain: 0.5 }, ctx.seed, 2.2);
      const d = Math.floor(0.3 * SR);
      for (let i = d; i < out.length; i++) out[i] += out[i - d] * 0.3;
  }},
];
function ambientDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('glacier') || n.includes('calving') || n.includes('ice shelf')) return 3.6;
  if (n.includes('tornado') || n.includes('hurricane') || n.includes('monsoon')) return 4.2;
  if (n.includes('volcano') || n.includes('wind') || n.includes('wave') || n.includes('ocean') || n.includes('glacier')) return 4.0;
  if (n.includes('thunder') || n.includes('lightning') || n.includes('earthquake')) return 3.5;
  if (n.includes('rockslide') || n.includes('avalanche')) return 3.0;
  if (n.includes('rain') || n.includes('fire') || n.includes('storm')) return 3.0;
  if (n.includes('hail') || n.includes('blizzard')) return 2.5;
  return 3.0;
}

/* ======================= UI / CASINO / MACHINERY ======================= */
const ui = [
  { kw: ['button', 'tap'], dur: 0.12, render(out, ctx) {
      modal(out, { f: 900, tau: 0.015, ratios: [1, 2.7], seed: ctx.seed }, 0.7);
      const nz = noiseBuf(Math.floor(0.02 * SR), mulberry(ctx.seed + 'n'), 'white');
      C.addAt(out, nz, 0, 0.3);
  }},
  { kw: ['click', 'detent'], dur: 0.06, render(out, ctx) {
      modal(out, { f: 3200 + (hash32(ctx.seed) % 1200), tau: 0.005, ratios: [1, 2.4], seed: ctx.seed }, 0.6);
  }},
  { kw: ['ping', 'notification'], dur: 0.5, render(out, ctx) { tone(out, 1400, 0, 0.25, 0.4, 'sine'); tone(out, 2100, 0.08, 0.3, 0.3, 'sine'); void ctx; } },
  { kw: ['success', 'triad'], dur: 0.8, render(out, ctx) { [523, 659, 784].forEach((f, k) => tone(out, f, k * 0.06, 0.4, 0.3, 'sine')); void ctx; } },
  { kw: ['error', 'thud', 'alert'], dur: 0.4, render(out, ctx) { tone(out, 220, 0, 0.25, 0.4, 'tri'); tone(out, 233, 0.1, 0.3, 0.3, 'tri'); void ctx; } },
  { kw: ['toggle', 'switch', 'snap'], dur: 0.15, render(out, ctx) { modal(out, { f: 1600, tau: 0.02, ratios: [1, 2.2], seed: ctx.seed }, 0.6); void ctx; } },
  { kw: ['slider', 'tick', 'step'], dur: 0.08, render(out, ctx) { modal(out, { f: 3000, tau: 0.008, ratios: [1], seed: ctx.seed }, 0.5); void ctx; } },
  { kw: ['slider', 'tick'], dur: 0.06, render(out, ctx) { modal(out, { f: 2600, tau: 0.006, ratios: [1], seed: ctx.seed }, 0.4); void ctx; } },
  { kw: ['keypress', 'key'], dur: 0.10, render(out, ctx) {
      modal(out, { f: 3200 + (hash32(ctx.seed) % 900), tau: 0.008, ratios: [1, 2.4, 5.1], seed: ctx.seed }, 0.55);
      const nz = noiseBuf(Math.floor(0.012 * SR), mulberry(ctx.seed + 'n'), 'white');
      C.addAt(out, nz, 0, 0.4);
  }},
  { kw: ['modal', 'popup', 'swipe', 'tab'], dur: 0.5, render(out, ctx) {
      // swept band-pass swipe: cutoff glides 600 Hz -> 6 kHz -> 900 Hz
      const rnd = mulberry(ctx.seed + 'sw');
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      const sweep = new Float32Array(out.length);
      let lp1 = 0, lp2 = 0, hp = 0, prevIn = 0;
      for (let i = 0; i < out.length; i++) {
        const p = i / out.length;
        const cutoff = 600 + 5400 * Math.sin(Math.PI * p);
        const a = 1 - Math.exp(-2 * Math.PI * cutoff / SR);
        lp1 += a * (nz[i] - lp1);
        lp2 += a * (lp1 - lp2);
        hp = 0.92 * (hp + lp2 - prevIn);
        prevIn = lp2;
        sweep[i] = hp;
      }
      const shimmer = 1 + 0.25 * Math.sin(2 * Math.PI * (rnd() * 20 + 30) * 0);
      for (let i = 0; i < out.length; i++) {
        const p = i / out.length;
        out[i] += sweep[i] * Math.sin(Math.PI * p) * 0.7 * shimmer;
      }
      void ctx;
  }},
  { kw: ['bell', 'confirmation'], dur: 1.0, render(out, ctx) { modal(out, { f: 1046, tau: 0.3, ratios: [1, 2.7, 5.4, 8.9], amps: [1, 0.5, 0.3, 0.15], seed: ctx.seed }, 0.5); void ctx; } },
  { kw: ['reel', 'spin', 'wheel', 'roulette', 'bingo'], dur: 2.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sp');
      let last = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const rate = 20 * Math.exp(-t * 1.5);
        if (t > last) { last = t + 1 / Math.max(1, rate); modal(out, { f: 1200 + rnd() * 600, tau: 0.01, ratios: [1, 1.6], seed: ctx.seed + 'c' + i, start: 0 }, 0.0001); }
      }
      // simple tick train
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const rate = 20 * Math.exp(-t * 1.5);
        phase += rate / SR;
        const click = (phase % 1) < (rate / SR) ? 1 : 0;
        out[i] += (rnd() * 2 - 1) * click * 0.4;
      }
  }},
  { kw: ['chip', 'stack', 'token', 'arcade'], dur: 0.6, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'ck');
      scatterImpacts(out, 6, { f: 1800 + rnd() * 800, tau: 0.03, ratios: [1, 2.7], gain: 0.4 }, ctx.seed, 0.4);
  }},
  { kw: ['cascade', 'tray', 'gold'], dur: 1.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'cn');
      scatterImpacts(out, 22, { f: 3000 + rnd() * 2000, tau: 0.05, ratios: [1, 1.5, 2.7], gain: 0.25 }, ctx.seed, 1.2);
  }},
  { kw: ['coin'], dur: 1.4, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'cn');
      scatterImpacts(out, 16, { f: 3600 + rnd() * 1600, tau: 0.04, ratios: [1, 1.48, 2.9], gain: 0.3 }, ctx.seed, 1.1);
  }},
  { kw: ['bumper', 'ricochet', 'pinball'], dur: 0.8, render(out, ctx) {
      modal(out, { f: 700, tau: 0.08, ratios: [1, 2.1, 3.9], seed: ctx.seed }, 0.6);
      tone(out, 1800, 0, 0.2, 0.2, 'sine');
  }},
  { kw: ['jackpot', 'siren'], dur: 2.5, render(out, ctx) {
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR, p = t / ctx.dur;
        const f = 400 + 600 * p;
        phase += f / SR;
        const e = Math.sin(Math.PI * p) * 0.4;
        out[i] += (Math.sin(2 * Math.PI * phase) + Math.sin(2 * Math.PI * phase * 1.5) * 0.4) * e;
      }
  }},
  { kw: ['ding', 'reel', 'stop'], dur: 0.6, render(out, ctx) { tone(out, 1046, 0, 0.3, 0.4, 'sine'); tone(out, 1318, 0.05, 0.3, 0.3, 'sine'); void ctx; } },
];
function uiDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('slider') || n.includes('tick')) return 0.08;
  if (n.includes('click') || n.includes('detent')) return 0.06;
  if (n.includes('button') || n.includes('tap') || n.includes('toggle') || n.includes('switch')) return 0.14;
  if (n.includes('reel') || n.includes('spin') || n.includes('wheel') || n.includes('roulette') || n.includes('bingo')) return 2.0;
  if (n.includes('jackpot') || n.includes('siren')) return 2.5;
  if (n.includes('coin') || n.includes('cascade') || n.includes('tray')) return 1.4;
  if (n.includes('bell') || n.includes('confirmation')) return 1.0;
  if (n.includes('success') || n.includes('triad')) return 0.8;
  return 0.4;
}

/* ======================= MACHINERY / POWER ======================= */
const machinery = [
  { kw: ['press', 'stamping', 'hydraulic'], dur: 1.0, render(out, ctx) {
      // hiss then heavy slam
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'h'), 'white');
      highpass(nz, SR, 3000, 0.6);
      for (let i = 0; i < out.length; i++) { const t = i / SR; out[i] += nz[i] * Math.exp(-t / 0.3) * (t < 0.4 ? 1 : 0.2); }
      modal(out, { f: 80, tau: 0.15, ratios: [1, 1.6, 2.4], seed: ctx.seed + 'slam', start: 0.4 }, 1);
      const nz2 = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      C.addAt(out, nz2, Math.floor(0.4 * SR), 0.5);
  }},
  { kw: ['grind', 'gear', 'teeth'], dur: 2.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'gr');
      const ex = C.stickSlipExcite(out.length, ctx.seed, 180 + rnd() * 60, 0.5, 0.3);
      lowpass(ex, SR, 2500, 0.7);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.2) * (t > ctx.dur - 0.4 ? (ctx.dur - t) / 0.4 : 1);
        const teeth = Math.sin(2 * Math.PI * (60 + 30 * Math.sin(2 * Math.PI * 2 * t)) * t);
        out[i] += (ex[i] * 0.6 + teeth * 0.3) * e;
      }
  }},
  { kw: ['saw', 'cut', 'circular'], dur: 2.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'sw');
      let phase = 0;
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'n'), 'white');
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 90 + rnd() * 30;
        phase += f / SR;
        const sawWave = ((phase) % 1) * 2 - 1;
        const e = Math.min(1, t / 0.1) * (t > ctx.dur - 0.3 ? (ctx.dur - t) / 0.3 : 1);
        out[i] += (sawWave * 0.5 + nz[i] * 0.4) * e;
      }
  }},
  { kw: ['chug', 'locomotive'], dur: 3.0, render(out, ctx) {
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const chug = Math.exp(-((t % 0.5) * 8)) * Math.sin(2 * Math.PI * 40 * t);
        const e = Math.min(1, t / 0.2) * (t > ctx.dur - 0.5 ? (ctx.dur - t) / 0.5 : 1);
        out[i] += chug * e * 0.6;
      }
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'st'), 'white');
      lowpass(nz, SR, 2500, 0.7);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * 0.12 * Math.min(1, i / (0.2 * SR));
  }},
  { kw: ['whistle', 'factory', 'steam'], dur: 2.0, render(out, ctx) {
      const rnd = mulberry(ctx.seed + 'wh');
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const f = 1400 + 200 * Math.sin(2 * Math.PI * 3 * t);
        phase += f / SR;
        const nz = (mulberry(ctx.seed + 'x')() * 2 - 1);
        const e = Math.min(1, t / 0.05) * (t > ctx.dur - 0.3 ? (ctx.dur - t) / 0.3 : 1);
        out[i] += (Math.sin(2 * Math.PI * phase) * 0.5 + nz * 0.2) * e;
      }
  }},
  { kw: ['hum', 'transformer', 'substation'], dur: 3.0, render(out, ctx) {
      tone(out, 120, 0, ctx.dur, 0.3, 'sine'); tone(out, 240, 0, ctx.dur, 0.2, 'sine'); tone(out, 360, 0, ctx.dur, 0.1, 'sine');
      void ctx;
  }},
  { kw: ['beep', 'reverse', 'forklift'], dur: 1.2, render(out, ctx) {
      let phase = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const beep = (t % 0.5) < 0.25 ? 1 : 0;
        phase += 1000 / SR;
        out[i] += Math.sin(2 * Math.PI * phase) * beep * 0.4;
      }
      void ctx;
  }},
  { kw: ['roller', 'conveyor', 'belt'], dur: 2.5, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'bl'), 'brown');
      lowpass(nz, SR, 400, 0.8);
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const e = Math.min(1, t / 0.3) * (t > ctx.dur - 0.4 ? (ctx.dur - t) / 0.4 : 1);
        out[i] += nz[i] * e;
      }
  }},
  { kw: ['ding', 'elevator'], dur: 1.5, render(out, ctx) { tone(out, 880, 0, 0.5, 0.4, 'sine'); tone(out, 1760, 0, 0.4, 0.2, 'sine'); void ctx; } },
  { kw: ['wrench', 'pneumatic', 'air'], dur: 0.8, render(out, ctx) {
      const nz = noiseBuf(out.length, mulberry(ctx.seed + 'pn'), 'white');
      highpass(nz, SR, 2000, 0.6);
      for (let i = 0; i < out.length; i++) out[i] += nz[i] * Math.exp(-i / SR / 0.15) * 0.6;
      modal(out, { f: 600, tau: 0.03, ratios: [1, 2.2], seed: ctx.seed + 'ratchet' }, 0.5);
  }},
];
function machineryDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('locomotive') || n.includes('chug')) return 3.0;
  if (n.includes('hum') || n.includes('transformer') || n.includes('conveyor')) return 3.0;
  if (n.includes('grind') || n.includes('gear') || n.includes('saw') || n.includes('whistle') || n.includes('steam')) return 2.0;
  if (n.includes('roller')) return 2.5;
  if (n.includes('elevator') || n.includes('ding')) return 1.5;
  if (n.includes('beep') || n.includes('reverse') || n.includes('forklift')) return 1.2;
  return 1.0;
}

function horrorDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('drone') || n.includes('dread') || n.includes('sub-bass')) return 3.0;
  if (n.includes('waterphone') || n.includes('screech')) return 2.2;
  if (n.includes('chains') || n.includes('meat hook') || n.includes('static')) return 2.0;
  if (n.includes('heartbeat')) return 2.0;
  if (n.includes('jumpscare')) return 1.2;
  if (n.includes('mirror') || n.includes('glass')) return 1.2;
  if (n.includes('creak') || n.includes('attic') || n.includes('bell')) return 1.5;
  return 1.2;
}

function footstepDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('footfall') || n.includes('stomp') || n.includes('trample')) return 0.5;
  if (n.includes('squelch') || n.includes('puddle') || n.includes('sand') || n.includes('grass') || n.includes('snow')) return 0.42;
  return 0.32;
}

function foleyDur(ctx) {
  const n = ctx.name.toLowerCase();
  if (n.includes('pour') || n.includes('decant')) return 2.0;
  if (n.includes('shatter') || n.includes('break') || n.includes('smash') || n.includes('crash') || n.includes('facade')) return 1.6;
  if (n.includes('footfall') || n.includes('stomp') || n.includes('trample')) return 0.5;
  return 0.35;
}

module.exports = { blast, blastDur, liquid, liquidDur, foley, foleyDur, MATERIALS, magic, magicDur, creature, creatureDur, ambient, ambientDur, ui, uiDur, machinery, machineryDur, horrorDur, footstepDur };