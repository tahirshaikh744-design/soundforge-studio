# Contributing to SoundForge Studio

Thank you for your interest in contributing to **SoundForge Studio**! 
This project is developed and maintained by **Mohd Tahir Shaikh** at **NEURON TS LABS**.

---

## How to Contribute

### 1. Reporting Bugs
- Check the [Issues tab](https://github.com/tahirshaikh744-design/soundforge-studio/issues) to ensure your issue hasn't already been reported.
- Include your OS version, steps to reproduce, and any console or error logs.

### 2. Suggesting Physical Acoustic Models
- We welcome new procedural synthesis models for game sound design!
- Ensure all physical models are implemented purely in code (`sfx-synthesizer.js`, `sfx-core.js`) without external samples.
- Every model must be deterministic (respecting the PRNG seed) and adhere to the zero-DC, click-free edge fade standard.

### 3. Submitting Pull Requests
1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-new-feature`
3. Make your changes and verify all quality tests pass:
   ```bash
   npm test
   ```
4. Commit your changes: `git commit -am 'Add new physical model'`
5. Push to the branch: `git push origin feature/my-new-feature`
6. Submit a Pull Request.

---

## Code Style & Audio Quality Guidelines
- Maintain strict ITU-R BS.1770-4 loudness compliance and -1.0 dBTP lookahead limiter ceilings.
- Always apply raised-cosine edge micro-fades (3ms attack / 6ms decay) to prevent speaker pops on mobile devices.
- Code should be clean, modular, and dependency-free where possible.
