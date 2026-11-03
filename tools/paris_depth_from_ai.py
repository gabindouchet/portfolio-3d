"""Turn an AI depth estimate of the Paris photo into the flat-layer depth map the site uses.

Input   tools/source/paris_depth_ai.webp      colour-mapped depth (matplotlib "Spectral": dark red near,
                                               purple far), same size as the photo, e.g. from a Depth
                                               Anything demo
        tools/source/paris_depth_handmade.png  previous map: only its B channel (lit windows) is kept
Output  public/textures/paris/paris_depth.png  R flat nearness per piece, G sky mask, B lit windows

AI depth has gradients inside surfaces (a roof fades from near to far). Quantising it into bands would
tear one roof into strips, so instead the map is cut only where depth jumps (chimney, roof and facade
edges), each piece gets one flat value (its median depth), and the values are snapped to a few levels.
The sky mask (G) and lit windows (B) come from the hand-made map.
Then run tools/paris_layers.py.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'tools/source/'
OUT = 'public/textures/paris/paris_depth.png'
JUMP = 0.008          # first cut: depth change per pixel that counts as an edge (slopes stay well below)
RANGE = 0.12          # a piece whose depth spans more than this is cut again with half the threshold
MIN_PIECE = 2500      # smaller pieces are compression noise: absorbed by their neighbours
STEP = 0.06           # snap piece depths to this grid
FAR_D = 0.10          # AI depth below this is the distant city (written below R 70, one layer in paris_layers.py)
R_FAR, R_MID, R_NEAR = 31, 70, 199   # output range, same as the hand-made map

# 1. colour map back to depth (0 far, 1 near)
im = np.asarray(Image.open(SRC + 'paris_depth_ai.webp').convert('RGB')).astype(np.float32)
stops = ['9e0142', 'd53e4f', 'f46d43', 'fdae61', 'fee08b', 'ffffbf', 'e6f598', 'abdda4', '66c2a5', '3288bd', '5e4fa2']
cp = np.array([[int(c[i:i + 2], 16) for i in (0, 2, 4)] for c in stops], np.float32)
t = np.linspace(0, 1, 256) * 10; lo = np.floor(t).astype(int).clip(0, 9); f = (t - lo)[:, None]
lut = cp[lo] * (1 - f) + cp[lo + 1] * f
flat = im.reshape(-1, 3); best = np.empty(len(flat), np.int32)
for s in range(0, len(flat), 400000):
    best[s:s + 400000] = ((flat[s:s + 400000, None, :] - lut[None]) ** 2).sum(-1).argmin(1)
n = ndi.median_filter(1 - best.reshape(im.shape[:2]) / 255.0, size=5)
H, W = n.shape

old = np.asarray(Image.open(SRC + 'paris_depth_handmade.png').convert('RGB'))

# 2. sky: the hand-made mask follows the horizon haze better than the AI depth does
sky = old[..., 1] > 127

# 3. cut at depth jumps and give each piece one flat value. A piece that still spans a wide depth range
#    (the city leaks into one blob through soft edges) is cut again with a finer threshold. Near pieces
#    always stay rigid even when sloped (a roof is one piece); far leftovers fall back to depth bands,
#    where the parallax is too small for a band edge to show.
grad = np.hypot(ndi.sobel(n, 0), ndi.sobel(n, 1)) / 8
d = np.zeros_like(n)


def split(mask, jump):
    edge = ndi.binary_dilation(grad > jump, iterations=2 if jump >= 0.008 else 1)   # close gaps in the cuts
    pieces, count = ndi.label(mask & ~edge)
    if count == 0:
        return False
    sizes = ndi.sum(np.ones_like(n), pieces, np.arange(1, count + 1))
    pieces[np.isin(pieces, np.nonzero(sizes < MIN_PIECE)[0] + 1)] = 0
    if pieces.max() == 0:
        return False
    # edge bands and noise go to the nearest real piece: the cut lands mid-way through the blurred edge
    _, (iy, ix) = ndi.distance_transform_edt(pieces == 0, return_indices=True)
    rest = mask & (pieces == 0)
    pieces[rest] = pieces[iy[rest], ix[rest]]
    pieces[~mask] = 0
    for i in np.unique(pieces[pieces > 0]):
        m = pieces == i
        v = n[m]
        med = np.median(v)
        if np.percentile(v, 95) - np.percentile(v, 5) <= RANGE or med >= 0.3:
            d[m] = np.round(med / STEP) * STEP
        elif not (jump > 0.0025 and split(m, jump / 2)):
            d[m] = np.round(v / STEP) * STEP
    return True


split(~sky, JUMP)
# spread the levels over the hand-made range: distant city below R_MID, buildings from R_MID to R_NEAR
top = d[~sky].max()
far_part = R_FAR + (R_MID - 1 - R_FAR) * np.clip(d / FAR_D, 0, 1)
near_part = R_MID + (R_NEAR - R_MID) * np.clip((d - FAR_D) / max(top - FAR_D, 1e-6), 0, 1)
R = np.where(sky, 0, np.round(np.where(d < FAR_D, far_part, near_part))).astype(np.uint8)

out = np.dstack([R, (sky * 255).astype(np.uint8), old[..., 2]])
Image.fromarray(out, 'RGB').save(OUT, optimize=True)

vals, counts = np.unique(R[~sky], return_counts=True)
print('sky %.1f%%' % (100 * sky.mean()))
print('levels (R, share %):', [(int(v), round(100 * c / R.size, 1)) for v, c in zip(vals, counts) if c > 2000])
