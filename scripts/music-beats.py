"""Beat tracking for a fiddle recording: onset envelope, tempo by
autocorrelation, then Ellis-style dynamic programming. Prints JSON."""
import json, subprocess, sys
import numpy as np

src = sys.argv[1]
# Optional tempo search range (bpm): a hornpipe's dotted rhythm can lock on 2/3 tempo.
LO, HI = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (80, 170)
SR, HOP, NFFT = 22050, 256, 1024
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
y = np.frombuffer(raw, dtype=np.float32)
frames = 1 + (len(y) - NFFT) // HOP
win = np.hanning(NFFT).astype(np.float32)
idx = np.arange(NFFT)[None, :] + HOP * np.arange(frames)[:, None]
spec = np.abs(np.fft.rfft(y[idx] * win, axis=1))
# Fiddle and guitar energy (100 Hz - 5 kHz), log compressed.
freqs = np.fft.rfftfreq(NFFT, 1 / SR)
band = (freqs > 100) & (freqs < 5000)
logspec = np.log1p(100 * spec[:, band])
flux = np.maximum(0, np.diff(logspec, axis=0)).sum(axis=1)
flux = np.concatenate([[0], flux])
# Remove slow trend, normalize.
k = int(SR / HOP * 1.0)
trend = np.convolve(flux, np.ones(k) / k, mode='same')
onset = np.maximum(0, flux - trend)
onset /= onset.std() + 1e-9
fps = SR / HOP

# Tempo: autocorrelation, weighted toward 120 bpm (a reel's quarter note).
ac = np.correlate(onset, onset, mode='full')[len(onset) - 1:]
lags = np.arange(len(ac))
bpm = 60 * fps / np.maximum(lags, 1)
ok = (bpm > LO) & (bpm < HI)
weight = np.exp(-0.5 * (np.log2(bpm / 120) / 0.6) ** 2)
score = np.where(ok, ac * weight, 0)
period = int(np.argmax(score))
tempo = 60 * fps / period

# Dynamic programming beat tracking (tightness keeps beats near the period).
tight = 400
n = len(onset)
best = onset.copy()
back = np.full(n, -1)
for t in range(n):
    lo, hi = t - 2 * period, t - period // 2
    if hi <= 0:
        continue
    lo = max(0, lo)
    prev = np.arange(lo, hi)
    pen = -tight * (np.log((t - prev) / period)) ** 2
    cand = best[prev] + pen
    j = int(np.argmax(cand))
    best[t] = onset[t] + cand[j]
    back[t] = prev[j]
# Start from the best final beat in the last period.
t = int(np.argmax(best[n - period:])) + n - period
beats = []
while t >= 0:
    beats.append(t)
    t = back[t]
beats = np.array(beats[::-1]) / fps

# Where the music starts: the first frame the energy passes a fifth of its median.
energy = logspec.sum(axis=1)
start = float(np.argmax(energy > 0.2 * np.median(energy)) / fps)
intervals = np.diff(beats)
print(json.dumps({
    'tempo': round(float(tempo), 2),
    'beats': [round(float(b), 4) for b in beats],
    'musicStart': round(start, 3),
    'duration': round(len(y) / SR, 3),
    'intervalMedian': round(float(np.median(intervals)), 4),
    'intervalSpread': [round(float(np.percentile(intervals, p)), 4) for p in (5, 50, 95)],
}))
