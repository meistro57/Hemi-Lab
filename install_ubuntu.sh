#!/usr/bin/env bash
# Install script for Hemi-Lab ULTRA++ on Ubuntu
set -e

# Update package lists
sudo apt-get update

# Install system packages
sudo apt-get install -y \
    python3 python3-venv python3-pip \
    build-essential libasound2-dev portaudio19-dev

# Node.js is optional for frontend tooling and is no longer installed
# automatically to avoid package conflicts. Install it separately if needed.

# Create and activate virtual environment
python3 -m venv hemi_env
source hemi_env/bin/activate

# Upgrade pip and install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

cat <<'EOM'
Installation complete.
Activate the environment:
  source hemi_env/bin/activate
Then launch the backend:
  python server.py
EOM
