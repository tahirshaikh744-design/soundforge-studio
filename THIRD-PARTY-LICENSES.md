# Third-Party Licenses & Attributions

SoundForge Studio is developed by **Mohd Tahir Shaikh** (**NEURON TS LABS**). 
This application bundles and interfaces with several open-source technologies, neural engines, and pre-trained voice checkpoints. 
Below is a full accounting of their licenses and legal attributions.

---

## 1. Piper Text-to-Speech Engine
* **Project:** [Piper](https://github.com/rhasspy/piper)
* **Author:** Michael Hansen / Rhasspy / Open Home Foundation
* **License:** **MIT License**
* **Copyright:** Copyright (c) 2022-2025 Michael Hansen

```text
MIT License

Copyright (c) 2022 Michael Hansen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. ONNX Runtime
* **Project:** [ONNX Runtime](https://github.com/microsoft/onnxruntime)
* **Author:** Microsoft Corporation
* **License:** **MIT License**
* **Copyright:** Copyright (c) Microsoft Corporation. All rights reserved.

---

## 3. eSpeak-NG
* **Project:** [eSpeak-NG Phonemizer](https://github.com/espeak-ng/espeak-ng)
* **License:** **GNU General Public License v3.0 (GPL-3.0)**
* **Note:** Used as a shared library / subprocess for phonemization under standard LGPL/GPL dynamic execution conventions.

---

## 4. Piper Phonemize
* **Project:** [piper-phonemize](https://github.com/rhasspy/piper-phonemize)
* **Author:** Michael Hansen
* **License:** **MIT License**

---

## 5. Neural Voice Checkpoints (`engine/voices/`)
Voice models in Piper are derived from diverse speech datasets and distributed via Hugging Face (`rhasspy/piper-voices`). Each voice model retains the licensing terms of its source corpus:

| Model File | Voice Name | Origin Dataset | Dataset License | Permitted Usage |
| :--- | :--- | :--- | :--- | :--- |
| `Joe.onnx` | Joe (US English) | OHF-Voice / Open Home | **CC0 1.0 Universal (Public Domain)** | Commercial & Non-Commercial |
| `Ryan.onnx` | Ryan (US English) | RyanSpeech Corpus | **CC BY-NC-SA 4.0** | Personal / Open-Source / Non-Commercial |
| `Aria.onnx` | Aria (US English) | HFC Female Speech Dataset | **CC BY-NC-SA 4.0** | Personal / Open-Source / Non-Commercial |
| `Alan.onnx` | Alan (British English) | Mycroft Mimic 3 (apope) | **CC BY-SA 4.0 / Research** | Personal / Open-Source / Non-Commercial |

*For commercial game production, use voices generated with **Joe** or import models trained on public domain / CC0 datasets (such as LibriTTS or LJSpeech).*

---

## 6. Procedural Physical SFX Synthesizer
* **Author:** Mohd Tahir Shaikh (NEURON TS LABS)
* **License:** **MIT License (100% Royalty-Free)**
* **Details:** All 2,500 physical acoustic models (rubber friction tire physics, modal metal/wood collisions, energy blasts, fluid dynamics, and foley) are synthesized procedurally in real-time JavaScript with zero external audio samples. All exported SFX assets are 100% royalty-free for commercial and indie game developers.
