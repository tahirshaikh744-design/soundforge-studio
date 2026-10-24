'use strict';

/* ============================================================================
   SFX-SEMANTIC.JS — Semantic Custom Prompt Routing & Intent Extraction
   Maps freeform user sound descriptions to authentic procedural synthesis
   categories and physical acoustic models. Transparently reports interpretation.
   ============================================================================ */

const CATEGORY_KEYWORDS = [
  {
    cat: 'Vehicles & Tires',
    keywords: ['tire', 'car', 'vehicle', 'engine', 'skid', 'drift', 'accelerat', 'brake', 'rev', 'exhaust', 'motorcycle', 'truck', 'turbo', 'transmission', 'rpm']
  },
  {
    cat: 'Aircraft & Spacecraft',
    keywords: ['jet', 'plane', 'airplane', 'aircraft', 'spacecraft', 'spaceship', 'helicopter', 'rotor', 'rocket', 'warp', 'hyperdrive', 'thruster', 'afterburner', 'flyby', 'cockpit']
  },
  {
    cat: 'Firearms & Guns',
    keywords: ['gun', 'shotgun', 'rifle', 'pistol', 'sniper', 'bullet', 'ammo', 'revolver', 'firearm', 'shell', 'casing', 'reload', 'trigger', 'silencer', 'suppressor', 'burst', 'caliber']
  },
  {
    cat: 'Explosions',
    keywords: ['explosion', 'explode', 'blast', 'bomb', 'detonat', 'tnt', 'grenade', 'dynamite', 'c4', 'shockwave', 'kaboom', 'thermobaric', 'nuke', 'artillery']
  },
  {
    cat: 'Melee & Blades',
    keywords: ['sword', 'blade', 'knife', 'dagger', 'axe', 'slash', 'slice', 'parry', 'shield', 'hit', 'blunt', 'club', 'mace', 'stab', 'scabbard', 'sheath', 'whip']
  },
  {
    cat: 'Medieval Siege & Armor',
    keywords: ['catapult', 'trebuchet', 'ballista', 'siege', 'ram', 'battering', 'arrow', 'bow', 'crossbow', 'quiver', 'armor', 'gauntlet', 'chainmail', 'plate']
  },
  {
    cat: 'Sci-Fi & Cyber',
    keywords: ['laser', 'plasma', 'blaster', 'cyber', 'scifi', 'sci-fi', 'energy', 'forcefield', 'shield', 'teleport', 'hologram', 'scanner', 'droid', 'robot', 'servo', 'cyborg']
  },
  {
    cat: 'Anime & Power FX',
    keywords: ['aura', 'ki', 'super saiyan', 'power up', 'powerup', 'charge', 'flash step', 'teleportation', 'energy beam', 'kamehameha', 'anime', 'shonen', 'scouter']
  },
  {
    cat: 'Magic & Spells',
    keywords: ['magic', 'spell', 'cast', 'wizard', 'witch', 'arcane', 'rune', 'enchant', 'curse', 'teleport', 'portal', 'sparkle', 'mystic', 'mana', 'summon', 'conjure']
  },
  {
    cat: 'Monsters & Beasts',
    keywords: ['monster', 'beast', 'dragon', 'growl', 'roar', 'creature', 'alien', 'screech', 'hiss', 'zombie', 'snarl', 'bite', 'jaw', 'wolf', 'gargoyle', 'demon']
  },
  {
    cat: 'Gore & Splatter',
    keywords: ['gore', 'splatter', 'blood', 'flesh', 'bone', 'fracture', 'break', 'skull', 'squish', 'visceral', 'disembowel', 'wound', 'stab', 'dismember']
  },
  {
    cat: 'Horror & Dread',
    keywords: ['horror', 'dread', 'ghost', 'spooky', 'creepy', 'haunt', 'screaming', 'whisper', 'nightmare', 'heartbeat', 'jumpscare', 'eerie', 'phantom', 'ambient drone']
  },
  {
    cat: 'Footsteps',
    keywords: ['footstep', 'walk', 'run', 'step', 'stride', 'pace', 'tread', 'sneakers', 'boots', 'shoes', 'stomp', 'creep']
  },
  {
    cat: 'Weather & Nature',
    keywords: ['thunder', 'lightning', 'rain', 'wind', 'storm', 'tornado', 'hurricane', 'earthquake', 'avalanche', 'blizzard', 'snow', 'volcano', 'breeze', 'weather']
  },
  {
    cat: 'Liquids & Water',
    keywords: ['water', 'liquid', 'splash', 'drip', 'drop', 'pour', 'stream', 'bubble', 'underwater', 'submerge', 'wave', 'ripple', 'fluid']
  },
  {
    cat: 'Retro 8-Bit',
    keywords: ['8-bit', '8bit', 'retro', 'pixel', 'chiptune', 'arcade', 'nes', 'gameboy', 'jump', 'power-up', 'coin', '1-up', 'game over']
  },
  {
    cat: 'UI & Menus',
    keywords: ['click', 'button', 'menu', 'popup', 'hover', 'select', 'confirm', 'cancel', 'toggle', 'slider', 'tab', 'beep', 'interface', 'notification']
  },
  {
    cat: 'Casino & Arcade',
    keywords: ['casino', 'slot', 'roulette', 'jackpot', 'chips', 'card', 'shuffle', 'deal', 'spin', 'payout', 'wheel']
  },
  {
    cat: 'Board & Tabletop',
    keywords: ['dice', 'roll', 'chess', 'checker', 'board game', 'domino', 'tile', 'token', 'meeple', 'cardboard']
  },
  {
    cat: 'Sports & Stadium',
    keywords: ['whistle', 'referee', 'crowd', 'cheer', 'stadium', 'ball', 'baseball', 'bat', 'basketball', 'soccer', 'golf', 'tennis', 'applause', 'horn']
  },
  {
    cat: 'Machinery',
    keywords: ['machine', 'gear', 'motor', 'piston', 'factory', 'conveyor', 'hydraulics', 'pneumatic', 'clank', 'steam', 'drill', 'saw', 'lathe']
  },
  {
    cat: 'Survival & Craft',
    keywords: ['craft', 'mine', 'pickaxe', 'chop', 'wood', 'flint', 'campfire', 'torch', 'backpack', 'gather', 'forage', 'hammer', 'anvil']
  },
  {
    cat: 'Fanfares & Wins',
    keywords: ['fanfare', 'win', 'victory', 'triumph', 'level up', 'quest complete', 'trumpet', 'horn', 'brass', 'chime', 'glory', 'achievement']
  },
  {
    cat: 'Cartoon & Comedy',
    keywords: ['boing', 'slide whistle', 'whistle', 'slip', 'funny', 'plop', 'pop', 'honk', 'squeak', 'comic', 'clown', 'bonk', 'twang']
  },
  {
    cat: 'Foley & Props',
    keywords: ['foley', 'door', 'creak', 'drawer', 'chair', 'paper', 'rustle', 'book', 'key', 'lock', 'glass', 'cup', 'fabric', 'cloth', 'bag']
  }
];

/**
 * Classifies a freeform user text prompt into a supported category.
 * Returns classification metadata and honest confidence level.
 */
function classifyPrompt(promptText) {
  const raw = String(promptText || '').trim();
  if (!raw) {
    return {
      category: 'UI & Menus',
      confidence: 'fallback',
      matchedKeyword: null,
      isFallback: true,
      reason: 'Empty prompt provided; defaulted to UI Click.'
    };
  }

  const lower = raw.toLowerCase();

  // 1. Direct search across categorized keywords
  let bestCat = null;
  let bestKeyword = null;
  let longestMatch = 0;

  for (const entry of CATEGORY_KEYWORDS) {
    for (const kw of entry.keywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        // Prioritize longer, more specific keywords
        if (kw.length > longestMatch) {
          longestMatch = kw.length;
          bestCat = entry.cat;
          bestKeyword = kw;
        }
      }
    }
  }

  if (bestCat) {
    return {
      category: bestCat,
      confidence: 'high',
      matchedKeyword: bestKeyword,
      isFallback: false,
      reason: `Interpreted as "${bestCat}" based on keyword "${bestKeyword}".`
    };
  }

  // 2. Secondary heuristic check for percussive / ambient words
  if (/boom|crash|bang|smash|hit|knock|tap|thud/i.test(lower)) {
    return {
      category: 'Foley & Props',
      confidence: 'medium',
      matchedKeyword: 'impact',
      isFallback: false,
      reason: 'Interpreted as physical impact event in Foley & Props.'
    };
  }

  // 3. Transparent Fallback: do not silently claim high fidelity
  return {
    category: 'Foley & Props',
    confidence: 'fallback',
    matchedKeyword: null,
    isFallback: true,
    reason: `Prompt "${raw}" does not match specific sound categories; generated using general physical impact synthesis.`
  };
}

module.exports = {
  classifyPrompt,
  classifySfxPrompt: classifyPrompt,
  CATEGORY_KEYWORDS
};
