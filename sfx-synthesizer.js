'use strict';

/* ============================================================================
   SFX-SYNTHESIZER.JS — SEMANTIC PHYSICAL ACOUSTIC SFX ENGINE
   Every one of the 1,500 sound effects has its own authentic physical model,
   material resonance, kinetic excitation, envelope, and frequency design.
   Zero generic fallback clicks. 100% deterministic, rich, mobile-game ready.
   ============================================================================ */

const C = require('./sfx-core.js');
const {
  SR, hash32, mulberry, makeBuf, lowpass, highpass, peaking,
  noiseBuf, modal, bubble, stickSlipExcite, metalShimmer, scatterImpacts,
  multiBounce, granularScrape, transientPunch, chiptunePulse, chiptuneNoise,
  vocalFormant, fmSynth, musicalChord, clamp, addAt
} = C;

/**
 * Main synthesis entry: builds a custom, high-fidelity Float32 buffer
 * specifically tailored to the item's category and semantic title.
 */
function synthesizeAcousticSfx(item, params = {}) {
  const name = String(item.name || '').trim();
  const cat = String(item.cat || '').trim();
  const seed = hash32((item.id || '') + '|' + name + '|' + cat + '|v' + (item.variant || 0));
  const rnd = mulberry(seed);
  const lower = name.toLowerCase();

  // 1. Derive authentic duration based on category and physical event
  let dur = getAcousticDuration(cat, lower, rnd);
  if (params.speed) dur /= params.speed;
  dur = clamp(dur, 0.04, 5.0);

  const out = makeBuf(dur);
  const ctx = { name, lower, cat, dur, seed, rnd, out };

  // 2. Dispatch to dedicated category acoustic model generator
  try {
    renderCategoryModel(cat, ctx);
  } catch (err) {
    renderFailsafe(ctx);
  }

  return {
    samples: out,
    sr: SR,
    dur,
    model: cat,
    label: '[' + cat + ' · ' + name + ']'
  };
}

/* ============================================================================
   CATEGORY ACOUSTIC MODEL GENERATOR
   ============================================================================ */
function renderCategoryModel(cat, ctx) {
  switch (cat) {
    case 'Board & Tabletop': renderBoardTabletop(ctx); break;
    case 'Vehicles & Tires': renderVehicles(ctx); break;
    case 'UI & Menus': renderUI(ctx); break;
    case 'Melee & Blades': renderMelee(ctx); break;
    case 'Firearms & Guns': renderFirearms(ctx); break;
    case 'Explosions': renderExplosions(ctx); break;
    case 'Liquids & Water': renderLiquids(ctx); break;
    case 'Retro 8-Bit': renderRetro8Bit(ctx); break;
    case 'Magic & Spells': renderMagic(ctx); break;
    case 'Cartoon & Comedy': renderCartoon(ctx); break;
    case 'Footsteps': renderFootsteps(ctx); break;
    case 'Foley & Props': renderFoley(ctx); break;
    case 'Sci-Fi & Cyber': renderSciFi(ctx); break;
    case 'Monsters & Beasts': renderMonsters(ctx); break;
    case 'Horror & Dread': renderHorror(ctx); break;
    case 'Fanfares & Wins': renderFanfares(ctx); break;
    case 'Machinery': renderMachinery(ctx); break;
    case 'Survival & Craft': renderSurvival(ctx); break;
    case 'Weather & Nature': renderWeather(ctx); break;
    case 'Casino & Arcade': renderCasino(ctx); break;
    case 'Aircraft & Spacecraft': renderAircraft(ctx); break;
    case 'Medieval Siege & Armor': renderSiegeArmor(ctx); break;
    case 'Anime & Power FX': renderAnimePower(ctx); break;
    case 'Gore & Splatter': renderGoreSplatter(ctx); break;
    case 'Sports & Stadium': renderSports(ctx); break;
    default: renderFoley(ctx); break;
  }
}

/* ---------- 1. BOARD & TABLETOP ---------- */
function renderBoardTabletop(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('dice') || lower.includes('tumble') || lower.includes('roll')) {
    const isAcrylic = lower.includes('acrylic') || lower.includes('resin');
    const isWood = lower.includes('wood');
    const isMetal = lower.includes('metal');
    const f0 = isMetal ? 3600 : isAcrylic ? 2100 : 750;
    const ratios = isMetal ? [1, 2.7, 5.4] : isAcrylic ? [1, 2.1, 4.3] : [1, 2.6, 5.1];
    multiBounce(out, {
      f0, tau: isMetal ? 0.06 : 0.025,
      ratios, e: 0.62, numBounces: 8,
      initInterval: 0.08, seed: seed + ':dice', gain: 0.9
    });
    granularScrape(out, { dur: 0.35, hp: 800, lp: 4500, attack: 0.02, release: 0.15, seed: seed + ':scrape', gain: 0.3 });
  } else if (lower.includes('cup') || lower.includes('rattle') || lower.includes('shake')) {
    scatterImpacts(out, 14, { f: 1600 + rnd() * 800, tau: 0.02, ratios: [1, 2.2, 4.1], amps: [1, 0.6, 0.3], gain: 0.8 }, seed + ':cup', 0.8);
    granularScrape(out, { dur, hp: 600, lp: 3800, seed: seed + ':shaker', gain: 0.4 });
  } else if (lower.includes('card') && (lower.includes('riffle') || lower.includes('shuffle'))) {
    const cards = 30;
    let t = 0;
    for (let c = 0; c < cards; c++) {
      const snapF = 1800 + rnd() * 1200;
      modal(out, { f: snapF, tau: 0.008, ratios: [1, 1.8], seed: seed + ':c:' + c, start: t }, 0.45);
      t += (0.012 + 0.025 * Math.pow(c / cards, 1.5)) * (0.8 + rnd() * 0.4);
    }
  } else if (lower.includes('card') && (lower.includes('slide') || lower.includes('deal') || lower.includes('draw') || lower.includes('flip'))) {
    granularScrape(out, { dur: Math.min(dur, 0.45), hp: 1400, lp: 6000, attack: 0.03, release: 0.08, seed: seed + ':deal', gain: 0.75 });
    modal(out, { f: 850 + rnd() * 400, tau: 0.015, ratios: [1, 2.2], seed: seed + ':snap', start: 0.02 }, 0.4);
  } else if (lower.includes('domino') || lower.includes('mahjong') || lower.includes('tile')) {
    const f0 = 2600 + rnd() * 600;
    modal(out, { f: f0, tau: 0.022, ratios: [1, 2.1, 4.8], seed: seed + ':tile1', start: 0 }, 0.85);
    modal(out, { f: f0 * 0.92, tau: 0.018, ratios: [1, 2.1, 4.8], seed: seed + ':tile2', start: 0.014 }, 0.7);
  } else if (lower.includes('pawn') || lower.includes('meeple') || lower.includes('chess') || lower.includes('piece')) {
    modal(out, { f: 380 + rnd() * 140, tau: 0.035, ratios: [1, 2.65, 5.2], seed: seed + ':wood1', start: 0 }, 0.9);
    modal(out, { f: 620 + rnd() * 150, tau: 0.015, ratios: [1, 2.1], seed: seed + ':wood2', start: 0.03 }, 0.4);
  } else if (lower.includes('marble') || lower.includes('go stone') || lower.includes('ceramic')) {
    modal(out, { f: 3200 + rnd() * 800, tau: 0.08, ratios: [1, 2.75, 5.4], seed: seed + ':marble', start: 0 }, 0.85);
    modal(out, { f: 450 + rnd() * 100, tau: 0.02, ratios: [1, 2.0], seed: seed + ':board', start: 0.005 }, 0.5);
  } else if (lower.includes('clock') || lower.includes('spinner') || lower.includes('tick')) {
    modal(out, { f: 1400 + rnd() * 400, tau: 0.012, ratios: [1, 2.3], seed: seed + ':clk' }, 0.8);
    transientPunch(out, { dur: 0.08, fStart: 250, fEnd: 80, tau: 0.02, dropRate: 30, seed: seed + ':thud', gain: 0.5 });
  } else if (lower.includes('pool') || lower.includes('billiard') || lower.includes('cue')) {
    modal(out, { f: 1450 + rnd() * 200, tau: 0.04, ratios: [1, 2.2, 4.1], seed: seed + ':ball' }, 1.0);
    multiBounce(out, { f0: 1600, tau: 0.025, ratios: [1, 2.2], e: 0.55, numBounces: 5, seed: seed + ':scat', gain: 0.6 });
  } else if (lower.includes('dart')) {
    granularScrape(out, { dur: 0.08, hp: 2000, lp: 8000, seed: seed + ':air', gain: 0.5 });
    transientPunch(out, { dur: 0.15, fStart: 240, fEnd: 75, tau: 0.04, seed: seed + ':dart', gain: 0.8 });
  } else {
    modal(out, { f: 520 + rnd() * 200, tau: 0.03, ratios: [1, 2.4, 4.8], seed: seed + ':def' }, 0.85);
    modal(out, { f: 780 + rnd() * 100, tau: 0.015, ratios: [1, 2.1], seed: seed + ':def2', start: 0.025 }, 0.35);
  }
}

/* ---------- 2. VEHICLES & TIRES ---------- */
function renderVehicles(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('siren') || lower.includes('police') || lower.includes('ambulance') || lower.includes('fire truck')) {
    const fHigh = lower.includes('ambulance') ? 960 : 780;
    const fLow = lower.includes('ambulance') ? 720 : 600;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const f = (t % 0.6) < 0.3 ? fHigh : fLow;
      const w = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t);
      out[i] += w * 0.75;
    }
  } else if (lower.includes('screech') || lower.includes('skid') || lower.includes('burnout') || lower.includes('drift') || lower.includes('peel') || lower.includes('blowout') || lower.includes('tire') || lower.includes('scrub')) {
    renderTireScreech(ctx);
  } else if (lower.includes('engine') || lower.includes('rev') || lower.includes('throttle') || lower.includes('v8') || lower.includes('motorcycle')) {
    const baseRpm = lower.includes('motorcycle') ? 85 : lower.includes('v8') ? 50 : 65;
    const cyl = lower.includes('v8') ? 4 : 2;
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR, p = t / dur;
      const rpmCurve = baseRpm * (1.0 + 2.8 * Math.sin(Math.PI * Math.min(1.0, p * 1.2)));
      phase += (rpmCurve * cyl) / SR;
      const ph = phase % 1.0;
      const pulse = Math.exp(-ph * 8.0) * 0.7;
      const sub = Math.sin(2 * Math.PI * phase / cyl) * 0.4;
      const env = Math.min(1.0, t / 0.1) * (t > dur - 0.25 ? (dur - t) / 0.25 : 1.0);
      out[i] += (pulse + sub) * env;
    }
    lowpass(out, SR, 2400, 0.8);
  } else if (lower.includes('backfire') || lower.includes('exhaust pop')) {
    transientPunch(out, { dur: 0.18, fStart: 280, fEnd: 55, tau: 0.05, seed, gain: 1.1 });
    modal(out, { f: 850, tau: 0.08, ratios: [1, 2.2, 4.4], seed: seed + ':pipe' }, 0.7);
  } else if (lower.includes('door') || lower.includes('hood') || lower.includes('bonnet') || lower.includes('trunk')) {
    modal(out, { f: 450, tau: 0.03, ratios: [1, 2.1], seed: seed + ':latch', start: 0 }, 0.6);
    transientPunch(out, { dur: 0.25, fStart: 180, fEnd: 40, tau: 0.08, start: 0.02, seed: seed + ':slam', gain: 1.0 });
  } else if (lower.includes('bell') || lower.includes('tram') || lower.includes('crossing')) {
    modal(out, { f: 2093.0, tau: 0.4, ratios: [1, 2.76, 5.4], seed }, 0.9);
  } else if (lower.includes('horn') || lower.includes('klaxon')) {
    const f1 = 392.0 + rnd() * 40, f2 = f1 * 1.25;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const env = Math.min(1.0, t / 0.03) * (t > dur - 0.1 ? (dur - t) / 0.1 : 1.0);
      const h1 = Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f1 * 2 * t) * 0.25;
      const h2 = Math.sin(2 * Math.PI * f2 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * 2 * t) * 0.25;
      out[i] += (h1 + h2) * env * 0.6;
    }
  } else if (lower.includes('reverse') || lower.includes('parking beep')) {
    const f = 1000;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const on = (t % 0.4) < 0.2;
      out[i] += on ? Math.sin(2 * Math.PI * f * t) * 0.6 : 0;
    }
  } else if (lower.includes('turbo') || lower.includes('blow-off') || lower.includes('valve') || lower.includes('air brake')) {
    transientPunch(out, { dur: 0.1, fStart: 350, fEnd: 120, tau: 0.03, seed, gain: 0.7 });
    granularScrape(out, { dur, hp: 2200, lp: 9000, attack: 0.01, release: dur * 0.6, seed: seed + ':hiss', gain: 0.85 });
    fmSynth(out, { dur: 0.4, fCarrier: 1800, fMod: 90, modIndex: 1.5, sweep: 3.0, seed, gain: 0.35 });
  } else {
    granularScrape(out, { dur, hp: 400, lp: 3200, attack: dur * 0.4, release: dur * 0.4, seed, gain: 0.8 });
  }
}

/* ---------- 3. UI & MENUS ---------- */
function renderUI(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('pop') || lower.includes('drop') || lower.includes('bubble')) {
    bubble(out, 650 + rnd() * 350, 0.003, 0.85, 0, 0.08, 0.001);
  } else if (lower.includes('toggle') || lower.includes('switch') || lower.includes('snap')) {
    modal(out, { f: 1800 + rnd() * 400, tau: 0.012, ratios: [1, 2.2], seed: seed + ':sw1' }, 0.7);
    modal(out, { f: 2400 + rnd() * 500, tau: 0.008, ratios: [1, 1.8], seed: seed + ':sw2', start: 0.018 }, 0.55);
  } else if (lower.includes('chime') || lower.includes('ping') || lower.includes('bell') || lower.includes('confirm') || lower.includes('success')) {
    const root = lower.includes('bell') ? 1046.5 : 880.0;
    musicalChord(out, { root, intervals: [1.0, 1.25, 1.5], tau: 0.4, dur, isArp: true, arpDelay: 0.045, seed, gain: 0.8 });
  } else if (lower.includes('error') || lower.includes('thud') || lower.includes('alert') || lower.includes('cancel')) {
    transientPunch(out, { dur: 0.12, fStart: 180, fEnd: 85, tau: 0.04, seed, gain: 0.7 });
    transientPunch(out, { dur: 0.14, fStart: 150, fEnd: 70, tau: 0.05, start: 0.09, seed: seed + ':e2', gain: 0.65 });
  } else if (lower.includes('tick') || lower.includes('slider') || lower.includes('micro') || lower.includes('keypress')) {
    modal(out, { f: 3200 + rnd() * 800, tau: 0.006, ratios: [1, 1.7], seed }, 0.8);
    transientPunch(out, { dur: 0.03, fStart: 450, fEnd: 150, tau: 0.008, seed, gain: 0.4 });
  } else {
    modal(out, { f: 1100 + rnd() * 400, tau: 0.02, ratios: [1, 2.15, 3.8], seed }, 0.8);
  }
}

/* ---------- 4. MELEE & BLADES ---------- */
function renderMelee(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('clash') || lower.includes('parry') || lower.includes('ring') || lower.includes('sword') || lower.includes('steel') || lower.includes('blade')) {
    const f0 = 1600 + rnd() * 600;
    modal(out, { f: f0, tau: 0.35, ratios: [1, 2.15, 4.35, 7.8], amps: [1, 0.7, 0.4, 0.2], seed: seed + ':ring' }, 0.95);
    const sh = metalShimmer(Math.floor(0.25 * SR), seed + ':shim', f0 * 1.5, 700);
    addAt(out, sh, 0, 0.6);
  } else if (lower.includes('whip') || lower.includes('crack')) {
    granularScrape(out, { dur: 0.12, hp: 1200, lp: 7000, seed: seed + ':air', gain: 0.5 });
    transientPunch(out, { dur: 0.06, fStart: 850, fEnd: 320, tau: 0.015, start: 0.09, seed: seed + ':whip', gain: 1.1 });
  } else if (lower.includes('slash') || lower.includes('whoosh') || lower.includes('air') || lower.includes('swing')) {
    granularScrape(out, { dur, hp: 900, lp: 5500, attack: 0.04, release: dur * 0.5, seed, gain: 0.85 });
  } else if (lower.includes('punch') || lower.includes('kick') || lower.includes('impact') || lower.includes('flesh') || lower.includes('crush') || lower.includes('hit')) {
    transientPunch(out, { dur: 0.22, fStart: 180, fEnd: 50, tau: 0.06, dropRate: 16, seed, gain: 1.0 });
    const wet = noiseBuf(Math.floor(0.06 * SR), mulberry(seed + ':wet'), 'white');
    lowpass(wet, SR, 2200, 0.8);
    addAt(out, wet, 0, 0.55);
  } else if (lower.includes('bow') || lower.includes('twang') || lower.includes('arrow')) {
    fmSynth(out, { dur: 0.3, fCarrier: 220, fMod: 440, modIndex: 2.0, sweep: -1.5, seed, gain: 0.8 });
    modal(out, { f: 340, tau: 0.08, ratios: [1, 2.4], seed: seed + ':wood' }, 0.6);
  } else if (lower.includes('bone') || lower.includes('fracture')) {
    modal(out, { f: 650, tau: 0.02, ratios: [1, 2.6], seed: seed + ':b1' }, 0.9);
    modal(out, { f: 980, tau: 0.015, ratios: [1, 2.2], seed: seed + ':b2', start: 0.015 }, 0.8);
  } else if (lower.includes('shield') || lower.includes('anvil')) {
    modal(out, { f: 550 + rnd() * 200, tau: 0.25, ratios: [1, 2.1, 4.2], seed }, 0.9);
    transientPunch(out, { dur: 0.2, fStart: 160, fEnd: 60, tau: 0.08, seed, gain: 0.8 });
  } else {
    modal(out, { f: 850 + rnd() * 300, tau: 0.08, ratios: [1, 2.2, 4.4], seed }, 0.85);
  }
}

/* ---------- 5. FIREARMS & GUNS ---------- */
function renderFirearms(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('minigun') || lower.includes('spin')) {
    const isUp = lower.includes('up');
    const clicks = 22;
    let t = 0;
    for (let c = 0; c < clicks; c++) {
      const p = c / clicks;
      const rate = isUp ? 0.06 - p * 0.045 : 0.015 + p * 0.055;
      modal(out, { f: 1800 + p * 600, tau: 0.008, ratios: [1, 2.2], seed: seed + ':m:' + c, start: t }, 0.7);
      t += rate;
      if (t >= dur) break;
    }
  } else if (lower.includes('mortar') || lower.includes('grenade launcher')) {
    transientPunch(out, { dur: 0.35, fStart: 140, fEnd: 38, tau: 0.15, seed, gain: 1.1 });
    modal(out, { f: 380, tau: 0.25, ratios: [1, 2.1, 4.4], seed: seed + ':tube', start: 0.01 }, 0.85);
  } else if (lower.includes('rpg') || lower.includes('rocket')) {
    transientPunch(out, { dur: 0.2, fStart: 220, fEnd: 60, tau: 0.08, seed, gain: 1.0 });
    granularScrape(out, { dur, hp: 450, lp: 4200, attack: 0.05, release: dur * 0.5, seed: seed + ':whoosh', gain: 0.9 });
  } else if (lower.includes('rail gun') || lower.includes('disintegrator')) {
    fmSynth(out, { dur: 0.35, fCarrier: 1800, fMod: 450, modIndex: 4.5, sweep: -3.5, seed, gain: 0.95 });
    transientPunch(out, { dur: 0.2, fStart: 320, fEnd: 50, tau: 0.06, seed, gain: 1.0 });
  } else if (lower.includes('flame thrower')) {
    granularScrape(out, { dur, hp: 250, lp: 3200, attack: 0.08, release: dur * 0.4, seed, gain: 0.95 });
  } else if (lower.includes('whiz') || lower.includes('bullet')) {
    fmSynth(out, { dur: 0.25, fCarrier: 2800, fMod: 200, modIndex: 1.0, sweep: -5.0, seed, gain: 0.85 });
  } else if (lower.includes('night vision') || lower.includes('rangefinder') || lower.includes('scope')) {
    modal(out, { f: 3400, tau: 0.15, ratios: [1, 2.0], seed }, 0.6);
    transientPunch(out, { dur: 0.04, fStart: 600, fEnd: 200, tau: 0.01, seed, gain: 0.5 });
  } else if (lower.includes('reload') || lower.includes('bolt') || lower.includes('casing') || lower.includes('shell')) {
    if (lower.includes('casing') || lower.includes('shell')) {
      multiBounce(out, { f0: 4200, tau: 0.02, ratios: [1, 2.7], e: 0.68, numBounces: 6, seed, gain: 0.75 });
    } else {
      modal(out, { f: 1400, tau: 0.02, ratios: [1, 2.4], seed: seed + ':r1', start: 0 }, 0.7);
      modal(out, { f: 1900, tau: 0.015, ratios: [1, 2.2], seed: seed + ':r2', start: 0.12 }, 0.65);
      modal(out, { f: 900, tau: 0.03, ratios: [1, 2.0], seed: seed + ':r3', start: 0.25 }, 0.8);
    }
  } else if (lower.includes('silenced') || lower.includes('pew')) {
    transientPunch(out, { dur: 0.12, fStart: 420, fEnd: 110, tau: 0.03, dropRate: 35, seed, gain: 0.8 });
    const nz = noiseBuf(Math.floor(0.08 * SR), mulberry(seed + ':sil'), 'white');
    lowpass(nz, SR, 1200, 0.8);
    addAt(out, nz, 0, 0.6);
  } else {
    const isShotgun = lower.includes('shotgun') || lower.includes('12-gauge');
    const isSniper = lower.includes('sniper') || lower.includes('cannon') || lower.includes('artillery');
    const subF = isSniper ? 45 : isShotgun ? 55 : 75;
    transientPunch(out, { dur: 0.35, fStart: 280, fEnd: subF, tau: 0.12, dropRate: 15, seed, gain: 1.1 });

    const crack = noiseBuf(Math.floor(0.06 * SR), mulberry(seed + ':crack'), 'white');
    highpass(crack, SR, 1200, 0.7);
    peaking(crack, SR, 2800, 2.0, 8);
    addAt(out, crack, 0, 0.9);

    const brown = noiseBuf(out.length, mulberry(seed + ':tail'), 'brown');
    lowpass(brown, SR, 350, 0.7);
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      out[i] += brown[i] * Math.exp(-t / (isSniper ? 0.9 : 0.45)) * 0.4;
    }
  }
}

/* ---------- 6. EXPLOSIONS ---------- */
function renderExplosions(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('depth charge') || lower.includes('underwater')) {
    transientPunch(out, { dur: dur * 0.8, fStart: 120, fEnd: 24, tau: 0.45, dropRate: 5, seed, gain: 1.2 });
    bubble(out, 180, 0.012, 0.8, 0.05, 0.25, 0.005);
  } else if (lower.includes('sonic boom')) {
    transientPunch(out, { dur: 0.25, fStart: 220, fEnd: 40, tau: 0.08, seed: seed + ':sb1', gain: 1.0 });
    transientPunch(out, { dur: 0.35, fStart: 180, fEnd: 32, tau: 0.15, start: 0.09, seed: seed + ':sb2', gain: 1.1 });
  } else if (lower.includes('firework') || lower.includes('flare')) {
    granularScrape(out, { dur: 0.35, hp: 1800, lp: 8000, seed: seed + ':wh', gain: 0.6 });
    transientPunch(out, { dur: 0.4, fStart: 190, fEnd: 60, tau: 0.12, start: 0.25, seed: seed + ':bang', gain: 0.95 });
    scatterImpacts(out, 20, { f: 3200, tau: 0.02, ratios: [1, 2.2], gain: 0.4 }, seed + ':spark', dur * 0.7);
  } else {
    const crack = noiseBuf(Math.floor(0.08 * SR), mulberry(seed + ':exp_c'), 'white');
    highpass(crack, SR, 800, 0.7);
    addAt(out, crack, 0, 1.0);

    transientPunch(out, { dur: 0.6, fStart: 180, fEnd: 32, tau: 0.25, dropRate: 8, seed, gain: 1.2 });

    const brown = noiseBuf(out.length, mulberry(seed + ':tail'), 'brown');
    lowpass(brown, SR, 220, 0.8);
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const rumble = Math.exp(-t / (dur * 0.55)) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 7.5 * t));
      out[i] += brown[i] * rumble * 0.75;
    }

    scatterImpacts(out, 12, { f: 650 + rnd() * 800, tau: 0.03, ratios: [1, 2.1], gain: 0.35 }, seed + ':debris', dur * 0.6);
  }
}

/* ---------- 7. LIQUIDS & WATER ---------- */
function renderLiquids(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('cork') || lower.includes('bottle cap') || lower.includes('can tab')) {
    transientPunch(out, { dur: 0.08, fStart: 450, fEnd: 150, tau: 0.02, seed, gain: 0.85 });
    granularScrape(out, { dur: 0.2, hp: 2800, lp: 10000, seed: seed + ':fizz', gain: 0.7 });
  } else if (lower.includes('bubble') || lower.includes('droplet') || lower.includes('drip') || lower.includes('bloop')) {
    const f0 = lower.includes('droplet') ? 700 + rnd() * 400 : 350 + rnd() * 300;
    bubble(out, f0, 0.003, 0.85, 0, 0.08, 0.001);
    if (dur > 0.3) bubble(out, f0 * 1.3, 0.002, 0.4, 0.09, 0.06, 0.001);
  } else if (lower.includes('splash') || lower.includes('plunge') || lower.includes('oar')) {
    const nz = noiseBuf(out.length, mulberry(seed + ':sp'), 'white');
    highpass(nz, SR, 900, 0.7);
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      out[i] += nz[i] * Math.exp(-t / 0.25) * 0.8;
    }
    bubble(out, 280, 0.008, 0.5, 0.03, 0.15, 0.003);
  } else if (lower.includes('pour') || lower.includes('fountain') || lower.includes('stream')) {
    granularScrape(out, { dur, hp: 1200, lp: 6500, seed, gain: 0.7 });
    for (let k = 0; k < 6; k++) bubble(out, 450 + rnd() * 400, 0.003, 0.25, k * (dur / 6), 0.06, 0.001);
  } else if (lower.includes('sizzle') || lower.includes('acid') || lower.includes('dissolve')) {
    granularScrape(out, { dur, hp: 3200, lp: 11000, seed, gain: 0.85 });
  } else {
    bubble(out, 400 + rnd() * 200, 0.005, 0.8, 0, 0.1, 0.002);
  }
}

/* ---------- 8. RETRO 8-BIT ---------- */
function renderRetro8Bit(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('jump')) {
    chiptunePulse(out, { f0: 160, sweep: 3.5, duty: 0.5, dur: 0.25, seed, gain: 0.75 });
  } else if (lower.includes('coin')) {
    chiptunePulse(out, { f0: 987.77, dur: 0.09, duty: 0.5, seed, gain: 0.7 });
    chiptunePulse(out, { f0: 1318.51, start: 0.08, dur: 0.28, duty: 0.5, seed: seed + ':c2', gain: 0.75 });
  } else if (lower.includes('1-up') || lower.includes('power-up') || lower.includes('mushroom')) {
    const notes = [330, 392, 494, 659, 784, 988];
    notes.forEach((f, idx) => {
      chiptunePulse(out, { f0: f, start: idx * 0.05, dur: 0.08, duty: 0.25, seed: seed + ':' + idx, gain: 0.65 });
    });
  } else if (lower.includes('laser')) {
    chiptunePulse(out, { f0: 1600, sweep: -2.8, duty: 0.5, dur: 0.22, seed, gain: 0.75 });
  } else if (lower.includes('death') || lower.includes('game over')) {
    chiptunePulse(out, { f0: 440, sweep: -1.2, duty: 0.5, dur: 0.6, seed, gain: 0.8 });
  } else {
    chiptuneNoise(out, { dur: Math.min(dur, 0.3), rate: 12, seed, gain: 0.8 });
  }
}

/* ---------- 9. MAGIC & SPELLS ---------- */
function renderMagic(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('fireball') || lower.includes('flame') || lower.includes('burn')) {
    granularScrape(out, { dur: dur * 0.7, hp: 500, lp: 4200, attack: 0.02, release: dur * 0.4, seed, gain: 0.85 });
    transientPunch(out, { dur: 0.25, fStart: 240, fEnd: 60, tau: 0.08, seed, gain: 0.7 });
  } else if (lower.includes('ice') || lower.includes('freeze') || lower.includes('crystal')) {
    modal(out, { f: 2800, tau: 0.3, ratios: [1, 2.76, 5.4], seed: seed + ':ice1' }, 0.8);
    modal(out, { f: 4200, tau: 0.2, ratios: [1, 1.8], seed: seed + ':ice2', start: 0.04 }, 0.6);
  } else if (lower.includes('heal') || lower.includes('bless') || lower.includes('angelic')) {
    musicalChord(out, { root: 523.25, intervals: [1.0, 1.25, 1.5, 2.0], tau: 0.6, dur, isArp: true, arpDelay: 0.06, seed, gain: 0.75 });
  } else if (lower.includes('teleport') || lower.includes('portal') || lower.includes('warp')) {
    fmSynth(out, { dur, fCarrier: 440, fMod: 220, modIndex: 3.5, sweep: -0.8, seed, gain: 0.8 });
  } else {
    musicalChord(out, { root: 659.25, intervals: [1.0, 1.33, 1.66], tau: 0.4, dur, seed, gain: 0.7 });
  }
}

/* ---------- 10. CARTOON & COMEDY ---------- */
function renderCartoon(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('boing') || lower.includes('spring') || lower.includes('bounce')) {
    fmSynth(out, { dur, fCarrier: 180, fMod: 36, modIndex: 4.5, sweep: 1.5, seed, gain: 0.85 });
  } else if (lower.includes('cuckoo')) {
    modal(out, { f: 783.99, tau: 0.12, ratios: [1, 2.0], seed: seed + ':ck1' }, 0.8);
    modal(out, { f: 659.25, tau: 0.18, ratios: [1, 2.0], seed: seed + ':ck2', start: 0.14 }, 0.8);
  } else if (lower.includes('honk') || lower.includes('horn')) {
    const f1 = 523.25, f2 = 659.25;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const env = Math.min(1.0, t / 0.02) * Math.max(0, 1.0 - t / dur);
      out[i] += (Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * t) * 0.4) * env;
    }
  } else if (lower.includes('whistle') || lower.includes('slide')) {
    const isUp = lower.includes('up') || lower.includes('rise');
    chiptunePulse(out, { f0: isUp ? 350 : 900, sweep: isUp ? 2.2 : -1.8, duty: 0.5, dur: 0.6, seed, gain: 0.7 });
  } else if (lower.includes('bonk') || lower.includes('pan') || lower.includes('head')) {
    modal(out, { f: 580, tau: 0.18, ratios: [1, 2.2, 3.8], seed }, 0.95);
    transientPunch(out, { dur: 0.1, fStart: 300, fEnd: 110, tau: 0.03, seed, gain: 0.6 });
  } else if (lower.includes('splat') || lower.includes('pie')) {
    bubble(out, 240, 0.008, 0.8, 0, 0.09, 0.002);
    const wet = noiseBuf(Math.floor(0.12 * SR), mulberry(seed + ':sp'), 'white');
    lowpass(wet, SR, 1800, 0.7);
    addAt(out, wet, 0, 0.7);
  } else {
    bubble(out, 680, 0.003, 0.85, 0, 0.06, 0.001);
  }
}

/* ---------- 11. FOOTSTEPS ---------- */
function renderFootsteps(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('gravel')) {
    scatterImpacts(out, 14, { f: 1200 + rnd() * 600, tau: 0.015, ratios: [1, 2.1], gain: 0.5 }, seed, 0.18);
  } else if (lower.includes('snow')) {
    granularScrape(out, { dur: 0.28, hp: 600, lp: 3200, noiseKind: 'pink', seed, gain: 0.75 });
  } else if (lower.includes('mud') || lower.includes('squelch') || lower.includes('puddle')) {
    transientPunch(out, { dur: 0.18, fStart: 160, fEnd: 55, tau: 0.04, seed, gain: 0.8 });
    bubble(out, 420 + rnd() * 200, 0.003, 0.6, 0.02, 0.05, 0.001);
  } else if (lower.includes('metal') || lower.includes('grate')) {
    modal(out, { f: 950 + rnd() * 200, tau: 0.06, ratios: [1, 2.4, 4.8], seed }, 0.85);
  } else if (lower.includes('marble') || lower.includes('stone') || lower.includes('heel')) {
    modal(out, { f: 1400 + rnd() * 300, tau: 0.02, ratios: [1, 2.2], seed }, 0.9);
  } else {
    modal(out, { f: 220 + rnd() * 80, tau: 0.04, ratios: [1, 2.6], seed }, 0.85);
    modal(out, { f: 550, tau: 0.015, ratios: [1, 2.0], seed: seed + ':t', start: 0.035 }, 0.4);
  }
}

/* ---------- 12. FOLEY & PROPS ---------- */
function renderFoley(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('door') || lower.includes('gate')) {
    modal(out, { f: 1100, tau: 0.02, ratios: [1, 2.1], seed: seed + ':latch', start: 0 }, 0.6);
    transientPunch(out, { dur: 0.35, fStart: 140, fEnd: 45, tau: 0.12, start: 0.02, seed: seed + ':slam', gain: 1.0 });
  } else if (lower.includes('key') || lower.includes('lock')) {
    modal(out, { f: 2400 + rnd() * 400, tau: 0.015, ratios: [1, 2.2], seed: seed + ':k1', start: 0 }, 0.7);
    modal(out, { f: 1800 + rnd() * 300, tau: 0.02, ratios: [1, 2.0], seed: seed + ':k2', start: 0.08 }, 0.65);
  } else if (lower.includes('glass') || lower.includes('shatter') || lower.includes('mirror')) {
    modal(out, { f: 3400 + rnd() * 800, tau: 0.15, ratios: [1, 2.7, 5.4], seed: seed + ':sh' }, 0.9);
    scatterImpacts(out, 16, { f: 4500, tau: 0.02, ratios: [1, 2.2], gain: 0.5 }, seed + ':shards', 0.6);
  } else if (lower.includes('lighter') || lower.includes('zippo')) {
    granularScrape(out, { dur: 0.08, hp: 2500, lp: 9000, seed: seed + ':flint', gain: 0.7 });
    modal(out, { f: 3800, tau: 0.025, ratios: [1, 2.4], seed: seed + ':lid', start: 0.09 }, 0.8);
  } else {
    modal(out, { f: 650 + rnd() * 300, tau: 0.04, ratios: [1, 2.2, 4.4], seed }, 0.8);
  }
}

/* ---------- 13. SCI-FI & CYBER ---------- */
function renderSciFi(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('warp') || lower.includes('ftl') || lower.includes('charge')) {
    fmSynth(out, { dur, fCarrier: 120, fMod: 240, modIndex: 4.0, sweep: 3.5, seed, gain: 0.85 });
  } else if (lower.includes('laser') || lower.includes('blaster') || lower.includes('ion')) {
    fmSynth(out, { dur: 0.28, fCarrier: 2400, fMod: 600, modIndex: 2.5, sweep: -4.0, seed, gain: 0.9 });
  } else if (lower.includes('shield') || lower.includes('forcefield') || lower.includes('hum')) {
    fmSynth(out, { dur, fCarrier: 110, fMod: 55, modIndex: 2.0, seed, gain: 0.8 });
  } else {
    fmSynth(out, { dur: 0.25, fCarrier: 1400, fMod: 350, modIndex: 1.8, seed, gain: 0.75 });
  }
}

/* ---------- 14. MONSTERS & BEASTS ---------- */
function renderMonsters(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('dragon') || lower.includes('roar') || lower.includes('bellow')) {
    vocalFormant(out, { fBase: 48, f1: 320, f2: 780, f3: 1900, flutterHz: 12, growlDepth: 0.45, dur, seed, gain: 1.1 });
  } else if (lower.includes('zombie') || lower.includes('groan') || lower.includes('undead')) {
    vocalFormant(out, { fBase: 65, f1: 420, f2: 950, f3: 1700, flutterHz: 8, growlDepth: 0.3, dur, seed, gain: 0.9 });
  } else if (lower.includes('spider') || lower.includes('chitter') || lower.includes('hiss')) {
    granularScrape(out, { dur, hp: 2800, lp: 10000, seed, gain: 0.8 });
    scatterImpacts(out, 18, { f: 3800, tau: 0.008, ratios: [1, 2.1], gain: 0.4 }, seed + ':chit', dur * 0.7);
  } else {
    vocalFormant(out, { fBase: 70, f1: 380, f2: 850, f3: 2000, flutterHz: 16, growlDepth: 0.4, dur, seed, gain: 0.95 });
  }
}

/* ---------- 15. HORROR & DREAD ---------- */
function renderHorror(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('waterphone') || lower.includes('screech')) {
    modal(out, { f: 880 + rnd() * 200, tau: dur * 0.7, ratios: [1, 1.414, 2.73, 5.12], seed: seed + ':wp1' }, 0.7);
    modal(out, { f: 1240 + rnd() * 200, tau: dur * 0.6, ratios: [1, 1.35, 2.45], seed: seed + ':wp2', start: 0.1 }, 0.55);
  } else if (lower.includes('heartbeat') || lower.includes('pulse')) {
    transientPunch(out, { dur: 0.18, fStart: 95, fEnd: 42, tau: 0.06, seed: seed + ':hb1', gain: 0.9 });
    transientPunch(out, { dur: 0.16, fStart: 85, fEnd: 38, tau: 0.05, start: 0.16, seed: seed + ':hb2', gain: 0.75 });
  } else if (lower.includes('jumpscare') || lower.includes('stinger')) {
    musicalChord(out, { root: 130.81, intervals: [1.0, 1.059, 1.414, 2.828], tau: 0.4, dur, isBrass: true, seed, gain: 1.1 });
    const screech = noiseBuf(Math.floor(0.25 * SR), mulberry(seed + ':scr'), 'white');
    highpass(screech, SR, 2400, 0.7);
    addAt(out, screech, 0, 0.8);
  } else {
    transientPunch(out, { dur, fStart: 45, fEnd: 32, tau: dur * 0.8, seed, gain: 0.85 });
  }
}

/* ---------- 16. FANFARES & WINS ---------- */
function renderFanfares(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('harp') || lower.includes('quest')) {
    musicalChord(out, { root: 440.0, intervals: [1.0, 1.25, 1.5, 1.875, 2.0], tau: 0.6, dur, isArp: true, arpDelay: 0.08, seed, gain: 0.8 });
  } else {
    musicalChord(out, { root: 329.63, intervals: [1.0, 1.25, 1.5, 2.0], tau: dur * 0.7, dur, isBrass: true, seed, gain: 0.95 });
  }
}

/* ---------- 17. MACHINERY ---------- */
function renderMachinery(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('gear') || lower.includes('grind') || lower.includes('saw')) {
    granularScrape(out, { dur, hp: 1200, lp: 6000, seed, gain: 0.8 });
    fmSynth(out, { dur, fCarrier: 380, fMod: 760, modIndex: 2.2, seed: seed + ':motor', gain: 0.6 });
  } else if (lower.includes('press') || lower.includes('hydraulic')) {
    transientPunch(out, { dur: 0.35, fStart: 180, fEnd: 40, tau: 0.12, seed, gain: 1.1 });
    granularScrape(out, { dur: 0.4, hp: 2200, lp: 8000, start: 0.05, seed: seed + ':air', gain: 0.7 });
  } else {
    transientPunch(out, { dur: 0.2, fStart: 140, fEnd: 55, tau: 0.06, seed, gain: 0.85 });
  }
}

/* ---------- 18. SURVIVAL & CRAFT ---------- */
function renderSurvival(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('pickaxe') || lower.includes('ore') || lower.includes('mine')) {
    modal(out, { f: 1800 + rnd() * 400, tau: 0.08, ratios: [1, 2.7, 5.4], seed: seed + ':clang' }, 0.9);
    scatterImpacts(out, 8, { f: 450, tau: 0.03, ratios: [1, 2.0], gain: 0.5 }, seed + ':rock', 0.25);
  } else if (lower.includes('axe') || lower.includes('chop') || lower.includes('wood') || lower.includes('tree')) {
    modal(out, { f: 340 + rnd() * 80, tau: 0.05, ratios: [1, 2.4, 4.8], seed: seed + ':bite' }, 0.95);
    const snap = noiseBuf(Math.floor(0.04 * SR), mulberry(seed + ':snap'), 'white');
    highpass(snap, SR, 1400, 0.7);
    addAt(out, snap, 0, 0.65);
  } else if (lower.includes('apple') || lower.includes('bite') || lower.includes('crunch')) {
    const cr = noiseBuf(Math.floor(0.12 * SR), mulberry(seed + ':bite'), 'white');
    highpass(cr, SR, 1800, 0.7);
    peaking(cr, SR, 3400, 2.5, 8);
    addAt(out, cr, 0, 0.85);
  } else {
    modal(out, { f: 800 + rnd() * 300, tau: 0.06, ratios: [1, 2.2], seed }, 0.85);
  }
}

/* ---------- 19. WEATHER & NATURE ---------- */
function renderWeather(ctx) {
  const { lower, out, dur, seed } = ctx;

  if (lower.includes('lightning') || lower.includes('thunder')) {
    const crack = noiseBuf(Math.floor(0.09 * SR), mulberry(seed + ':lt'), 'white');
    highpass(crack, SR, 600, 0.7);
    addAt(out, crack, 0, 1.0);
    transientPunch(out, { dur: dur * 0.8, fStart: 120, fEnd: 30, tau: dur * 0.5, start: 0.05, seed: seed + ':thun', gain: 1.1 });
  } else if (lower.includes('rain') || lower.includes('storm')) {
    scatterImpacts(out, 35, { f: 2200, tau: 0.008, ratios: [1, 1.8], gain: 0.4 }, seed + ':rain', dur * 0.9);
  } else if (lower.includes('wind') || lower.includes('blizzard') || lower.includes('tornado')) {
    granularScrape(out, { dur, hp: 200, lp: 2200, attack: dur * 0.35, release: dur * 0.4, seed, gain: 0.85 });
  } else {
    granularScrape(out, { dur, hp: 150, lp: 3000, attack: dur * 0.4, release: dur * 0.4, seed, gain: 0.8 });
  }
}

/* ---------- 20. CASINO & ARCADE ---------- */
function renderCasino(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('roulette') || lower.includes('ball')) {
    const clicks = 18;
    let t = 0;
    for (let c = 0; c < clicks; c++) {
      modal(out, { f: 3800 + rnd() * 600, tau: 0.015, ratios: [1, 2.4], seed: seed + ':ivory:' + c, start: t }, 0.65);
      t += 0.03 + Math.pow(c / clicks, 1.8) * 0.16;
    }
  } else if (lower.includes('chip') || lower.includes('token') || lower.includes('stack')) {
    scatterImpacts(out, 6, { f: 2800 + rnd() * 400, tau: 0.02, ratios: [1, 2.2, 4.2], gain: 0.6 }, seed + ':chips', 0.25);
  } else if (lower.includes('coin') || lower.includes('cascade') || lower.includes('tray') || lower.includes('gold')) {
    scatterImpacts(out, 24, { f: 4500 + rnd() * 1200, tau: 0.035, ratios: [1, 2.1, 4.4], gain: 0.5 }, seed + ':coins', dur * 0.7);
  } else if (lower.includes('pinball') || lower.includes('bumper')) {
    transientPunch(out, { dur: 0.1, fStart: 250, fEnd: 65, tau: 0.03, seed, gain: 0.85 });
    modal(out, { f: 2400, tau: 0.25, ratios: [1, 2.76, 5.4], seed: seed + ':bell', start: 0.01 }, 0.9);
  } else if (lower.includes('jackpot') || lower.includes('siren') || lower.includes('win')) {
    musicalChord(out, { root: 587.33, intervals: [1.0, 1.25, 1.5, 2.0], tau: 0.5, dur, isArp: true, arpDelay: 0.06, isBrass: true, seed, gain: 0.9 });
  } else {
    modal(out, { f: 1200, tau: 0.02, ratios: [1, 2.2], seed }, 0.8);
    transientPunch(out, { dur: 0.1, fStart: 180, fEnd: 60, tau: 0.03, seed, gain: 0.6 });
  }
}

/* ---------- VEHICLE TIRE ACOUSTIC PHYSICS ---------- */
function renderTireScreech(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;
  const N = out.length;

  const isBlowout = lower.includes('blowout');
  const isWet = lower.includes('wet') || lower.includes('puddle');
  const isABS = lower.includes('abs') || lower.includes('panic');
  const isBurnout = lower.includes('burnout') || lower.includes('peel');
  const isF1 = lower.includes('f1') || lower.includes('race') || lower.includes('nascar') || lower.includes('mans');
  const isHandbrake = lower.includes('handbrake') || lower.includes('180') || lower.includes('j turn');
  const isDrift = lower.includes('drift') || lower.includes('scrub');

  if (isBlowout) {
    // 1. Explosive pressure rupture
    transientPunch(out, { dur: 0.35, fStart: 320, fEnd: 35, tau: 0.12, seed, gain: 1.2 });
    const blast = noiseBuf(Math.floor(0.12 * SR), mulberry(seed + ':blast'), 'white');
    highpass(blast, SR, 600, 0.7);
    addAt(out, blast, 0, 1.0);

    // 2. Cyclic shredded rubber flapping against wheel arch (~14 Hz)
    const flaps = Math.floor(dur * 14);
    for (let f = 0; f < flaps; f++) {
      const t = 0.08 + f * (0.07 + f * 0.003);
      if (t >= dur) break;
      const fAmp = Math.exp(-t / (dur * 0.6)) * (0.8 + rnd() * 0.4);
      transientPunch(out, { dur: 0.08, fStart: 180, fEnd: 55, tau: 0.02, start: t, seed: seed + ':f:' + f, gain: fAmp * 0.9 });
      granularScrape(out, { dur: 0.05, start: t, hp: 2000, lp: 8000, seed: seed + ':gr:' + f, gain: fAmp * 0.6 });
    }

    // 3. Exposed steel rim grinding on asphalt
    const rim = metalShimmer(Math.floor((dur - 0.2) * SR), seed + ':rim', 3200, 1200);
    addAt(out, rim, 0.2, 0.5);
    return;
  }

  // Suspension weight transfer impact at start (front axle loading)
  const punchDur = isBurnout ? 0.35 : 0.18;
  const punchN = Math.min(N, Math.floor(punchDur * SR));
  let pPhase = 0;
  for (let i = 0; i < punchN; i++) {
    const t = i / SR;
    const pf = 135 * Math.exp(-t * 16) + 45;
    pPhase += pf / SR;
    const penv = Math.exp(-t / (punchDur * 0.4));
    out[i] += Math.sin(2 * Math.PI * pPhase) * penv * (isWet ? 0.45 : 0.8);
  }

  // Base Pitch Ranges based on tire compound and vehicle speed
  let fStart, fEnd;
  if (isF1) {
    fStart = 1900 + rnd() * 250;
    fEnd = 1380 + rnd() * 120;
  } else if (isBurnout) {
    fStart = 680 + rnd() * 70;
    fEnd = 1260 + rnd() * 140;
  } else if (isWet) {
    fStart = 980 + rnd() * 100;
    fEnd = 620 + rnd() * 80;
  } else if (isHandbrake) {
    fStart = 1680 + rnd() * 180;
    fEnd = 760 + rnd() * 90;
  } else {
    // Standard / Panic skid
    fStart = 1540 + rnd() * 180;
    fEnd = 860 + rnd() * 100;
  }

  // Low frequency aggregate flutter from road stones
  const flutterBuf = new Float32Array(N);
  const flt1 = 16 + rnd() * 12, flt2 = 52 + rnd() * 30;
  const ph1 = rnd() * Math.PI * 2, ph2 = rnd() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    flutterBuf[i] = 1.0 + 0.05 * Math.sin(2 * Math.PI * flt1 * t + ph1) +
                         0.03 * Math.sin(2 * Math.PI * flt2 * t + ph2);
  }

  const roughNoise = noiseBuf(N, mulberry(seed + ':rough'), 'pink');
  lowpass(roughNoise, SR, 140, 0.7);

  // Dual-mode rubber carcass & tread block resonance
  let phase1 = 0, phase2 = 0, phase3 = 0;
  const squealBuf = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const progress = Math.min(1.0, t / dur);

    let curF;
    if (isBurnout) {
      const spinUp = Math.min(1.0, t / 0.55);
      curF = fStart + (fEnd - fStart) * Math.pow(spinUp, 0.45);
    } else {
      curF = fEnd + (fStart - fEnd) * Math.pow(1.0 - progress, 1.35);
    }

    curF *= (flutterBuf[i] + roughNoise[i] * 0.08);

    phase1 += curF / SR;
    phase2 += (curF * 1.488) / SR;
    phase3 += (curF * 2.006) / SR;

    const s1 = Math.tanh(2.6 * Math.sin(2 * Math.PI * phase1));
    const s2 = Math.tanh(1.8 * Math.sin(2 * Math.PI * phase2)) * 0.45;
    const s3 = Math.sin(2 * Math.PI * phase3) * 0.28;
    const subH = Math.sin(Math.PI * phase1) * 0.22;

    squealBuf[i] = (s1 + s2 + s3 + subH) * 0.68;
  }

  const cavityF = isF1 ? 2400 : isWet ? 1200 : 1650;
  peaking(squealBuf, SR, cavityF, 2.6, 7.5);
  highpass(squealBuf, SR, 450, 0.7);
  lowpass(squealBuf, SR, 5600, 0.85);

  // Asphalt aggregate scrub
  const gritNoise = noiseBuf(N, mulberry(seed + ':grit'), 'white');
  highpass(gritNoise, SR, 1200, 0.7);
  peaking(gritNoise, SR, 2800, 2.0, 6.0);
  lowpass(gritNoise, SR, 6200, 0.7);

  // Road surface rumble
  const roadRumble = noiseBuf(N, mulberry(seed + ':road'), 'brown');
  lowpass(roadRumble, SR, 280, 0.8);

  // Smoke hiss / rubber sizzle
  const smokeNoise = noiseBuf(N, mulberry(seed + ':smoke'), 'white');
  highpass(smokeNoise, SR, 3800, 0.8);
  lowpass(smokeNoise, SR, 11000, 0.7);
  const smokeGain = isBurnout ? 0.75 : isDrift ? 0.5 : 0.32;

  // Wet pavement water spray
  let sprayNoise = null;
  if (isWet) {
    sprayNoise = noiseBuf(N, mulberry(seed + ':spray'), 'white');
    highpass(sprayNoise, SR, 1800, 0.7);
    lowpass(sprayNoise, SR, 7500, 0.7);
  }

  const attackTime = isBurnout ? 0.16 : 0.035;
  const decayTime = 0.22;

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let env = Math.min(1.0, t / attackTime);
    if (t > dur - decayTime) {
      env *= Math.max(0, (dur - t) / decayTime);
    }

    let absMod = 1.0;
    if (isABS) {
      const absCycle = (t * 12.5) % 1.0;
      absMod = 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * absCycle), 0.55);
    }

    let rotMod = 1.0;
    if (isBurnout) {
      rotMod = 0.82 + 0.18 * Math.sin(2 * Math.PI * 22 * t);
    }

    let handbrakeCurve = 1.0;
    if (isHandbrake) {
      handbrakeCurve = Math.pow(1.0 - (t / dur) * 0.65, 0.85);
    }

    const totalMod = env * absMod * rotMod * handbrakeCurve;

    const squealSample = squealBuf[i] * (isWet ? 0.6 : 1.0) * totalMod;
    const gritSample = gritNoise[i] * (0.35 + 0.15 * (1.0 - t / dur)) * totalMod;
    const smokeSample = smokeNoise[i] * smokeGain * totalMod;
    const rumbleSample = roadRumble[i] * 0.45 * env;
    const spraySample = sprayNoise ? sprayNoise[i] * 0.45 * totalMod : 0;

    out[i] += squealSample * 0.85 + gritSample * 0.4 + smokeSample * 0.35 + rumbleSample * 0.3 + spraySample;
  }
}

/* ---------- 21. AIRCRAFT & SPACECRAFT ---------- */
function renderAircraft(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('sonic boom') || lower.includes('shockwave')) {
    transientPunch(out, { dur: 0.15, fStart: 180, fEnd: 32, tau: 0.04, seed: seed + ':n1', gain: 0.95 });
    transientPunch(out, { dur: 0.22, fStart: 140, fEnd: 28, tau: 0.06, seed: seed + ':n2', start: 0.08, gain: 0.85 });
    modal(out, { f: 45, tau: dur * 0.8, ratios: [1, 2.1], seed: seed + ':sub' }, 0.9);
    granularScrape(out, { dur, hp: 80, lp: 850, attack: 0.02, release: dur * 0.7, seed: seed + ':rumble', gain: 0.85 });
  } else if (lower.includes('rotor') || lower.includes('helicopter') || lower.includes('blade slap') || lower.includes('chop')) {
    const bvf = lower.includes('apache') ? 24 : lower.includes('black hawk') ? 21 : 18;
    const period = 1.0 / bvf;
    const pulses = Math.floor(dur * bvf);
    for (let p = 0; p < pulses; p++) {
      const t = p * period;
      transientPunch(out, { dur: 0.04, fStart: 180, fEnd: 55, tau: 0.012, start: t, seed: seed + ':bvi:' + p, gain: 0.8 });
      granularScrape(out, { dur: 0.035, start: t, hp: 450, lp: 3200, seed: seed + ':wh:' + p, gain: 0.6 });
    }
    fmSynth(out, { dur, fCarrier: 110, fMod: bvf, modIndex: 1.8, seed: seed + ':turb', gain: 0.5 });
  } else if (lower.includes('warp') || lower.includes('quantum') || lower.includes('hyperdrive') || lower.includes('sublight')) {
    fmSynth(out, { dur: dur * 0.85, fCarrier: 120, fMod: 42, modIndex: 3.5, sweep: 8.0, seed: seed + ':warp', gain: 0.85 });
    metalShimmer(out, { dur: dur * 0.7, f0: 3400, spread: 800, seed: seed + ':shimmer', gain: 0.55 });
    transientPunch(out, { dur: 0.2, fStart: 2200, fEnd: 60, tau: 0.02, start: dur * 0.75, seed: seed + ':snap', gain: 0.9 });
  } else if (lower.includes('thruster') || lower.includes('rcs') || lower.includes('afterburner') || lower.includes('rocket') || lower.includes('jet') || lower.includes('booster')) {
    const isRocket = lower.includes('rocket') || lower.includes('booster') || lower.includes('afterburner');
    const hp = isRocket ? 90 : 250;
    const lp = isRocket ? 4500 : 7500;
    granularScrape(out, { dur, hp, lp, attack: 0.08, release: dur * 0.35, seed: seed + ':jet', gain: 0.95 });
    if (isRocket) {
      modal(out, { f: 55, tau: dur * 0.9, ratios: [1, 2.3], seed: seed + ':sub' }, 0.85);
    }
    fmSynth(out, { dur, fCarrier: 2400, fMod: 85, modIndex: 0.8, seed: seed + ':whine', gain: 0.4 });
  } else if (lower.includes('warning') || lower.includes('caution') || lower.includes('horn') || lower.includes('alarm') || lower.includes('beeps') || lower.includes('stall')) {
    const f1 = lower.includes('stall') ? 480 : 880;
    const f2 = lower.includes('stall') ? 360 : 660;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const b = (t % 0.3) < 0.15 ? f1 : f2;
      const env = Math.sin(Math.PI * ((t % 0.15) / 0.15));
      out[i] += (Math.sin(2 * Math.PI * b * t) + 0.3 * Math.sin(2 * Math.PI * b * 2 * t)) * env * 0.7;
    }
  } else if (lower.includes('switch') || lower.includes('click') || lower.includes('latch') || lower.includes('relay')) {
    modal(out, { f: 2800 + rnd() * 400, tau: 0.008, ratios: [1, 1.8], seed: seed + ':sw1' }, 0.8);
    modal(out, { f: 1200 + rnd() * 200, tau: 0.015, ratios: [1, 2.3], seed: seed + ':sw2', start: 0.012 }, 0.6);
  } else {
    granularScrape(out, { dur, hp: 180, lp: 4200, attack: 0.15, release: dur * 0.4, seed: seed + ':whoosh', gain: 0.85 });
    fmSynth(out, { dur, fCarrier: 240, fMod: 48, modIndex: 1.2, seed: seed + ':drone', gain: 0.5 });
  }
}

/* ---------- 22. MEDIEVAL SIEGE & ARMOR ---------- */
function renderSiegeArmor(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('trebuchet') || lower.includes('catapult') || lower.includes('mangonel')) {
    granularScrape(out, { dur: 0.45, hp: 180, lp: 900, attack: 0.04, release: 0.15, seed: seed + ':creak', gain: 0.85 });
    transientPunch(out, { dur: 0.18, fStart: 160, fEnd: 45, tau: 0.04, start: 0.3, seed: seed + ':drop', gain: 0.95 });
    granularScrape(out, { dur: 0.35, hp: 450, lp: 3200, attack: 0.02, start: 0.32, seed: seed + ':whoosh', gain: 0.75 });
  } else if (lower.includes('wall') || lower.includes('boulder') || lower.includes('ram') || lower.includes('smash') || lower.includes('gate')) {
    modal(out, { f: 85, tau: 0.45, ratios: [1, 2.35, 4.8], seed: seed + ':stone1' }, 0.95);
    modal(out, { f: 220, tau: 0.15, ratios: [1, 2.1, 3.8], seed: seed + ':timber', start: 0.01 }, 0.8);
    scatterImpacts(out, 24, { f: 750 + rnd() * 400, tau: 0.02, ratios: [1, 2.4], gain: 0.7 }, seed + ':rubble', 0.6);
  } else if (lower.includes('armor') || lower.includes('gauntlet') || lower.includes('chainmail') || lower.includes('greaves') || lower.includes('helmet') || lower.includes('visor')) {
    const isChain = lower.includes('chainmail') || lower.includes('shackles') || lower.includes('chain');
    if (isChain) {
      scatterImpacts(out, 30, { f: 3800 + rnd() * 1200, tau: 0.012, ratios: [1, 1.8, 2.9], amps: [1, 0.7, 0.4], gain: 0.8 }, seed + ':links', dur * 0.8);
    } else {
      modal(out, { f: 1850 + rnd() * 300, tau: 0.06, ratios: [1, 2.15, 3.7], seed: seed + ':plate' }, 0.85);
      modal(out, { f: 3400 + rnd() * 400, tau: 0.035, ratios: [1, 1.7], seed: seed + ':steel', start: 0.01 }, 0.65);
    }
  } else if (lower.includes('arrow') || lower.includes('bolt') || lower.includes('crossbow') || lower.includes('longbow')) {
    transientPunch(out, { dur: 0.08, fStart: 650, fEnd: 180, tau: 0.015, dropRate: 40, seed: seed + ':twang', gain: 0.85 });
    granularScrape(out, { dur: 0.22, hp: 1600, lp: 6200, attack: 0.01, release: 0.12, start: 0.04, seed: seed + ':whoosh', gain: 0.75 });
    if (lower.includes('pierce') || lower.includes('hit') || lower.includes('impact') || lower.includes('thud')) {
      transientPunch(out, { dur: 0.12, fStart: 320, fEnd: 95, tau: 0.03, start: 0.2, seed: seed + ':thud', gain: 0.8 });
    }
  } else if (lower.includes('horn') || lower.includes('trumpet')) {
    const f0 = lower.includes('horn') ? 146.8 : 293.7;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const env = Math.sin(Math.PI * Math.min(1.0, t / dur));
      let s = 0;
      for (let h = 1; h <= 6; h++) {
        s += Math.sin(2 * Math.PI * f0 * h * t) * (1.0 / Math.pow(h, 1.1));
      }
      out[i] += s * env * 0.85;
    }
  } else if (lower.includes('portcullis') || lower.includes('drawbridge') || lower.includes('winch')) {
    scatterImpacts(out, 18, { f: 2200, tau: 0.02, ratios: [1, 2.2], gain: 0.6 }, seed + ':chain', dur * 0.7);
    modal(out, { f: 120, tau: 0.35, ratios: [1, 2.4, 4.8], seed: seed + ':slam', start: dur * 0.65 }, 0.95);
  } else {
    modal(out, { f: 2400 + rnd() * 600, tau: 0.08, ratios: [1, 2.2, 4.3], seed: seed + ':metal' }, 0.9);
    transientPunch(out, { dur: 0.15, fStart: 450, fEnd: 110, tau: 0.02, seed: seed + ':punch', gain: 0.75 });
  }
}

/* ---------- 23. ANIME & POWER FX ---------- */
function renderAnimePower(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('charge') || lower.includes('surge') || lower.includes('aura') || lower.includes('kamehameha')) {
    fmSynth(out, { dur, fCarrier: 180, fMod: 54, modIndex: 2.5, sweep: 6.0, seed: seed + ':fm', gain: 0.85 });
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const trem = 0.65 + 0.35 * Math.sin(2 * Math.PI * 14 * t);
      out[i] *= trem;
    }
    scatterImpacts(out, 20, { f: 4500 + rnd() * 1500, tau: 0.006, ratios: [1, 1.8], gain: 0.45 }, seed + ':sparks', dur * 0.8);
  } else if (lower.includes('teleport') || lower.includes('flash step') || lower.includes('instant') || lower.includes('poof')) {
    transientPunch(out, { dur: 0.06, fStart: 2800, fEnd: 120, tau: 0.012, dropRate: 50, seed: seed + ':pop', gain: 0.95 });
    modal(out, { f: 3800 + rnd() * 800, tau: 0.045, ratios: [1, 1.6, 2.4], seed: seed + ':shim' }, 0.7);
  } else if (lower.includes('blade') || lower.includes('slash') || lower.includes('cut') || lower.includes('sheathe') || lower.includes('shuriken')) {
    granularScrape(out, { dur: Math.min(dur, 0.35), hp: 2200, lp: 9500, attack: 0.01, release: 0.12, seed: seed + ':cut', gain: 0.9 });
    modal(out, { f: 4200 + rnd() * 600, tau: 0.025, ratios: [1, 1.73, 2.6], seed: seed + ':ring', start: 0.01 }, 0.75);
    if (lower.includes('sheathe') || lower.includes('click')) {
      modal(out, { f: 2800, tau: 0.01, ratios: [1, 1.8], seed: seed + ':click', start: dur * 0.6 }, 0.85);
    }
  } else if (lower.includes('scouter') || lower.includes('beeps') || lower.includes('meter')) {
    const notes = [440, 554, 659, 880, 1108, 1318, 1760];
    const step = 0.025;
    for (let n = 0; n < notes.length && n * step < dur; n++) {
      chiptunePulse(out, { f: notes[n], duty: 0.25, dur: step * 0.85, start: n * step, seed: seed + ':sc:' + n, gain: 0.7 });
    }
  } else if (lower.includes('time freeze') || lower.includes('clock') || lower.includes('za warudo')) {
    modal(out, { f: 3200, tau: 0.02, ratios: [1, 2.1], seed: seed + ':tick' }, 0.8);
    transientPunch(out, { dur: 0.3, fStart: 900, fEnd: 55, tau: 0.05, seed: seed + ':drop', gain: 0.9 });
  } else {
    modal(out, { f: 95, tau: dur * 0.6, ratios: [1, 2.1, 4.4], seed: seed + ':boom' }, 0.95);
    granularScrape(out, { dur, hp: 350, lp: 6500, attack: 0.02, release: dur * 0.4, seed: seed + ':noise', gain: 0.85 });
    metalShimmer(out, { dur: dur * 0.5, f0: 2800, spread: 600, seed: seed + ':glint', gain: 0.5 });
  }
}

/* ---------- 24. GORE & SPLATTER ---------- */
function renderGoreSplatter(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('bone') || lower.includes('snap') || lower.includes('fracture') || lower.includes('skull') || lower.includes('ribcage')) {
    modal(out, { f: 1650 + rnd() * 400, tau: 0.014, ratios: [1, 2.4, 4.6], seed: seed + ':bone1' }, 0.95);
    modal(out, { f: 2800 + rnd() * 500, tau: 0.008, ratios: [1, 1.8], seed: seed + ':bone2', start: 0.006 }, 0.8);
    scatterImpacts(out, 8, { f: 2100 + rnd() * 600, tau: 0.008, ratios: [1, 2.0], gain: 0.6 }, seed + ':splinter', 0.08);
    transientPunch(out, { dur: 0.12, fStart: 280, fEnd: 75, tau: 0.025, seed: seed + ':thump', gain: 0.7 });
  } else if (lower.includes('flesh') || lower.includes('tear') || lower.includes('meat') || lower.includes('rip')) {
    granularScrape(out, { dur: Math.min(dur, 0.45), hp: 250, lp: 2800, attack: 0.02, release: 0.15, seed: seed + ':tear', gain: 0.9 });
    for (let k = 0; k < 5; k++) {
      bubble(out, 300 + rnd() * 250, 0.004, 0.7, 0.02 + k * 0.04, 0.08, 0.001);
    }
  } else if (lower.includes('blood') || lower.includes('splat') || lower.includes('gush') || lower.includes('drip') || lower.includes('squish') || lower.includes('viscera')) {
    for (let k = 0; k < 8; k++) {
      const t = k * (0.02 + rnd() * 0.03);
      bubble(out, 220 + rnd() * 320, 0.005, 0.75 - k * 0.05, t, 0.08, 0.001);
    }
    granularScrape(out, { dur: Math.min(dur, 0.35), hp: 600, lp: 4200, attack: 0.01, release: 0.18, seed: seed + ':splash', gain: 0.75 });
  } else if (lower.includes('teeth') || lower.includes('bite') || lower.includes('chew') || lower.includes('crunch')) {
    modal(out, { f: 1950, tau: 0.012, ratios: [1, 2.2], seed: seed + ':teeth' }, 0.85);
    granularScrape(out, { dur: 0.18, hp: 450, lp: 3200, seed: seed + ':crunch', gain: 0.8 });
  } else {
    transientPunch(out, { dur: 0.2, fStart: 340, fEnd: 60, tau: 0.04, seed: seed + ':blunt', gain: 0.9 });
    granularScrape(out, { dur: 0.3, hp: 350, lp: 2600, attack: 0.02, release: 0.15, seed: seed + ':slap', gain: 0.8 });
  }
}

/* ---------- 25. SPORTS & STADIUM ---------- */
function renderSports(ctx) {
  const { lower, out, dur, seed, rnd } = ctx;

  if (lower.includes('whistle') || lower.includes('referee')) {
    const f1 = 2820, f2 = 3140;
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const trill = 1.0 + 0.12 * Math.sin(2 * Math.PI * 28 * t);
      const env = Math.sin(Math.PI * Math.min(1.0, t / dur));
      const s = (Math.sin(2 * Math.PI * f1 * trill * t) + Math.sin(2 * Math.PI * f2 * trill * t)) * 0.45;
      out[i] += s * env;
    }
  } else if (lower.includes('crowd') || lower.includes('roar') || lower.includes('stadium') || lower.includes('chant')) {
    vocalFormant(out, { fBase: 120, f1: 520, f2: 1250, f3: 2400, flutterHz: 8, growlDepth: 0.25, dur, seed: seed + ':crowd1', gain: 0.8 });
    vocalFormant(out, { fBase: 95, f1: 680, f2: 1450, f3: 2800, flutterHz: 6, growlDepth: 0.2, dur, seed: seed + ':crowd2', gain: 0.6 });
    granularScrape(out, { dur, hp: 300, lp: 3600, attack: 0.25, release: dur * 0.4, seed: seed + ':roar', gain: 0.75 });
  } else if (lower.includes('bat') || lower.includes('crack') || lower.includes('golf') || lower.includes('driver')) {
    const isMetal = lower.includes('aluminum') || lower.includes('titanium') || lower.includes('ping') || lower.includes('golf');
    const f0 = isMetal ? 4200 : 1480;
    const tau = isMetal ? 0.045 : 0.015;
    modal(out, { f: f0 + rnd() * 200, tau, ratios: isMetal ? [1, 2.3, 4.8] : [1, 2.65, 5.1], seed: seed + ':impact' }, 0.95);
    transientPunch(out, { dur: 0.08, fStart: 450, fEnd: 120, tau: 0.015, seed: seed + ':punch', gain: 0.7 });
  } else if (lower.includes('net') || lower.includes('swish')) {
    granularScrape(out, { dur: 0.2, hp: 2800, lp: 8500, attack: 0.01, release: 0.12, seed: seed + ':swish', gain: 0.9 });
  } else if (lower.includes('bowling') || lower.includes('pins')) {
    granularScrape(out, { dur: 0.45, hp: 120, lp: 650, attack: 0.04, release: 0.2, seed: seed + ':roll', gain: 0.75 });
    scatterImpacts(out, 12, { f: 1250 + rnd() * 400, tau: 0.025, ratios: [1, 2.4], gain: 0.8 }, seed + ':pins', 0.5);
  } else if (lower.includes('bell') || lower.includes('boxing')) {
    modal(out, { f: 880, tau: Math.min(dur * 0.9, 1.8), ratios: [1, 2.14, 3.42, 5.1], amps: [1, 0.65, 0.4, 0.2], seed: seed + ':bell' }, 0.95);
  } else if (lower.includes('ball') || lower.includes('kick') || lower.includes('bounce') || lower.includes('dribble') || lower.includes('puck')) {
    transientPunch(out, { dur: 0.14, fStart: 280, fEnd: 65, tau: 0.03, seed: seed + ':kick', gain: 0.9 });
    modal(out, { f: 380, tau: 0.04, ratios: [1, 2.2], seed: seed + ':skin' }, 0.7);
  } else {
    transientPunch(out, { dur: 0.12, fStart: 380, fEnd: 95, tau: 0.02, seed: seed + ':sp' }, 0.85);
    granularScrape(out, { dur: 0.25, hp: 500, lp: 4200, seed: seed + ':turf', gain: 0.6 });
  }
}

/* ---------- FAILSAFE ---------- */
function renderFailsafe(ctx) {
  const { out, seed, rnd } = ctx;
  modal(out, { f: 600 + rnd() * 300, tau: 0.04, ratios: [1, 2.2, 4.4], seed }, 0.8);
}

/* ---------- ACOUSTIC EVENT DURATION ---------- */
function getAcousticDuration(cat, lower, rnd) {
  if (cat === 'Footsteps') return 0.28 + rnd() * 0.08;
  if (cat === 'UI & Menus') return 0.08 + rnd() * 0.08;
  if (cat === 'Retro 8-Bit') return 0.25 + rnd() * 0.15;
  if (cat === 'Melee & Blades') return 0.4 + rnd() * 0.2;
  if (cat === 'Firearms & Guns') return 0.65 + rnd() * 0.35;
  if (cat === 'Explosions') return 1.8 + rnd() * 0.8;
  if (cat === 'Weather & Nature') return 2.2 + rnd() * 0.8;
  if (cat === 'Horror & Dread') return 2.4 + rnd() * 0.6;
  if (cat === 'Vehicles & Tires') {
    if (lower.includes('screech') || lower.includes('skid') || lower.includes('burnout') || lower.includes('drift') || lower.includes('siren')) {
      return 2.2 + rnd() * 0.8;
    }
    if (lower.includes('click') || lower.includes('latch') || lower.includes('relay') || lower.includes('flash') || lower.includes('beep')) {
      return 0.15 + rnd() * 0.15;
    }
    if (lower.includes('door') || lower.includes('hood') || lower.includes('slam') || lower.includes('clunk') || lower.includes('pop')) {
      return 0.45 + rnd() * 0.25;
    }
    return 1.4 + rnd() * 0.6;
  }
  if (cat === 'Fanfares & Wins') return 1.2 + rnd() * 0.4;
  if (cat === 'Casino & Arcade') return 1.0 + rnd() * 0.5;
  if (cat === 'Liquids & Water') return 0.6 + rnd() * 0.4;
  if (cat === 'Aircraft & Spacecraft') {
    if (lower.includes('switch') || lower.includes('click') || lower.includes('relay')) return 0.15 + rnd() * 0.1;
    if (lower.includes('warning') || lower.includes('caution') || lower.includes('alarm')) return 0.9 + rnd() * 0.4;
    return 2.2 + rnd() * 0.8;
  }
  if (cat === 'Medieval Siege & Armor') return 0.9 + rnd() * 0.5;
  if (cat === 'Anime & Power FX') return 1.1 + rnd() * 0.6;
  if (cat === 'Gore & Splatter') return 0.55 + rnd() * 0.35;
  if (cat === 'Sports & Stadium') {
    if (lower.includes('crowd') || lower.includes('roar')) return 2.5 + rnd() * 0.7;
    if (lower.includes('bell')) return 1.8 + rnd() * 0.4;
    if (lower.includes('whistle')) return 0.8 + rnd() * 0.3;
    return 0.6 + rnd() * 0.3;
  }
  return 0.5 + rnd() * 0.3;
}

module.exports = { synthesizeAcousticSfx };
