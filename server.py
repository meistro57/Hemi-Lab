"""
server.py: WebSocket server for audio streaming using binaural beats.
The server processes client requests and streams generated audio blocks.
"""

import asyncio
import json
import websockets
import argparse
import numpy as np
import sounddevice as sd
import http.server
import threading
import functools
import os
# import ssl  # Uncomment if using SSL/TLS

from dsp.beat_generator import BeatGenerator

SAMPLE_RATE = 48000
BLOCK_SIZE = 2048
clients = set()
# Enable verbose debug output with the ``--debug`` CLI flag
DEBUG = False

def pack_audio(block):
    """
    Convert audio block from 64-bit float to 32-bit PCM format.
    This is necessary for compatibility with most audio processing systems.
    """
    block32 = block.astype('float32')
    return block32.tobytes()

def validate_params(params):
    """
    Ensure the parameters are within valid ranges.
    """
    if not (20.0 <= params.get('carrier', 400.0) <= 20000.0):
        print("Carrier frequency out of range. Setting to default (400.0).")
        params['carrier'] = 400.0
    if not (0.1 <= params.get('beat', 10.0) <= 30.0):
        print("Beat frequency out of range. Setting to default (10.0).")
        params['beat'] = 10.0
    if not (0.0 <= params.get('phase_shift', 0.0) <= 360.0):
        print("Phase shift out of range. Setting to default (0.0).")
        params['phase_shift'] = 0.0
    amp = params.get('amplitude', 1.0)
    if not (0.0 <= amp <= 2.0):
        print("Amplitude out of range. Setting to default (1.0).")
        params['amplitude'] = 1.0
    cutoff = params.get('filter_cutoff')
    if cutoff is not None:
        if not (10.0 <= cutoff <= params.get('sample_rate', SAMPLE_RATE) / 2):
            print("Filter cutoff out of range. Disabling filter.")
            params['filter_cutoff'] = None
    waveform = params.get('waveform', 'sine')
    if waveform not in ['sine', 'square', 'triangle', 'sawtooth']:
        print("Invalid waveform. Defaulting to sine.")
        params['waveform'] = 'sine'
    # You may add more param validation as needed

def play_test_sweep(duration=5.0, start=200.0, end=800.0):
    """Play a short frequency sweep for quick audio testing."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    freqs = np.linspace(start, end, t.size)
    wave = np.sin(2 * np.pi * freqs * t)
    stereo = np.stack([wave, wave], axis=1)
    sd.play(stereo, SAMPLE_RATE)
    sd.wait()

def start_static_server(port=8000, directory="www"):
    """Launch a simple HTTP server to host the frontend."""
    # Resolve directory relative to this file so server works when launched
    # from other working directories.
    directory = os.path.join(os.path.dirname(__file__), directory)
    handler = functools.partial(
        http.server.SimpleHTTPRequestHandler, directory=directory
    )
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    print(
        f"HTTP server running on http://0.0.0.0:{port} serving {os.path.relpath(directory)}/"
    )
    return httpd

async def audio_stream(websocket):
    generator = BeatGenerator(sample_rate=SAMPLE_RATE, block_size=BLOCK_SIZE)
    params = {
        'carrier': 400.0,
        'beat': 10.0,
        'mode': 'binaural',
        'phase_shift': 0.0,
        'amplitude': 1.0,
        'filter_cutoff': None,
        'waveform': 'sine',
        'focus_level': ''
    }

    swirl_phase = 0.0
    delta_phase = 0.0


    async def recv_loop():
        async for msg in websocket:
            try:
                updates = json.loads(msg)
                params.update(updates)
                validate_params(params)
                generator.filter_cutoff = params.get('filter_cutoff')
                if DEBUG:
                    print(f"Received updates: {updates}")
                    print(f"Updated params: {params}")
            except json.JSONDecodeError as e:
                print(f"Failed to decode JSON: {e}")
                continue

    recv_task = asyncio.create_task(recv_loop())
    try:
        while True:
            try:
                focus = params.get('focus_level', '')
                beat = params.get('beat', 10.0)
                phase_shift = params.get('phase_shift', 0.0)
                amp = params.get('amplitude', 1.0)

                if focus == '10':
                    beat = 7.0
                elif focus == '12':
                    swirl_phase += 2 * np.pi * 0.05 * BLOCK_SIZE / SAMPLE_RATE
                    beat = 8.5
                    phase_shift = 45.0 * np.sin(swirl_phase)
                elif focus == '15':
                    delta_phase += 2 * np.pi * 0.75 * BLOCK_SIZE / SAMPLE_RATE
                    beat = 7.0
                    amp = amp * (1.0 + 0.3 * np.sin(delta_phase))
                elif focus == '21':
                    beat = 10.0 + np.random.uniform(-0.5, 0.5)
                    phase_shift = phase_shift + np.random.uniform(-1.0, 1.0)

                block = generator.generate(
                    carrier=params.get('carrier', 400.0),
                    beat=beat,
                    mode=params.get('mode', 'binaural'),
                    phase_shift=phase_shift,
                    amplitude=amp,
                    filter_cutoff=params.get('filter_cutoff'),
                    waveform=params.get('waveform', 'sine'),
                )
                await asyncio.gather(
                    websocket.send(pack_audio(block)),
                    asyncio.sleep(BLOCK_SIZE / SAMPLE_RATE)
                )
            except websockets.ConnectionClosed as e:
                print(f"Connection closed: {e}")
                break
    finally:
        recv_task.cancel()

async def handler(websocket):
    clients.add(websocket)
    try:
        await audio_stream(websocket)
    finally:
        clients.discard(websocket)  # discard avoids KeyError if already removed

async def main(host='0.0.0.0', port=8765):
    # Host/port validation for extra safety
    if host not in ['0.0.0.0', '127.0.0.1']:
        raise ValueError("Invalid host. Use '0.0.0.0' or '127.0.0.1'.")
    if not (1024 <= port <= 65535):
        raise ValueError("Port must be between 1024 and 65535.")

    # SSL/TLS support (optional)
    # ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    # ssl_context.load_cert_chain(certfile="path/to/cert.pem", keyfile="path/to/key.pem")
    # async with websockets.serve(handler, host, port, ssl=ssl_context, max_size=None):

    async with websockets.serve(handler, host, port, max_size=None):
        print(f"Server running on ws://{host}:{port}")
        await asyncio.Future()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Hemi-Lab ULTRA++ Server")
    parser.add_argument('--host', default='0.0.0.0', help='Bind address')
    parser.add_argument('--port', type=int, default=8765, help='WebSocket port')
    parser.add_argument('--http-port', type=int, default=8000,
                        help='Port for static file server')
    parser.add_argument('--test-sweep', action='store_true',
                        help='Play a sample sweep and exit')
    parser.add_argument('--debug', action='store_true',
                        help='Enable verbose debug logging')
    args = parser.parse_args()

    if args.debug:
        DEBUG = True

    if args.test_sweep:
        play_test_sweep()
    else:
        httpd = start_static_server(port=args.http_port)
        try:
            asyncio.run(main(host=args.host, port=args.port))
        except KeyboardInterrupt:
            print("Server shutting down...")
        finally:
            httpd.shutdown()
