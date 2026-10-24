'use strict';

/* ============================================================================
   SFX.JS — Router + duration derivation + per-item post chain.
   Replaces the old index-math engine. Routes each item by NAME KEYWORD into a
   domain model, derives a realistic duration, seeds a deterministic PRNG so
   every one of the 1,500 items is distinct, then normalizes/limiter.
   ============================================================================ */

const C = require('./sfx-core.js');
const { SR, hash32, mulberry, makeBuf, lowpass, highpass, clamp } = C;
const D1 = require('./sfx-domain.js');
const D2 = require('./sfx-domain2.js');

/* category -> ordered banks of models */
/* Per-item bank override: some names in a category belong to another domain. */
const ITEM_BANK_OVERRIDE = [
  [/glacier|calving|ice shelf/i, D2.ambient],
  [/thunder|lightning/i, D2.ambient],
  [/tornado|hurricane/i, D2.ambient],
  [/earthquake/i, D2.ambient],
  [/avalanche|rockslide/i, D2.ambient],
  [/volcano|lava|eruption/i, D2.ambient],
];

const BANKS = {
  'Vehicles & Tires': D1.vehicle,
  'Firearms & Guns': D1.weapon,
  'Explosions': D2.blast,
  /* Glacier/calving live in Explosions but are weather-scale fracture events,
     so they route through the ambient bank, not the blast bank. */
  'Weather & Nature': D2.ambient,
  'Liquids & Water': D2.liquid,
  'Board & Tabletop': D2.foley,
  'Foley & Props': D2.foley,
  'Survival & Craft': D2.foley,
  'Footsteps': D2.foley,
  'Melee & Blades': D2.foley,
  'Horror & Dread': D2.foley,
  'Machinery': D2.machinery,
  'UI & Menus': D2.ui,
  'Casino & Arcade': D2.ui,
  'Retro 8-Bit': D2.magic,
  'Magic & Spells': D2.magic,
  'Fanfares & Wins': D2.magic,
  'Sci-Fi & Cyber': D2.magic,
  'Monsters & Beasts': D2.creature,
  'Weather & Nature': D2.ambient,
  'Cartoon & Comedy': D2.foley,
  'Aircraft & Spacecraft': D1.vehicle,
  'Medieval Siege & Armor': D2.foley,
  'Anime & Power FX': D2.magic,
  'Gore & Splatter': D2.foley,
  'Sports & Stadium': D2.foley,
};

const DUR_FNS = {
  'Vehicles & Tires': D1.vehicleDur,
  'Firearms & Guns': D1.weaponDur,
  'Explosions': D2.blastDur,
  'Liquids & Water': D2.liquidDur,
  'UI & Menus': D2.uiDur,
  'Casino & Arcade': D2.uiDur,
  'Retro 8-Bit': D2.magicDur,
  'Magic & Spells': D2.magicDur,
  'Fanfares & Wins': D2.magicDur,
  'Sci-Fi & Cyber': D2.magicDur,
  'Monsters & Beasts': D2.creatureDur,
  'Weather & Nature': D2.ambientDur,
  'Machinery': D2.machineryDur,
  'Horror & Dread': D2.horrorDur,
  'Footsteps': D2.footstepDur,
  'Foley & Props': D2.foleyDur,
  'Board & Tabletop': D2.foleyDur,
  'Melee & Blades': D2.foleyDur,
  'Cartoon & Comedy': D2.foleyDur,
  'Survival & Craft': D2.foleyDur,
  'Aircraft & Spacecraft': D1.vehicleDur,
  'Medieval Siege & Armor': D2.foleyDur,
  'Anime & Power FX': D2.magicDur,
  'Gore & Splatter': D2.foleyDur,
  'Sports & Stadium': D2.foleyDur,
};

/* Short, dry percussive categories must not fall back to a long default */
const MAX_DUR = {
  'Footsteps': 0.55,
  'UI & Menus': 2.6,
};

function materialFor(cat, name) {
  const n = name.toLowerCase();
  if (cat === 'Footsteps') {
    if (n.includes('gravel') || n.includes('marble') || n.includes('grate') || n.includes('puddle')) return D2.MATERIALS.stone;
    if (n.includes('snow') || n.includes('grass') || n.includes('sand') || n.includes('leaves') || n.includes('mud')) return D2.MATERIALS.plastic;
    return D2.MATERIALS.wood;
  }
  if (n.includes('glass') || n.includes('window') || n.includes('mirror')) return D2.MATERIALS.glass;
  if (n.includes('metal') || n.includes('steel') || n.includes('blade') || n.includes('shield') || n.includes('chain') || n.includes('grate') || n.includes('marble')) return D2.MATERIALS.metal;
  if (n.includes('stone') || n.includes('rock') || n.includes('brick') || n.includes('coin')) return D2.MATERIALS.stone;
  if (n.includes('plastic') || n.includes('chip') || n.includes('tile') || n.includes('domino')) return D2.MATERIALS.plastic;
  return D2.MATERIALS.wood;
}

function impactCountFor(cat, name) {
  const n = name.toLowerCase();
  if (n.includes('tumble') || n.includes('cascade') || n.includes('jingle') || n.includes('rattle')) return 12;
  if (n.includes('tumble')) return 14;
  return 8;
}

/* choose a model by scanning the item name for any keyword */
function route(bank, name, seed) {
  const n = ' ' + name.toLowerCase() + ' ';
  let best = null, bestIdx = 1e9;
  for (const model of bank) {
    for (const k of model.kw) {
      const idx = n.indexOf(k);
      if (idx !== -1 && idx < bestIdx) { bestIdx = idx; best = model; break; }
    }
  }
  if (best) return best;
  // Unmatched name: pick a model deterministically from THIS item's seed so
  // different unmatched names never collapse onto one identical fallback sound.
  const bank2 = bank.filter(m => m !== best);
  return bank2[seed % bank2.length] || bank[0];
}

function durationFor(cat, name, model, bank) {
  // If this item was routed to another domain bank, use that domain's timing too.
  const overrideBank = bank && bank !== (BANKS[cat] || D2.foley);
  let fn = overrideBank ? null : DUR_FNS[cat];
  if (overrideBank) {
    if (bank === D2.ambient) fn = D2.ambientDur;
    else if (bank === D2.liquid) fn = D2.liquidDur;
    else if (bank === D1.vehicle) fn = D1.vehicleDur;
    else if (bank === D1.weapon) fn = D1.weaponDur;
  }
  let d = fn ? fn({ name }) : (model ? model.dur : 0.6);
  if (!isFinite(d) || d <= 0) d = model ? model.dur : 0.6;
  const cap = MAX_DUR[cat];
  if (cap) d = Math.min(d, cap);
  return d;
}

const { synthesizeAcousticSfx } = require('./sfx-synthesizer.js');
const mastering = require('./mastering.js');

/* main entry: build mono Float32 + metadata for one catalog item */
function synthesizeSfx(item, params = {}) {
  // Synthesize using dedicated semantic physical acoustic engine
  const r = synthesizeAcousticSfx(item, params);
  let out = r.samples;

  postChain(out, params, r.sr);

  const targetSr = params.targetSr || r.sr;
  if (targetSr !== r.sr) {
    out = mastering.resampleBandlimited(out, r.sr, targetSr);
  }

  return {
    samples: out,
    sr: targetSr,
    dur: out.length / targetSr,
    model: r.model || item.cat,
    label: r.label || '[' + item.cat + ' · ' + (item.name || '') + ']'
  };
}

/* per-item master: cleanup, space, normalize, gentle limiter, mobile phone optimization */
function postChain(out, p, sr) {
  const currentSr = sr || SR;
  const drive = clamp(p.driveAmt || 0, 0, 1);
  const rev = clamp(p.reverbMix || 0, 0, 1);

  // Highpass at 45Hz: removes DC offset and unusable low-end rumble that distorts mobile phone speakers
  highpass(out, currentSr, 45, 0.7071);

  // Soft saturation / drive
  if (drive > 0.05) {
    const k = 1 + drive * 4.5;
    const norm = 1 / Math.tanh(k);
    for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * k) * norm;
  }

  // 2-tap subtle acoustic space
  if (rev > 0.05) {
    const d1 = Math.floor(0.021 * currentSr), d2 = Math.floor(0.037 * currentSr);
    for (let i = d2; i < out.length; i++) out[i] += (out[i - d1] * 0.28 + out[i - d2] * 0.20) * rev;
  }

  // Peak normalization to -1.0 dBFS (0.8912) with soft-knee limiting
  let peak = 0;
  for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
  if (peak > 0.0001) {
    const target = 0.8912; // -1.0 dBFS (safe for mobile lossy codecs)
    const g = target / peak;
    for (let i = 0; i < out.length; i++) {
      let v = out[i] * g;
      if (v > target) v = target * Math.tanh(v / target);
      else if (v < -target) v = -target * Math.tanh(-v / target);
      out[i] = v;
    }
  }

  // Mobile game engine click-prevention: 3ms fade-in, 6ms fade-out
  mastering.applyEdgeFades(out, currentSr, 3, 6);
}

module.exports = { synthesizeSfx, BANKS, materialFor };