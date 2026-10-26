"""Original, seamless ambient bed. No samples or external music libraries.
Re-run with Python + NumPy to replace public/audio/ambient.wav.
"""
from pathlib import Path
import wave
import numpy as np

rate = 22050
seconds = 32
n = rate * seconds
t = np.arange(n, dtype=np.float64) / rate
rng = np.random.default_rng(104)
# Every carrier and modulation completes an integer number of cycles per loop.
# An open C/G/D voicing, mostly sub-fundamental and breath, without a melody.
left = np.zeros(n)
right = np.zeros(n)
for i, (frequency, gain) in enumerate([(65.406,.12),(130.813,.10),(195.998,.075),(261.626,.045),(293.665,.035),(391.995,.018)]):
    f = round(frequency * seconds) / seconds
    phase = rng.uniform(0, 2*np.pi)
    breath = .74 + .16*np.sin(2*np.pi*t/seconds + i*.9) + .10*np.cos(4*np.pi*t/seconds-i)
    tone = np.sin(2*np.pi*f*t + phase) * breath
    # Low, diffuse overtones rather than a bright, synthetic oscillator.
    tone += .08*np.sin(2*np.pi*f*2*t + phase*.6)
    left += tone * gain * (.85 + .15*np.sin(i))
    right += np.roll(tone, int(rate*(.009 + i*.005))) * gain * (.85 + .15*np.cos(i))
# Circular convolution gives a subtle, loop-safe room tail.
for delay, gain in [(.27,.12),(.41,.08),(.71,.045), (1.13,.025)]:
    left += np.roll(right, int(delay*rate)) * gain
    right += np.roll(left, int(delay*rate*1.09)) * gain
stereo = np.stack([left, right], axis=1)
stereo *= .32 / np.max(np.abs(stereo))
output = Path(__file__).resolve().parents[1] / 'public/audio/ambient.wav'
output.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(output), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(rate)
    wav.writeframes((stereo * 32767).astype('<i2').tobytes())
print(f'Wrote {output} ({output.stat().st_size:,} bytes)')
