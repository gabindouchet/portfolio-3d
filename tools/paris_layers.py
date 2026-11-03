"""Split the Paris photo into separate parallax layers.

Reads  public/textures/paris/paris_photo.jpg and paris_depth.png (R nearness, G sky, B lights).
Writes public/textures/paris/paris_layers.png  layer id per pixel (0 sky, 1 distant city, 2.. buildings)
       public/textures/paris/paris_fill.webp   one tile per layer, quarter resolution: the layer's own
                                               colours pushed out behind the layers in front of it, so a
                                               layer that slides sideways reveals plausible content
                                               instead of stretching. Alpha 0 where the layer stops.
       src/scene/paris_layers.json             per-layer nearness and atlas grid, imported by paris.js

Depth map rules: R = nearness. Sky (G > 127) and the distant city (R below FAR_MAX, may be a smooth ramp)
are layers 0 and 1. Every flat grey at or above FAR_MAX becomes its own layer, so paint each cutout group
(a roof with its chimneys, a facade, a balcony rail) as one flat value. Values covering fewer than
MIN_PIXELS pixels are treated as edge antialiasing and snapped to the nearest real layer.

Run from the repo root after changing the photo or the depth map:  python3 tools/paris_layers.py
"""
import json
import numpy as np
from PIL import Image

SRC = 'public/textures/paris/'
FAR_MAX = 70                                         # below this, R is the smooth distant-city ramp
MIN_PIXELS = 10000                                   # about 0.25% of the image: smaller grey values are antialiasing
MAX_LAYERS = 30
Q = 4                                                # fill tiles at 1/4 resolution
REACH = 32                                           # fill reach behind nearer layers, in tile pixels (128 px)
COLS = 5

photo = np.asarray(Image.open(SRC + 'paris_photo.jpg').convert('RGB')).astype(np.float32)
depth = np.asarray(Image.open(SRC + 'paris_depth.png').convert('RGB'))
H, W = depth.shape[:2]
assert photo.shape[:2] == (H, W), f'depth {W}x{H} does not match photo {photo.shape[1]}x{photo.shape[0]}'
R, G = depth[..., 0].astype(np.int32), depth[..., 1]

ids = np.empty((H, W), np.uint8)
sky = G > 127
far = ~sky & (R < FAR_MAX)
build = ~sky & ~far
ids[sky], ids[far] = 0, 1
vals, counts = np.unique(R[build], return_counts=True)
LEVELS = [int(v) for v, c in zip(vals, counts) if c >= MIN_PIXELS]
assert 0 < len(LEVELS) <= MAX_LAYERS - 2, f'{len(LEVELS)} building layers found, keep it under {MAX_LAYERS - 2}'
nearest = np.abs(R[..., None] - np.array(LEVELS)[None, None, :]).argmin(-1)
ids[build] = (nearest[build] + 2).astype(np.uint8)
n_layers = 2 + len(LEVELS)

near = [0.0, float(R[far].mean()) / 255.0 if far.any() else 0.1] + [v / 255.0 for v in LEVELS]
Image.fromarray(ids, 'L').save(SRC + 'paris_layers.png', optimize=True)


def shift(a, dy, dx):
    """Shift without wrapping around the image edges (np.roll would wrap)."""
    out = np.zeros_like(a)
    ys, yd = (slice(0, a.shape[0] - dy), slice(dy, None)) if dy >= 0 else (slice(-dy, None), slice(0, a.shape[0] + dy))
    xs, xd = (slice(0, a.shape[1] - dx), slice(dx, None)) if dx >= 0 else (slice(-dx, None), slice(0, a.shape[1] + dx))
    out[yd, xd] = a[ys, xs]
    return out


def dilate(col, mask, steps):
    """Grow filled pixels into empty ones, averaging filled 8-neighbours, for `steps` rings (or until full)."""
    col, mask = col.copy(), mask.copy()
    for _ in range(steps):
        if mask.all():
            break
        acc = np.zeros_like(col); cnt = np.zeros(mask.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                m = shift(mask, dy, dx)
                acc += shift(col, dy, dx) * m[..., None]
                cnt += m
        grow = ~mask & (cnt > 0)
        col[grow] = acc[grow] / cnt[grow][:, None]
        mask = mask | grow
    return col, mask


th, tw = H // Q, W // Q
rows = (n_layers + COLS - 1) // COLS
atlas = np.zeros((rows * th, COLS * tw, 4), np.uint8)
for k in range(n_layers):
    m = (ids[:th * Q, :tw * Q] == k).astype(np.float32)
    c = photo[:th * Q, :tw * Q] * m[..., None]
    # area-average the layer's own pixels into the tile
    cnt = m.reshape(th, Q, tw, Q).sum((1, 3))
    col = c.reshape(th, Q, tw, Q, 3).sum((1, 3)) / np.maximum(cnt, 1)[..., None]
    have = cnt > 0
    steps = max(th, tw) if k <= 1 else REACH            # sky and distant city sit behind everything
    col, have = dilate(col, have, steps)
    y, x = (k // COLS) * th, (k % COLS) * tw
    atlas[y:y + th, x:x + tw, :3] = np.clip(col, 0, 255).astype(np.uint8)
    atlas[y:y + th, x:x + tw, 3] = have * 255
Image.fromarray(atlas, 'RGBA').save(SRC + 'paris_fill.webp', quality=88, alpha_quality=100, method=6)

with open('src/scene/paris_layers.json', 'w') as f:
    json.dump({'near': [round(v, 4) for v in near], 'cols': COLS, 'rows': rows}, f)
    f.write('\n')

print('layers', n_layers, '(levels', LEVELS, ') tile', tw, 'x', th, 'atlas', COLS, 'x', rows)
print('shares %', [round(100 * float((ids == k).mean()), 1) for k in range(n_layers)])
