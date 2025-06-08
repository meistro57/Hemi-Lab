"""
server.py: WebSocket server for audio streaming using binaural beats.
The server processes client requests and streams generated audio blocks.
"""

import asyncio
import json
import struct
import websockets
# import ssl  # Uncomment if using SSL/TLS

from dsp.beat_generator import BeatGenerator

SAMPLE_RATE = 48000
BLOCK_SIZE = 2048
clients = set()
DEBUG = True  # Set to False to reduce logging

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
    # You may add more param validation as needed

async def audio_stream(websocket):
    generator = BeatGenerator(sample_rate=SAMPLE_RATE, block_size=BLOCK_SIZE)
    params = {'carrier': 400.0, 'beat': 10.0, 'mode': 'binaural'}

    async def recv_loop():
        async for msg in websocket:
            try:
                updates = json.loads(msg)
                params.update(updates)
                validate_params(params)
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
                block = generator.generate(**params)
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
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server shutting down...")
