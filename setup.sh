#!/usr/bin/env bash
# Setup script for Hemi-Lab ULTRA++
# Creates a Python virtual environment and installs Python dependencies.

set -e

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv || { echo "Failed to create virtual environment" >&2; exit 1; }
fi

# Activate environment
source venv/bin/activate || { echo "Failed to activate virtualenv" >&2; exit 1; }

# Upgrade pip and install requirements
python -m pip install --upgrade pip || { echo "Pip upgrade failed" >&2; exit 1; }
pip install -r requirements.txt || { echo "Requirements installation failed" >&2; exit 1; }

cat <<'EOM'
Environment setup complete.
Activate the environment with:
  source venv/bin/activate
EOM

