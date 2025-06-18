#!/usr/bin/env bash
# Setup script for Hemi-Lab ULTRA++
# Creates a Python virtual environment and installs Python dependencies.

set -e

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate environment
source venv/bin/activate

# Upgrade pip and install requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

cat <<'EOM'
Environment setup complete.
Activate the environment with:
  source venv/bin/activate
EOM

