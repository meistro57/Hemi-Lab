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
 - 🎛️ Adjustable carriers, beat frequencies, sweep ranges, and channel phase offsets
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
- Node.js (optional, for frontend tooling; install separately if needed)
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

# Launch the server (backend + frontend)
python server.py

# Play a quick frequency sweep for testing
python server.py --test-sweep

The server also hosts the frontend on port 8000 by default. Use `--http-port` to
change it if needed.
```

Then open `http://localhost:8000` in your browser and use the UI controls to adjust carrier frequency, beat frequency, phase shift and mode.

### Quick Ubuntu Setup

A helper script is available to streamline installation on Ubuntu systems:

```bash
./install_ubuntu.sh
```

The script installs required system packages, creates a Python virtual environment and installs all Python dependencies. It does not install Node.js; install it separately if you need frontend tooling. After the script finishes, activate the environment and run the server:

```bash
source hemi_env/bin/activate
python server.py
```

