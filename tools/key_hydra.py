# Вырезает зелёный фон из исходников гидры и снимает геометрию для config.js.
# Запуск из корня репозитория: python3 tools/key_hydra.py
import json, sys
import numpy as np
from PIL import Image

import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/sprites/src') + '/'
OUT = os.path.join(ROOT, 'assets/creatures') + '/'
H_OUT = 720  # высота выходного спрайта, px

def key(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    excess = g - np.maximum(r, b)              # насколько зелёного больше, чем красного и синего
    alpha = 255 * (1 - np.clip((excess - 25) / 55, 0, 1))
    # подавление зелёной каймы: где есть альфа, зелёный не выше max(r,b)
    g2 = np.minimum(g, np.maximum(r, b) + 4)
    out = np.stack([r, g2, b, alpha], -1)
    out[..., :3] = np.where((alpha > 0)[..., None], out[..., :3], 0)
    return out.clip(0, 255).astype(np.uint8)


def main():
    keyed = {n: key(SRC + f'hydra_{n}_src.png') for n in ['idle', 'strike']}
    # общая рамка: объединение непрозрачных областей обоих кадров
    x0s, x1s, y0s, y1s = [], [], [], []
    for rgba in keyed.values():
        ys, xs = np.where(rgba[..., 3] > 8)
        x0s.append(xs.min()); x1s.append(xs.max() + 1); y0s.append(ys.min()); y1s.append(ys.max() + 1)
    X0, X1, Y0, Y1 = min(x0s), max(x1s), min(y0s), max(y1s)
    res = {}
    for name, rgba in keyed.items():
        crop = rgba[Y0:Y1, X0:X1]
        h, w = crop.shape[:2]
        W = round(w * H_OUT / h)
        img = Image.fromarray(crop, 'RGBA').resize((W, H_OUT), Image.LANCZOS)
        img.save(OUT + f'hydra_{name}.webp', 'WEBP', quality=92)
        m = np.asarray(img)[..., 3] > 128
        H, Wd = m.shape
        yy, xx = np.where(m)
        bottom = yy >= H * 0.94
        pivot = (float(xx[bottom].min()) / Wd, float(yy.max()) / H)
        arr = np.asarray(img).astype(np.float32)
        core = (arr[..., 0] > 200) & (arr[..., 1] > 110) & (arr[..., 2] < 150) & (arr[..., 3] > 128)
        cy, cx = np.where(core)
        crown = (float(cx.mean()) / Wd, float(cy.mean()) / H) if cx.size else None
        pts = np.column_stack([xx, yy])[::max(1, len(xx) // 3000)]
        from scipy.spatial import ConvexHull
        hull = ConvexHull(pts)
        hv = [(float(pts[i][0]) / Wd, float(pts[i][1]) / H) for i in hull.vertices]
        circles = []
        for fy in np.linspace(0.12, 0.78, 8):
            row = int(fy * H)
            xs_r = np.where(m[row])[0]
            if xs_r.size < 4: continue
            breaks = np.where(np.diff(xs_r) > 1)[0]
            run = max(np.split(xs_r, breaks + 1), key=len)
            circles.append({'x': float(run.mean()) / Wd, 'y': fy, 'r': float(run.size / 2) / H})
        res[name] = {'size': [W, H_OUT], 'pivot': pivot, 'crown': crown, 'hull': hv, 'stalk': circles}
    with open(S_OUT, 'w') as f:
        json.dump(res, f)
    print('ok', {k: (v['size'], [round(c,3) for c in v['pivot']], [round(c,3) for c in v['crown']], len(v['hull']), len(v['stalk'])) for k, v in res.items()})

S_OUT = os.path.join(ROOT, 'tools', 'hydra_geom.json')
main()
