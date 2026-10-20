"""Depth-buffer actual mesh projections, then assemble the two role rows."""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/dancer-appearance')
for view in ['front', 'rear']:
    data = json.loads((root / f'{view}.json').read_text())
    width, height = data['width'], data['height']
    sheet = Image.new('RGB', (width * 6, (height + 48) * 2 + 62), '#f2f0e9')
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 12), f'Default six couples | {view} view | actual Avatar meshes, offline CPU projection', fill='#25483e')
    draw.text((20, 32), 'Top: Larks. Bottom: Robins. Appearance stays with each dancer through role changes, seeks and reloads.', fill='#25483e')
    for panel in data['panels']:
        pixels = np.full((height, width, 3), [242, 240, 233], dtype=np.uint8)
        depth = np.full((height, width), np.inf)
        for poly in panel['polys']:
            a, b, c = np.array(poly['points'])
            x0, x1 = max(0, int(np.floor(min(a[0], b[0], c[0])))), min(width - 1, int(np.ceil(max(a[0], b[0], c[0]))))
            y0, y1 = max(0, int(np.floor(min(a[1], b[1], c[1])))), min(height - 1, int(np.ceil(max(a[1], b[1], c[1]))))
            if x1 < x0 or y1 < y0:
                continue
            denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(denominator) < 1e-8:
                continue
            yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
            xx, yy = xx + .5, yy + .5
            wa = ((b[1] - c[1]) * (xx - c[0]) + (c[0] - b[0]) * (yy - c[1])) / denominator
            wb = ((c[1] - a[1]) * (xx - c[0]) + (a[0] - c[0]) * (yy - c[1])) / denominator
            wc = 1 - wa - wb
            z = wa * a[2] + wb * b[2] + wc * c[2]
            patch = depth[y0:y1 + 1, x0:x1 + 1]
            mask = (wa >= -1e-7) & (wb >= -1e-7) & (wc >= -1e-7) & (z < patch)
            patch[mask] = z[mask]
            pixels[y0:y1 + 1, x0:x1 + 1][mask] = poly['color']
        x, y = panel['couple'] * width, (panel['id'] % 2) * (height + 48) + 62
        sheet.paste(Image.fromarray(pixels), (x, y))
        label = f"{panel['role'].capitalize()} {panel['couple'] + 1}"
        draw.text((x + 18, y + height), label, fill='#25483e')
        appearance = panel['appearance']
        draw.text((x + 18, y + height + 17), f"{appearance['bodyShape']} / {appearance['hairType']}", fill='#25483e')
    path = root / f'appearance-{view}.png'
    sheet.save(path)
    print(path)
