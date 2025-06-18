#!/usr/bin/env bash
# Install script for Hemi-Lab ULTRA++ on Ubuntu
set -e

# Update package lists
sudo apt-get update || { echo "Failed to update package list" >&2; exit 1; }

# Install system packages
sudo apt-get install -y \
    python3 python3-venv python3-pip \
    build-essential libasound2-dev portaudio19-dev || { echo "Package installation failed" >&2; exit 1; }

# Node.js is optional for frontend tooling and is no longer installed
# automatically to avoid package conflicts. Install it separately if needed.

# Create and activate virtual environment
python3 -m venv hemi_env || { echo "Virtualenv creation failed" >&2; exit 1; }
source hemi_env/bin/activate || { echo "Failed to activate virtualenv" >&2; exit 1; }

# Upgrade pip and install Python dependencies
pip install --upgrade pip || { echo "Pip upgrade failed" >&2; exit 1; }
pip install -r requirements.txt || { echo "Python dependencies failed" >&2; exit 1; }

cat <<'EOM'
Installation complete.
Activate the environment:
  source hemi_env/bin/activate
Then launch the backend:
  python server.py
EOM
