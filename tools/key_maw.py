# Вырезает фон из исходников пасти (открытая и сомкнутая) в общей рамке.
# Фон магента (#FF00FF). Запуск из корня репозитория: python3 tools/key_maw.py
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/sprites/src') + '/'
OUT = os.path.join(ROOT, 'assets/creatures') + '/'
S_OUT = 720  # сторона выходного спрайта, px


def _despill_magenta(r, g, b, alpha):
    # гасим магентовую кайму только на кромке (полупрозрачные пиксели);
    # внутренность спрайта не трогаем, иначе янтарь уходит в красный
    edge = alpha < 250
    r2 = np.where(edge, np.minimum(r, g * 1.2 + 12), r)
    b2 = np.where(edge, np.minimum(b, g * 1.2 + 12), b)
    return r2, b2


def key(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    excess = np.minimum(r, b) - g
    alpha = 255 * (1 - np.clip((excess - 25) / 55, 0, 1))
    r2, b2 = _despill_magenta(r, g, b, alpha)
    out = np.stack([r2, g, b2, alpha], -1)
    out[..., :3] = np.where((alpha > 0)[..., None], out[..., :3], 0)
    return out.clip(0, 255).astype(np.uint8)


def main():
    keyed = {n: key(SRC + f'maw_{n}_src.png') for n in ['open', 'closed']}
    boxes = []
    for rgba in keyed.values():
        ys, xs = np.where(rgba[..., 3] > 8)
        boxes.append((xs.min(), xs.max() + 1, ys.min(), ys.max() + 1))
    X0 = min(b[0] for b in boxes); X1 = max(b[1] for b in boxes)
    Y0 = min(b[2] for b in boxes); Y1 = max(b[3] for b in boxes)
    w, h = X1 - X0, Y1 - Y0
    W = S_OUT
    H = round(h * S_OUT / w) if w >= h else S_OUT
    for name, rgba in keyed.items():
        crop = rgba[Y0:Y1, X0:X1]
        img = Image.fromarray(crop, 'RGBA').resize((S_OUT, round(S_OUT * h / w)), Image.LANCZOS)
        img.save(OUT + f'maw_{name}.webp', 'WEBP', quality=92)
        print(name, img.size)


main()
