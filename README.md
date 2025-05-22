# HEMI-LAB ULTRA++

🧠 Real-Time GPU-Accelerated Brainwave Entrainment Platform  
🎧 Scientific Binaural & Monaural Audio Synthesis in the Browser  
🚀 Modular. Expandable. Consciousness-Altering.

---

## 🌟 Overview

**Hemi-Lab ULTRA++** is a browser-based, real-time brainwave entrainment tool designed for researchers, developers, and awakened minds alike. It leverages GPU-accelerated audio processing and precision-controlled frequency modulation to generate scientifically accurate binaural and monaural beats. Whether you're exploring consciousness, building neuro-acoustic experiments, or just want a deeply customizable focus tool—this is your launchpad.

---

## ⚙️ Features

- 🎶 **Sub-0.1Hz precision** for binaural/monaural beat frequency control
- 🔊 Real-time Web Audio playback using `AudioWorklet`
- ⚡ WebSocket-powered DSP backend in Python (CUDA with PyTorch or CuPy)
- 🧪 Full EEG-band targeting: Delta, Theta, Alpha, Beta, Gamma
- 🎛️ Adjustable carriers, beat frequencies, sweep ranges, and phase offsets
- 🧬 Modular architecture ready for future EEG feedback integration
- 🧠 Experimental **resonance feedback AI agent** (coming soon)
- 🌐 Cross-platform UI in-browser (works on Linux/Windows/macOS)
- 🎨 Live channel visualizer and harmonic analysis
- 🔒 Fully self-hosted, no internet dependency

---

## 🧰 Tech Stack

| Component       | Technology                          |
|----------------|--------------------------------------|
| Backend         | Python 3.x + asyncio                 |
| DSP Engine      | PyTorch or CuPy (GPU-accelerated)   |
| Frontend        | HTML + JS (Web Audio API + Canvas)  |
| Audio Pipeline  | WebSocket + AudioWorklet             |
| Dev Platform    | Linux + Windows via WSL2             |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js (optional, for frontend tooling)
- Modern browser (Chrome/Edge/Firefox)
- CUDA-enabled GPU recommended (NVIDIA)

### Setup Instructions

```bash
# Clone the repo
git clone https://github.com/YOUR-USERNAME/hemi-lab-ultra.git
cd hemi-lab-ultra

# Create a virtual environment
python -m venv hemi_env
source hemi_env/bin/activate  # On Windows: hemi_env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Launch the backend
python backend/server.py

# Open frontend in browser
# Navigate to http://localhost:8000 (served via simple HTTP server or Flask)
