"""Find where the tune's A part starts on the beat grid: beat-synchronous
chroma, then the beat offset whose 16-beat phrases best repeat as AABB
(A1 like A2, B1 like B2, each time through like the next)."""
import json, subprocess, sys
import numpy as np

src, beats_json = sys.argv[1], sys.argv[2]
beats = np.array(json.load(open(beats_json))['beats'])
SR, HOP, NFFT = 22050, 512, 4096
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
y = np.frombuffer(raw, dtype=np.float32)
frames = 1 + (len(y) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(frames)[:, None]
spec = np.abs(np.fft.rfft(y[idx] * np.hanning(NFFT), axis=1))
freqs = np.fft.rfftfreq(NFFT, 1 / SR)
use = (freqs > 150) & (freqs < 3000)
pitch = (np.round(12 * np.log2(freqs[use] / 440)) % 12).astype(int)
chroma = np.zeros((frames, 12))
for c in range(12):
    chroma[:, c] = spec[:, use][:, pitch == c].sum(axis=1)
times = (np.arange(frames) * HOP + NFFT / 2) / SR
# One chroma vector per beat.
bc = []
for i in range(len(beats) - 1):
    m = (times >= beats[i]) & (times < beats[i + 1])
    v = chroma[m].mean(axis=0) if m.any() else np.zeros(12)
    bc.append(v / (np.linalg.norm(v) + 1e-9))
bc = np.array(bc)

def seg(p, L=16):
    return bc[p:p + L].ravel() if p + L <= len(bc) else None

def sim(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)) if a is not None and b is not None else None

results = []
for off in range(0, 64):
    s_rep, s_diff, n = 0.0, 0.0, 0
    for k in range(0, 6):
        p = off + 64 * k
        a1, a2, b1, b2 = seg(p), seg(p + 16), seg(p + 32), seg(p + 48)
        if any(x is None for x in (a1, a2, b1, b2)):
            break
        s_rep += sim(a1, a2) + sim(b1, b2)
        s_diff += sim(a1, b1)
        n += 1
    if n:
        results.append((s_rep / (2 * n) - 0.5 * s_diff / n, off, n))
results.sort(reverse=True)
print(json.dumps({'best': [{'score': round(r[0], 4), 'offset': r[1], 'times': r[2], 'at': round(float(beats[r[1]]), 3)} for r in results[:8]]}))
