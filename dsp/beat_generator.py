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

    def __init__(self, sample_rate=48000, block_size=2048, device='gpu',
                 filter_cutoff=None):
        """Create a new beat generator.

        Parameters
        ----------
        sample_rate : int
            Output sample rate in Hz.
        block_size : int
            Number of samples per generated block.
        device : str
            ``"gpu"`` or ``"cpu"``. Falls back to CPU if GPU unavailable.
        filter_cutoff : float or None, optional
            Cutoff frequency for the optional low-pass filter in Hz. ``None``
            disables the filter.
        """
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.device = device if gpu_available and device == 'gpu' else 'cpu'
        self.phase_left = 0.0
        self.phase_right = 0.0
        self.filter_cutoff = filter_cutoff
        self._filter_state_left = 0.0
        self._filter_state_right = 0.0

    def _xp(self):
        return cp if self.device == 'gpu' else np

    def _lowpass_cpu(self, x, cutoff, state):
        """Simple single-pole low-pass filter for 1D arrays."""
        if cutoff is None:
            return x, state
        dt = 1.0 / self.sample_rate
        rc = 1.0 / (2.0 * np.pi * cutoff)
        alpha = dt / (rc + dt)
        out = np.empty_like(x)
        for i, sample in enumerate(x):
            state = state + alpha * (sample - state)
            out[i] = state
        return out, state

    def _lowpass(self, arr, cutoff, state):
        if self.device == 'gpu':
            cpu_arr, state = self._lowpass_cpu(cp.asnumpy(arr), cutoff, state)
            return cp.asarray(cpu_arr), state
        return self._lowpass_cpu(arr, cutoff, state)

    def _waveform(self, phase, type_):
        xp = self._xp()
        if type_ == 'square':
            return xp.sign(xp.sin(phase))
        if type_ == 'triangle':
            return 2 * xp.arcsin(xp.sin(phase)) / xp.pi
        if type_ == 'sawtooth':
            return (phase / xp.pi % 2) - 1
        return xp.sin(phase)

    def generate(self, carrier=400.0, beat=10.0, mode='binaural', phase_shift=0.0,
                 amplitude=1.0, filter_cutoff=None, waveform='sine'):
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
        amplitude : float, optional
            Output volume multiplier. ``1.0`` is unchanged.
        filter_cutoff : float or None, optional
            Override the object's ``filter_cutoff`` for this call.
        waveform : str, optional
            Oscillator shape: ``'sine'``, ``'square'``, ``'triangle'`` or
            ``'sawtooth'``.
        """
        xp = self._xp()

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

        left = self._waveform(phase_vec_left, waveform)
        right = self._waveform(phase_vec_right, waveform)

        # update phase for continuity
        self.phase_left = float((phase_vec_left[-1] + phase_inc_left) % (2 * xp.pi))
        next_right = (base_right[-1] + phase_inc_right) % (2 * xp.pi)
        self.phase_right = float(next_right)

        # Optional low-pass filtering to reduce high-frequency static
        cutoff = filter_cutoff if filter_cutoff is not None else self.filter_cutoff
        if cutoff is not None:
            left, self._filter_state_left = self._lowpass(
                left, cutoff, self._filter_state_left
            )
            right, self._filter_state_right = self._lowpass(
                right, cutoff, self._filter_state_right
            )

        if amplitude != 1.0:
            left *= amplitude
            right *= amplitude

        if mode == 'monaural':
            mono = (left + right) * 0.5
            return xp.stack([mono, mono])
        return xp.stack([left, right])
