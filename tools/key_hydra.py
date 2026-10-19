# Вырезает фон из исходников гидры и снимает геометрию для config.js.
# Фон определяется по углу картинки: зелёный или магента (#FF00FF).
# Запуск из корня репозитория: python3 tools/key_hydra.py
import json, os
import numpy as np
from PIL import Image
from scipy.spatial import ConvexHull

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/sprites/src') + '/'
OUT = os.path.join(ROOT, 'assets/creatures') + '/'
H_OUT = 720  # высота выходного спрайта, px
S_OUT = os.path.join(ROOT, 'tools', 'hydra_geom.json')


def bg_kind(a):
    c = a[5, 5]
    return 'magenta' if c[0] > 200 and c[2] > 200 and c[1] < 80 else 'green'


def key(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    if bg_kind(im) == 'magenta':
        excess = np.minimum(r, b) - g           # насколько магента сильнее зелёного
    else:
        excess = g - np.maximum(r, b)           # насколько зелёный сильнее красного и синего
    alpha = 255 * (1 - np.clip((excess - 25) / 55, 0, 1))
    if bg_kind(im) == 'magenta':
        # магентовую кайму гасим только на кромке, внутренность не трогаем
        edge = alpha < 250
        r2 = np.where(edge, np.minimum(r, g * 1.2 + 12), r)
        b2 = np.where(edge, np.minimum(b, g * 1.2 + 12), b)
        g2 = g
    else:
        g2 = np.minimum(g, np.maximum(r, b) + 4)
        r2, b2 = r, b
    out = np.stack([r2, g2, b2, alpha], -1)
    out[..., :3] = np.where((alpha > 0)[..., None], out[..., :3], 0)
    return out.clip(0, 255).astype(np.uint8)


def crop_box(rgba_list):
    x0s, x1s, y0s, y1s = [], [], [], []
    for rgba in rgba_list:
        ys, xs = np.where(rgba[..., 3] > 8)
        x0s.append(xs.min()); x1s.append(xs.max() + 1)
        y0s.append(ys.min()); y1s.append(ys.max() + 1)
    return min(x0s), max(x1s), min(y0s), max(y1s)


def main():
    keyed = {n: key(SRC + f'hydra_{n}_src.png') for n in ['idle', 'strike']}
    X0, X1, Y0, Y1 = crop_box(keyed.values())
    res = {}
    for name, rgba in keyed.items():
        crop = rgba[Y0:Y1, X0:X1]
        h, w = crop.shape[:2]
        W = round(w * H_OUT / h)
        img = Image.fromarray(crop, 'RGBA').resize((W, H_OUT), Image.LANCZOS)
        img.save(OUT + f'hydra_{name}.webp', 'WEBP', quality=92)
        arr = np.asarray(img).astype(np.float32)
        m = arr[..., 3] > 128
        H, Wd = m.shape
        yy, xx = np.where(m)
        bottom = yy >= H * 0.94
        pivot = (float(xx[bottom].min()) / Wd, float(yy.max()) / H)
        # центр короны: ядро — самые яркие оранжевые пиксели в верхней половине
        core = (arr[..., 0] > 200) & (arr[..., 1] > 110) & (arr[..., 2] < 170) & m
        core[H // 2:] = False
        cy, cx = np.where(core)
        crown = (float(cx.mean()) / Wd, float(cy.mean()) / H) if cx.size else None
        # контур: выпуклая оболочка непрозрачных пикселей
        pts = np.column_stack([xx, yy])[::max(1, len(xx) // 3000)]
        hull = ConvexHull(pts)
        hv = [(float(pts[i][0]) / Wd, float(pts[i][1]) / H) for i in hull.vertices]
        # кончики: вершины оболочки, самые далёкие от центра короны
        ccx, ccy = crown[0] * Wd, crown[1] * H
        # кончики — только в верхней части короны: ниже центра короны + 0.12 высоты
        # лежит стебель и основание, их в кончики не берём
        cand = [(x, y) for x, y in hv if y < crown[1] + 0.12]
        cand.sort(key=lambda p: -((p[0] * Wd - ccx) ** 2 + (p[1] * H - ccy) ** 2))
        tips = []
        for x, y in cand:
            if all(((x - tx) ** 2 + (y - ty) ** 2) ** 0.5 > 0.08 for tx, ty in tips):
                tips.append((x, y))
            if len(tips) == 5:
                break
        # стебель: ведём по строкам от основания короны вниз. В каждой строке
        # берём полосу, ближайшую к предыдущей позиции, — так не прыгаем на кораллы
        circles = []
        px_prev = crown[0] - 0.02
        for fy in np.arange(0.30, 0.86, 0.04):
            row = int(fy * H)
            xs_r = np.where(m[row])[0]
            if xs_r.size < 4:
                continue
            breaks = np.where(np.diff(xs_r) > 1)[0]
            runs = np.split(xs_r, breaks + 1)
            runs = [r for r in runs if r.size >= 4]
            if not runs:
                continue
            best = min(runs, key=lambda r: abs(r.mean() / Wd - px_prev) - 0.0002 * r.size)
            cx_run = float(best.mean()) / Wd
            if abs(cx_run - px_prev) > 0.10:
                continue
            px_prev = cx_run
            r_px = min(best.size / 2, 0.10 * H)
            circles.append({'x': cx_run, 'y': float(fy), 'r': r_px / H})
        res[name] = {'size': [W, H_OUT], 'pivot': pivot, 'crown': crown,
                     'tips': tips, 'hull': hv, 'stalk': circles}
    with open(S_OUT, 'w') as f:
        json.dump(res, f)
    for k, v in res.items():
        print(k, 'size', v['size'], 'pivot', [round(x, 3) for x in v['pivot']],
              'crown', [round(x, 3) for x in v['crown']], 'tips', len(v['tips']),
              'hull', len(v['hull']), 'stalk', len(v['stalk']))


main()
