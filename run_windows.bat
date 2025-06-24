@echo off
REM Auto-update the repository
cd /d %~dp0
git pull

REM Create Python virtual environment if missing
if not exist venv (
    python -m venv venv
)

REM Activate the virtual environment
call venv\Scripts\activate

REM Ensure required packages are installed
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Launch the application
python server.py
