import numpy as np

# Attempt to import CuPy for GPU acceleration. If the library is missing or
# fails to initialize (e.g. due to missing CUDA libraries), gracefully fall back
# to NumPy so the application continues to work using the CPU.
try:
    import cupy as _cp  # noqa: F401
    try:
        # A trivial operation to verify CUDA availability. Any failure here means
        # we should not attempt to use the GPU backend.
        _cp.zeros(1)
        cp = _cp
        gpu_available = True
    except Exception as e:  # pragma: no cover - depends on system libs
        print(f"CuPy initialization failed: {e}; falling back to CPU")
        cp = np
        gpu_available = False
except ImportError:  # pragma: no cover - CuPy not installed
    cp = np
    gpu_available = False


class BeatGenerator:
    """Generate binaural or monaural beats using GPU if available."""

    def __init__(self, sample_rate=48000, block_size=2048, device='gpu'):
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.device = device if gpu_available and device == 'gpu' else 'cpu'
        self.phase_left = 0.0
        self.phase_right = 0.0

    def _xp(self):
        return cp if self.device == 'gpu' else np

    def generate(self, carrier=400.0, beat=10.0, mode='binaural', phase_shift=0.0):
        """Generate a block of audio samples.

        Parameters
        ----------
        carrier : float
            Base carrier frequency in Hz.
        beat : float
            Binaural/monaural beat frequency in Hz.
        mode : str
            Either ``'binaural'`` or ``'monaural'``.
        phase_shift : float
            Relative phase shift between left and right channels in degrees.
        """
        xp = self._xp()
        t = xp.arange(self.block_size, dtype=xp.float64) / self.sample_rate

        if mode == 'binaural':
            left_freq = carrier - beat / 2.0
            right_freq = carrier + beat / 2.0
        else:  # monaural
            left_freq = right_freq = carrier

        phase_inc_left = 2 * xp.pi * left_freq / self.sample_rate
        phase_inc_right = 2 * xp.pi * right_freq / self.sample_rate

        phase_shift_rad = xp.deg2rad(phase_shift)

        base_right = self.phase_right + phase_inc_right * xp.arange(self.block_size, dtype=xp.float64)
        phase_vec_left = self.phase_left + phase_inc_left * xp.arange(self.block_size, dtype=xp.float64)
        phase_vec_right = base_right + phase_shift_rad

        left = xp.sin(phase_vec_left)
        right = xp.sin(phase_vec_right)

        # update phase for continuity
        self.phase_left = float((phase_vec_left[-1] + phase_inc_left) % (2 * xp.pi))
        next_right = (base_right[-1] + phase_inc_right) % (2 * xp.pi)
        self.phase_right = float(next_right)

        if mode == 'monaural':
            mono = (left + right) * 0.5
            return xp.stack([mono, mono])
        return xp.stack([left, right])
