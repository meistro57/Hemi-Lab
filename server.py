import asyncio
import json
import struct

import websockets

from dsp.beat_generator import BeatGenerator

SAMPLE_RATE = 48000
BLOCK_SIZE = 2048

clients = set()

def pack_audio(block):
    """Pack 2xN float64 block to little-endian 32-bit float PCM."""
    block32 = block.astype('float32')
    return block32.tobytes()

async def audio_stream(websocket):
    generator = BeatGenerator(sample_rate=SAMPLE_RATE, block_size=BLOCK_SIZE)
    params = {'carrier': 400.0, 'beat': 10.0, 'mode': 'binaural'}

    async def recv_loop():
        async for msg in websocket:
            try:
                updates = json.loads(msg)
                params.update(updates)
            except json.JSONDecodeError:
                continue

    recv_task = asyncio.create_task(recv_loop())
    try:
        while True:
            block = generator.generate(**params)
            await websocket.send(pack_audio(block))
            await asyncio.sleep(BLOCK_SIZE / SAMPLE_RATE)
    finally:
        recv_task.cancel()

async def handler(websocket):
    clients.add(websocket)
    try:
        await audio_stream(websocket)
    finally:
        clients.remove(websocket)


async def main(host='0.0.0.0', port=8765):
    async with websockets.serve(handler, host, port, max_size=None):
        print(f"Server running on ws://{host}:{port}")
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
