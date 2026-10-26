# Вырезает магенту (#FF00FF) из исходника гребня титана. Кадр 720x720, без
# обрезки, чтобы масштаб относительно других фрагментов сохранялся.
# Запуск из корня репозитория: python3 tools/key_titan.py
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/sprites/src') + '/'
OUT = os.path.join(ROOT, 'assets/creatures') + '/'
S_OUT = 720


def _despill_magenta(r, g, b, alpha):
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


rgba = key(SRC + 'titan_crest_src.png')
img = Image.fromarray(rgba, 'RGBA').resize((S_OUT, S_OUT), Image.LANCZOS)
img.save(OUT + 'titan_crest.webp', 'WEBP', quality=92)
ys, xs = np.where(np.asarray(img)[..., 3] > 8)
print('crest content box x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), 'frame', S_OUT)
