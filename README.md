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

## ⚡ Quick Start: Copy & Paste Code

Get up and running immediately with these copy-paste terminal commands:

### 🔹 Option 1: PowerShell (Clone, Install & Run in 1 Command)
```powershell
git clone https://github.com/tahirshaikh744-design/soundforge-studio.git; cd soundforge-studio; git lfs pull; npm install; npm start
```

### 🔹 Option 2: PowerShell (Clone, Test & Compile Both .EXE Files)
```powershell
git clone https://github.com/tahirshaikh744-design/soundforge-studio.git; cd soundforge-studio; git lfs pull; npm install; .\build.ps1
```

### 🔹 Option 3: Command Prompt (CMD Block)
```cmd
git clone https://github.com/tahirshaikh744-design/soundforge-studio.git
cd soundforge-studio
git lfs pull
npm install
build.bat
```

---

## 📋 What is Necessary Before Building

Before building SoundForge Studio executables from source, ensure your environment meets these requirements:

### 1. System Requirements
* **Operating System:** Windows 10 or Windows 11 (64-bit).
* **RAM:** Minimum 4 GB (8 GB recommended for Electron packaging).
* **Disk Space:** Minimum 3 GB free disk space (to accommodate Node modules, neural models, and temporary packaging cache).

### 2. Required Software & Tools
* **Node.js (v18.0.0 or higher):**
  * Download the LTS version from [nodejs.org](https://nodejs.org/).
  * Verify in your terminal:
    ```bash
    node -v
    npm -v
    ```
* **Git & Git LFS (Large File Storage):**
  * **CRITICAL:** Git LFS is **strictly required** to pull the pre-trained neural voice models (`Ryan.onnx`, `Joe.onnx`, `Aria.onnx`, `Alan.onnx`).
  * *Why?* Without Git LFS, git will only clone ~130-byte text pointer files instead of the actual 120 MB neural models, causing speech generation to fail!
  * Verify Git LFS is installed:
    ```bash
    git lfs --version
    ```
  * If missing, download it from [git-lfs.com](https://git-lfs.com/) or install via winget:
    ```powershell
    winget install GitHub.GitLFS
    git lfs install
    ```

### 3. PowerShell Script Execution Permissions (If using `build.ps1`)
Windows restricts script execution by default. To allow `build.ps1` to execute in your current terminal session:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

### 4. Pre-Build Model Health Check (Recommended)
Verify that your neural models are downloaded as binary files and not text pointers:
```powershell
Get-ChildItem engine/voices/*.onnx | Select-Object Name, Length
```
*(Every `.onnx` model should be > 15,000,000 bytes. If any model is < 1 KB, run `git lfs pull`).*

---

## 🛠️ Complete Step-by-Step Build Guide

Follow these steps to compile both the **Standalone Portable** (`.exe`) and **NSIS Windows Setup Installer** (`.exe`):

### Step 1: Clone the Repository & Fetch Git LFS Models
```bash
git clone https://github.com/tahirshaikh744-design/soundforge-studio.git
cd soundforge-studio
git lfs pull
```

### Step 2: Install Project Dependencies
Install Electron and electron-builder:
```bash
npm install
```

### Step 3: Run the Audio Quality Assurance Test Suite
Before packaging, run the automated test suite to verify physical acoustics, ITU-R BS.1770-4 loudness compliance, and character DSP graphs:
```bash
npm test
```
*You should see `=== ALL TESTS PASSED: SOUNDFORGE STUDIO IS ENTERPRISE & MOBILE GAME READY ===`.*

### Step 4: Compile Production Binaries
Choose your preferred build method:

#### Method A: 1-Click Batch Script (Recommended for CMD)
Double-click [`build.bat`](build.bat) in File Explorer or run in terminal:
```cmd
build.bat
```

#### Method B: PowerShell Script (With Custom Flags)
```powershell
.\build.ps1
```
*Optional parameters:*
* `.\build.ps1 -PortableOnly` — Builds only the standalone portable .exe.
* `.\build.ps1 -SetupOnly` — Builds only the NSIS setup installer .exe.
* `.\build.ps1 -SkipTests` — Skips the audio verification test suite for faster builds.

#### Method C: Standard npm Script
```bash
# Build BOTH Portable and Setup installers
npm run build

# Or build individually:
npm run build:portable
npm run build:setup
```

### Step 5: Locate Your Output Executables
All compiled binaries will be placed in the `dist/` directory:
* 📁 `dist/SoundForge-Studio-Portable-1.0.1.exe` (~383 MB — Zero installation, runs immediately on any Windows PC).
* 📁 `dist/SoundForge-Studio-Setup-1.0.1.exe` (~383 MB — Full NSIS installer with Desktop and Start Menu shortcuts).

### Step 6: Clean Up Build Artifacts (Optional)
To delete intermediate build caches and free up ~1.7 GB of packaging space:
```bash
npm run clean
```

---

## 🧪 Audio Integrity Test Suite

SoundForge Studio includes an automated test suite verifying studio audio standards:

```bash
npm test
```

This verifies:
1. **Catalog Integrity:** Validates all 2,500 physical SFX items across all 25 categories.
2. **Full Structural Uniqueness:** Asserts 2,500 unique IDs, 25 categories, 100 items each.
3. **Semantic Prompt Routing:** Validates freeform text classification and transparent Foley fallback.
4. **ITU-R BS.1770-4 Compliance:** Verifies integrated LUFS normalization accuracy (-16.0 LUFS target).
5. **True Peak Oversampling:** Validates 4x polyphase inter-sample peak detection (-1.0 dBTP ceiling).
6. **WAV Serialization & Seeded Dither:** Asserts 16-bit PCM bitstream encoding with deterministic TPDF dither.
7. **Real SHA-256 Asset Fingerprints:** Verifies crypto-calculated SHA-256 digests against reference test vectors.
8. **End-to-End Determinism:** Asserts bit-for-bit identical WAV byte streams on repeated exports.
9. **Bandlimited Windowed-Sinc FIR Resampling:** Verifies DC preservation, passband accuracy, and >60 dB stopband rejection.
10. **Click-Free Micro-Fades:** Validates zero boundary sample values (3ms attack / 6ms decay).
11. **Game Voice DSP Transforms:** Tests Arena, Tactical Radio, Cyborg, and Demonic Boss audio graphs.
12. **Numerical Safety & Edge Cases:** Verifies graceful handling of pure silence, NaNs, and infinities.
13. **Full Catalog Dispatch Coverage:** Synthesizes sounds across all 25 physical acoustic categories.
14. **Neural Voice Model Validation:** Verifies ONNX weight binaries (>50MB) and detects unpulled Git LFS stubs.
15. **Preload IPC Lifecycle:** Verifies memory-leak free event listener registration and deterministic unsubscription.

---

## ❓ Troubleshooting Pre-Build & Build Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Model file not found" or TTS failure** | Git LFS was not installed prior to cloning. Models are text pointers (~130 bytes). | Run `git lfs install` followed by `git lfs pull`. |
| **"Running scripts is disabled on this system"** | Windows PowerShell execution policy restriction. | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`. |
| **`EBUSY: resource busy or locked` during build** | Windows Defender or Antivirus locked the temporary `.7z` file during NSIS compression. | Wait 5 seconds and re-run `build.bat`, or add the `soundforge-app` folder to Defender exclusions. |
| **`electron-builder not recognized`** | Dependencies were not installed. | Run `npm install` in the project root folder. |

---

## 📁 Repository Structure

```text
soundforge-studio/
├── .github/workflows/     # GitHub Actions CI workflow (Windows automated test matrix)
├── docs/                  # Technical audit, DSP architecture, and test reports
├── engine/
│   ├── piper/             # Offline Piper neural TTS executable, ONNX Runtime & eSpeak
│   └── voices/            # Pre-trained ONNX voice models (Joe, Ryan, Aria, Alan)
├── build/                 # Application icons and packaging assets
├── build.bat              # Windows 1-click batch build script (Portable + Setup)
├── build.ps1              # Windows PowerShell build script with custom flags
├── clean.js               # Clean utility to free temporary electron-builder cache
├── index.html             # Studio UI markup with hardened Content Security Policy
├── styles.css             # Modular CSS stylesheet (no unsafe-inline needed)
├── renderer.js            # Hardened renderer controller, virtual scroller, oscilloscope
├── main.js                # Hardened Electron main process, IPC handlers, child process manager
├── preload.js             # Secure Electron context bridge with unsubscribable listeners
├── mastering.js           # ITU-R BS.1770-4 normalizer, windowed-sinc resampler, SHA-256
├── sfx-catalog.js         # 2,500 Physical SFX database (25 categories x 100 items)
├── sfx-semantic.js        # Rule-based semantic prompt classifier for custom sound requests
├── sfx-synthesizer.js     # Procedural physical acoustic synthesis generators
├── sfx-core.js            # DSP math kernels (modal, granular, non-linear friction, FM)
├── sfx-domain.js          # Vehicle and firearm domain modelers
├── sfx-domain2.js         # Foley, ambient, blast, and creature domain modelers
├── sfx.js                 # Acoustic synthesis router and post-chain limiter
├── test-audio-suite.js    # Comprehensive 15-suite automated regression test runner
├── package.json           # Project manifest, locked dependencies, and electron-builder config
├── package-lock.json      # Committed npm lockfile for 100% reproducible builds
├── LICENSE                # MIT License
├── THIRD-PARTY-LICENSES.md# Authoritative third-party licenses and model attributions
├── CONTRIBUTING.md        # Community contribution guidelines
└── SECURITY.md            # Security vulnerability reporting policy
```

---

## 👤 Author & Brand

* **Developer:** **Mohd Tahir Shaikh**
* **Brand / Studio:** **NEURON TS LABS**
* **Email:** [tahirshaikh744@gmail.com](mailto:tahirshaikh744@gmail.com)
* **GitHub:** [@tahirshaikh744-design](https://github.com/tahirshaikh744-design)

---

## 📄 License

This software and its procedural physical sound effects engine are licensed under the **[MIT License](LICENSE)**. 

All procedural physical sound effects generated by the software are **100% royalty-free** for personal, indie, and commercial game releases. For third-party neural voice model attributions and licensing terms, refer to **[`THIRD-PARTY-LICENSES.md`](THIRD-PARTY-LICENSES.md)**.
