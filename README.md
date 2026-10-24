# SoundForge Studio™

<p align="center">
  <img src="https://img.shields.io/badge/Developer-Mohd%20Tahir%20Shaikh-06b6d4?style=for-the-badge" alt="Developer">
  <img src="https://img.shields.io/badge/Brand-NEURON%20TS%20LABS-4f46e5?style=for-the-badge" alt="Brand">
  <img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Audio-2%2C500%20Physical%20SFX-f59e0b?style=for-the-badge" alt="Physical SFX">
  <img src="https://img.shields.io/badge/TTS-Offline%20Neural%20Voices-8b5cf6?style=for-the-badge" alt="Neural TTS">
  <img src="https://img.shields.io/badge/Compliance-ITU--R%20BS.1770--4-ec4899?style=for-the-badge" alt="ITU-R BS.1770-4">
</p>

**SoundForge Studio** is an enterprise-grade, 100% offline game audio workstation designed for mobile and AAA indie game developers. Built from scratch with procedural physical acoustic modeling and offline neural speech synthesis, it provides instant generation, live customization, and batch exporting for **2,500 physical sound effects** and **200 game character voice lines**.

Developed by **Mohd Tahir Shaikh** under **NEURON TS LABS**.

---

## 🌟 Key Features

### 💥 1. 2,500 Procedural Physical SFX (25 Game Categories)
* **Zero Audio Files on Disk:** All 2,500 sounds are generated in real-time from mathematical and physical acoustic equations (Euler-Bernoulli beams, modal synthesis, non-linear hyperbolic friction, granular scraping, FM synthesis, and fluid dynamics).
* **100% Deterministic Reproducibility:** Every sound has its own cryptographically unique SHA-256 fingerprint, guaranteeing bit-for-bit identical regeneration when desired.
* **25 Diverse Game Categories (100 Distinct Sounds per Category):**
  * `Aircraft & Spacecraft` (Jet afterburners, hypersonic booms, helicopter rotor chop, warp jump distortions)
  * `Medieval Siege & Armor` (Trebuchet counterweights, battering rams, plate armor gauntlets, 500-arrow volleys)
  * `Anime & Power FX` (Ki energy charges, Super Saiyan aura flares, teleport flash-steps, scouter beeps)
  * `Gore & Splatter` (Bone fractures, skull bludgeons, arterial blood squirts, visceral disembowelments)
  * `Sports & Stadium` (50,000-seat crowd roars, referee pea whistles, baseball bat cracks, boxing ring bells)
  * `Vehicles & Tires` (Non-linear hyperbolic tangent tire screech physics, F1 burnouts, ABS brake skids)
  * `Weapons & Combat` (Gunfire, bolt cycles, shell casings, sword parries, blade draws, blunt hits)
  * `Explosions` (Thermobaric blasts, depth charges, C4 detonations, sonic shockwaves)
  * `UI & Menus`, `Retro 8-Bit`, `Magic & Spells`, `Horror & Dread`, `Fanfares & Wins`, `Machinery`, `Survival & Craft`, `Weather & Nature`, `Water & Liquids`, `Casino & Slots`, `Footsteps`, `Foley & Props`, and more.

### 🗣️ 2. Game Character Voice DSP (Transforming Flat TTS into Game Voices)
Integrated real-time DSP stages transform standard neural speech into iconic gaming character voice archetypes:
* **Esports Arena Announcer (Default):** Deep -3.5st pitch down, stadium slapback reflections (42ms/88ms), chest resonance (+5dB @ 210Hz), and ITU-R BS.1770-4 normalization for high-impact arena commentary (*"DOUBLE KILL"*, *"VICTORY"*, *"RAMPAGE"*).
* **Tactical Military Comms:** 450Hz–3.2kHz telecom bandpass, diode clipping, 40ms key-down radio squelch static burst, and 60ms key-up mic chirp (*"AIR STRIKE INBOUND"*, *"COVER ME"*).
* **Cyborg / Sci-Fi Mecha AI:** 65Hz carrier ring modulation, 14ms metallic armor comb filtering, and crisp high-shelf shimmer (*"SYSTEM CRITICAL"*, *"SHIELDS OFFLINE"*).
* **Demonic Shadow Lord:** -4.0st pitch down paired with a -12.0st sub-octave throat growl layer (lowpassed at 350Hz) and cavernous dark reverb (*"PREPARE TO DIE"*, *"YOUR SOUL IS MINE"*).
* **Arcade Fighting Hype:** Fast transient compressor, +2.5st pitch up, and bright air shimmer (*"ROUND ONE"*, *"FIGHT"*, *"COMBO BREAKER"*).
* **Knight Helmet / Visor:** 8.5ms metallic helmet visor cavity comb filter reflections.

### 🎛️ 3. Studio-Grade Mastering & Mobile Optimization
* **True Peak Limiting:** Lookahead soft-knee brickwall limiter guaranteeing no inter-sample clipping (strictly adheres to **-1.0 dBTP** ceiling).
* **ITU-R BS.1770-4 Loudness Normalization:** Calibrated integrated loudness targets (-16.0 LUFS for mobile speaker clarity, -14.5 LUFS for broadcast punch).
* **Click-Free Edge Micro-Fades:** Raised-cosine fade-in (3ms) and fade-out (6ms) eliminate DC offset thumps and speaker pops in mobile game engines (Unity, Unreal, Godot).
* **16-Bit PCM with TPDF Dither:** Triangular Probability Density Function dither eliminates low-level quantization distortion.
* **Dual Target Sample Rates:** Instant toggle between **44.1 kHz** (Mobile Standard) and **48.0 kHz** (Unreal Engine / Studio DAW).

### 🖥️ 4. Responsive Studio UI
* **Category Carousel Slider:** Slide through 25 categories via mouse wheel, click-and-drag carousel, or left/right slide arrows (`‹` / `›`).
* **Category Quick-Jump Dropdown:** Instant 1-click jump to any category with live item counts.
* **Real-Time Oscilloscope:** 60 FPS live waveform canvas with animated playhead.
* **Batch Export:** 1-click batch export of any category or the entire 2,700-asset suite (200 voices + 2,500 SFX).

---

## 🚀 Getting Started

### Prebuilt Executables
You can run SoundForge Studio immediately without installing Node.js:
* **Standalone Portable:** [`SoundForge-Studio-Portable-1.0.0.exe`](SoundForge-Studio-Portable-1.0.0.exe) (Zero installation, runs anywhere).
* **Windows Installer:** [`SoundForge-Studio-Setup-1.0.0.exe`](SoundForge-Studio-Setup-1.0.0.exe) (Full NSIS setup with Start Menu and Desktop shortcuts).

---

### Running from Source

#### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
* [Git LFS](https://git-lfs.com/) (Required to pull the bundled neural `.onnx` models)

```bash
# 1. Clone repository
git clone https://github.com/tahirshaikh744/soundforge-studio.git
cd soundforge-studio

# 2. Pull Git LFS model binaries
git lfs pull

# 3. Install dependencies
npm install

# 4. Run the quality assurance test suite
npm test

# 5. Launch the application
npm start
```

---

## 🧪 Audio Integrity Test Suite

SoundForge Studio includes an automated quality assurance test suite:

```bash
npm test
```

This verifies:
1. **Catalog Integrity:** Validates all 2,500 physical SFX items across all 25 categories.
2. **ITU-R BS.1770-4 Compliance:** Verifies integrated LUFS normalization accuracy.
3. **True Peak Oversampling:** Validates 4x polyphase inter-sample peak detection.
4. **WAV Serialization & TPDF Dither:** Asserts 16-bit PCM bitstream encoding.
5. **Physical SFX Determinism:** Verifies bit-for-bit identical output on re-render.
6. **Dual Sample Rates:** Asserts bandlimited sinc resampling at 44.1 kHz and 48.0 kHz.
7. **Click-Free Micro-Fades:** Validates zero boundary sample values.
8. **Game Voice DSP Transforms:** Tests Arena, Tactical Radio, Cyborg, and Demonic Boss audio graphs.
9. **Category Coverage:** Synthesizes sounds across all 25 categories.

---

## 📦 Building Production Binaries

To build both Portable and Setup installer executables for Windows:

```bash
npm run dist
```

Outputs will be generated in `dist/`:
* `dist/SoundForge-Studio-Portable-1.0.0.exe`
* `dist/SoundForge-Studio-Setup-1.0.0.exe`

---

## 📁 Repository Structure

```text
soundforge-studio/
├── engine/
│   ├── piper/             # Offline Piper neural TTS executable, ONNX Runtime & eSpeak
│   └── voices/            # Pre-trained ONNX voice models (Joe, Ryan, Aria, Alan)
├── build/                 # Application icons and packaging assets
├── index.html             # Studio UI, real-time oscilloscope, category carousel
├── main.js                # Electron main process, IPC handlers, batch pipelines
├── preload.js             # Secure Electron context bridge
├── mastering.js           # ITU-R BS.1770-4 normalizer, lookahead limiter, Game Voice DSP
├── sfx-catalog.js         # 2,500 Physical SFX database (25 categories x 100 items)
├── sfx-synthesizer.js     # Procedural physical acoustic synthesis generators
├── sfx-core.js            # DSP math kernels (modal, granular, non-linear friction, FM)
├── sfx-domain.js          # Vehicle and firearm domain modelers
├── sfx-domain2.js         # Foley, ambient, blast, and creature domain modelers
├── sfx.js                 # Acoustic synthesis router and post-chain limiter
├── test-audio-suite.js    # Automated quality and compliance test suite
├── package.json           # Project manifest and electron-builder configuration
├── LICENSE                # MIT License
├── THIRD-PARTY-LICENSES.md# Detailed third-party licenses and model attributions
├── CONTRIBUTING.md        # Community contribution guidelines
└── SECURITY.md            # Security vulnerability reporting policy
```

---

## 👤 Author & Brand

* **Developer:** **Mohd Tahir Shaikh**
* **Brand / Studio:** **NEURON TS LABS**
* **Email:** [tahirshaikh744@gmail.com](mailto:tahirshaikh744@gmail.com)
* **GitHub:** [@tahirshaikh744](https://github.com/tahirshaikh744)

---

## 📄 License

This software and its procedural physical sound effects engine are licensed under the **[MIT License](LICENSE)**. 

All procedural physical sound effects generated by the software are **100% royalty-free** for personal, indie, and commercial game releases. For third-party neural voice model attributions and licensing terms, refer to **[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md)**.
