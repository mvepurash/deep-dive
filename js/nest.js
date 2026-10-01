// ===== nest.js =====
// ============================================================
// ГНЕЗДО ЩУПАЛЕЦ — тварь, которую проходят газом, а не джойстиком.
//
// Её вопрос: не «где», а «когда». Щупальца ходят поперёк прохода, и
// решение одно из двух — поднажать и проскочить, пока открыто, либо
// притормозить и переждать. Это первая тварь, ради которой игроку
// понадобятся БЫСТРЕЕ и ТОРМОЗ.
//
// ДВА ПРАВИЛА, НА КОТОРЫХ ВСЁ ДЕРЖИТСЯ.
//
// 1. КАРТИНКА И СМЕРТЬ — ОДНА КРИВАЯ. Щупальце рисуется полосами вдоль
//    кривой Безье, и хитбокс — капсулы по ТОЙ ЖЕ кривой, по тем же точкам.
//    Они не «похожи» друг на друга, они построены из одного. Для коралла
//    мне пришлось запекать огибающую и доказывать совпадение замером; тут
//    доказывать нечего.
//
// 2. ЩУПАЛЬЦЕ НЕ ПЕРЕКРЫВАЕТ ПРОХОД. Оно тянется не на фиксированную
//    длину, а «насколько может, оставив GAP_MIN». Поэтому просвет не
//    бывает меньше обещанного ни при каком стечении обстоятельств: ни в
//    узком месте, ни когда на противоположной стене вырос коралл. Ширину
//    мы спрашиваем у ущелья, а не навязываем ему — кольцевой зависимости
//    нет, и раздвигаться под тварь ущелье не обязано.
// ============================================================

const Nest = (() => {

  const N = CONFIG.NEST;

  let nests = [];          // {depth, side, phase}
  let nextSpawn = 0;
  let armed = false;

  function reset() { nests = []; nextSpawn = 0; armed = false; }

  // Высота основания в метрах
  function _baseM(pxPerM) { return N.BASE_PX / pxPerM; }

  // Куда тянутся щупальца с этой стены и докуда им можно
  function _room(depth, side) {
    const w = Canyon.getWalls(depth);
    const clear = w.hitRight - w.hitLeft;
    const reach = Math.max(0, Math.min(N.TENT_MAX, clear - N.GAP_MIN - N.BASE_OUT));
    return {
      root: side === 'left' ? w.hitLeft + N.BASE_OUT : w.hitRight - N.BASE_OUT,
      dir:  side === 'left' ? 1 : -1,
      clear, reach,
    };
  }

  // Доля смыкания 0..1. Косинус, а не ступени: тварь должна течь, а не
  // переключаться. Соседние щупальца чуть сдвинуты по фазе — иначе гнездо
  // работает как одна заслонка и выглядит механизмом.
  function _amt(n, i, time) {
    const t = time / N.CYCLE + n.phase + i * N.TENT_PHASE;
    const u = t - Math.floor(t);
    const C = N.CLOSE_FRAC;
    return u < C ? 0.5 - 0.5 * Math.cos(Math.PI * u / C)
                 : 0.5 + 0.5 * Math.cos(Math.PI * (u - C) / (1 - C));
  }

  // Кривая щупальца: три точки Безье. Раскрытое загнуто крюком к стене,
  // сомкнутое почти прямое с лёгким провисом. Между ними — линейно.
  // Ширина щупальца в доле от полной, по профилю самого спрайта
  function _wid(s) {
    const P = N.WIDTH_PROFILE, n = P.length - 1;
    const x = Math.max(0, Math.min(n, s * n));
    const i = Math.min(n - 1, Math.floor(x));
    return P[i] + (P[i + 1] - P[i]) * (x - i);
  }

  function _bez(p0, p1, p2, s) {
    const u = 1 - s;
    return { x: u * u * p0.x + 2 * u * s * p1.x + s * s * p2.x,
             y: u * u * p0.y + 2 * u * s * p1.y + s * s * p2.y };
  }

  // Точки щупальца в (x px, глубина м). Одна функция на отрисовку и на
  // столкновение — см. правило 1 в шапке.
  function _points(n, i, time, pxPerM) {
    const baseM = _baseM(pxPerM);
    const rootDepth = n.depth + baseM * (i + 0.5) / N.TENT_COUNT;
    const r = _room(rootDepth, n.side);
    const amt = _amt(n, i, time);
    const wob = Math.sin(time * 1.7 + i * 1.3 + n.phase * 6) * 4;   // дыхание

    const x0 = r.root, y0 = rootDepth;
    const P0 = { x: x0, y: y0 };
    // сомкнуто: почти прямое поперёк. раскрыто: вышло и загнулось вниз к стене
    // Сомкнутое щупальце не прямая: лёгкая дуга вверх и провис к кончику.
    // Без этого пять вытянутых щупалец читаются как лучи, а не как тварь.
    const P1 = { x: x0 + r.dir * (r.reach * 0.50 * amt + 58 * (1 - amt)),
                 y: y0 + ((-14 * amt - 14 * (1 - amt)) + wob) / pxPerM };
    const P2 = { x: x0 + r.dir * (r.reach * amt + 16 * (1 - amt)),
                 y: y0 + (26 * amt + 62 * (1 - amt)) / pxPerM };

    // САМОЕ ТЕСНОЕ МЕСТО ПО ВСЕЙ ДЛИНЕ ЩУПАЛЬЦА.
    //
    // Два прогона подряд ловили здесь ошибку. Сначала вылет считался по
    // ширине у корня, а кончик свисает на два десятка метров ниже, где
    // коридор уже: обещанные 60 px просвета проваливались до 39. Потом я
    // прижимал каждую точку к стене на её собственной глубине — стало 52,
    // потому что дрон радиусом 18 достаёт точку и с соседних глубин.
    // Проверка тремя точками дала 57: ущелье колышется с периодом в восемь
    // метров и между пробами успевает сузиться.
    //
    // Поэтому ограничение одно на всё щупальце и берётся по самому тесному
    // месту на всём его протяжении плюс радиус дрона с запасом. Это и
    // точнее, и дешевле: девять замеров на щупальце вместо сорока пяти.
    const band = (N.TENT_W * 0.5 + CONFIG.DRONE_RADIUS) / pxPerM;
    const from = Math.min(P0.y, P1.y, P2.y) - band;
    const to   = Math.max(P0.y, P1.y, P2.y) + band;
    let lim = r.dir > 0 ? 1e9 : -1e9;
    for (let k = 0; k <= 8; k++) {
      const w2 = Canyon.getWalls(from + (to - from) * k / 8);
      lim = r.dir > 0 ? Math.min(lim, w2.hitRight) : Math.max(lim, w2.hitLeft);
    }

    const pts = [];
    for (let k = 0; k <= N.SEGMENTS; k++) {
      const s = k / N.SEGMENTS;
      const p = _bez(P0, P1, P2, s);
      const rad = N.TENT_W * 0.5 * _wid(s);
      let x = p.x;
      if (r.dir > 0) x = Math.min(x, lim - N.GAP_MIN - N.SAFETY - rad);
      else           x = Math.max(x, lim + N.GAP_MIN + N.SAFETY + rad);
      pts.push({ x, depth: p.y, r: rad });
    }
    return { pts, amt, dir: r.dir, root: r.root, rootDepth };
  }

  // ---------- появление ----------

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < N.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + N.SPAWN_EVERY * 0.6; }

    while (nextSpawn < aheadDepth) {
      const baseM = _baseM(pxPerM);
      let placed = null;
      // Ищем передышку, где тварь поместится целиком и проход достаточно широк
      for (let d = nextSpawn; d < nextSpawn + N.SEARCH_AHEAD; d += 6) {
        const a = Canyon.getWalls(d), b = Canyon.getWalls(d + baseM);
        if (a.phase !== 'rest' || b.phase !== 'rest') continue;
        if (a.hitRight - a.hitLeft < N.MIN_CORRIDOR) continue;
        if (b.hitRight - b.hitLeft < N.MIN_CORRIDOR) continue;
        placed = d; break;
      }
      if (placed === null) { nextSpawn += N.SEARCH_AHEAD; continue; }
      nests.push({ depth: placed,
                   side: Math.random() < 0.5 ? 'left' : 'right',
                   phase: Math.random() });
      nextSpawn = placed + N.SPAWN_EVERY;
    }
  }

  function update(depth, aheadDepth, pxPerM) {
    _maybeSpawn(depth, aheadDepth, pxPerM);
    const baseM = _baseM(pxPerM);
    nests = nests.filter(n => n.depth + baseM > depth - 60);
  }

  // ---------- столкновение ----------

  // Расстояние от точки до отрезка, всё в пикселях
  function _segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L = vx * vx + vy * vy;
    let t = L > 0 ? ((px - ax) * vx + (py - ay) * vy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  function hitTest(droneX, droneDepth, pxPerM, time) {
    const dr = CONFIG.DRONE_RADIUS;
    const baseM = _baseM(pxPerM);
    for (const n of nests) {
      if (droneDepth < n.depth - 1.5 || droneDepth > n.depth + baseM + 2.5) continue;
      // само основание: торчит из стены на BASE_OUT
      const w = Canyon.getWalls(droneDepth);
      if (n.side === 'left'  && droneX - dr < w.hitLeft  + N.BASE_OUT) return true;
      if (n.side === 'right' && droneX + dr > w.hitRight - N.BASE_OUT) return true;

      for (let i = 0; i < N.TENT_COUNT; i++) {
        const t = _points(n, i, time, pxPerM);
        for (let k = 0; k < t.pts.length - 1; k++) {
          const a = t.pts[k], b = t.pts[k + 1];
          const d = _segDist(droneX, droneDepth * pxPerM,
                             a.x, a.depth * pxPerM, b.x, b.depth * pxPerM);
          if (d < dr + (a.r + b.r) * 0.5) return true;
        }
      }
    }
    return false;
  }

  // Чистый просвет на этой глубине с учётом гнезда, в пикселях.
  // Ради него всё и затевалось: обещание «не уже GAP_MIN» должно
  // проверяться числом на всей трассе, а не на глаз в паре кадров.
  function clearGapAt(depth, pxPerM, time) {
    const w = Canyon.getWalls(depth);
    let lo = w.hitLeft, hi = w.hitRight;
    const baseM = _baseM(pxPerM);
    for (const n of nests) {
      if (depth < n.depth - 0.5 || depth > n.depth + baseM + 1.5) continue;
      if (n.side === 'left') lo = Math.max(lo, w.hitLeft + N.BASE_OUT);
      else                   hi = Math.min(hi, w.hitRight - N.BASE_OUT);
      for (let i = 0; i < N.TENT_COUNT; i++) {
        const t = _points(n, i, time, pxPerM);
        for (const p of t.pts) {
          if (Math.abs(p.depth - depth) * pxPerM > p.r + CONFIG.DRONE_RADIUS) continue;
          if (n.side === 'left') lo = Math.max(lo, p.x + p.r);
          else                   hi = Math.min(hi, p.x - p.r);
        }
      }
    }
    return Math.max(0, hi - lo);
  }

  // ---------- отрисовка ----------

  function draw(ctx, depth, pxPerM, time) {
    const baseM = _baseM(pxPerM);
    const base = Sprites.raw('nest_base');
    const tent = Sprites.raw('nest_tentacle');

    for (const n of nests) {
      const topPy = (n.depth - depth) * pxPerM;
      if (topPy > CONFIG.CANVAS_H + 80 || topPy + N.BASE_PX < -80) continue;

      // ЩУПАЛЬЦА. Рисуем полосами вдоль кривой: каждая полоса берётся из
      // прямого спрайта и поворачивается по касательной. Шва между ними
      // нет, потому что полосы идут встык из одной картинки.
      for (let i = 0; i < N.TENT_COUNT; i++) {
        const t = _points(n, i, time, pxPerM);
        const warn = Math.max(0, (t.amt - N.WARN_FROM) / (1 - N.WARN_FROM));
        if (tent) {
          const sh = tent.height / N.SEGMENTS;
          for (let k = 0; k < N.SEGMENTS; k++) {
            const a = t.pts[k], b = t.pts[k + 1];
            const ax = a.x, ay = (a.depth - depth) * pxPerM;
            const bx = b.x, by = (b.depth - depth) * pxPerM;
            if (ay < -120 && by < -120) continue;
            if (ay > CONFIG.CANVAS_H + 120 && by > CONFIG.CANVAS_H + 120) continue;
            const len = Math.hypot(bx - ax, by - ay) + 1.2;   // нахлёст против щелей
            const ang = Math.atan2(by - ay, bx - ax);
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(ang - Math.PI / 2);                    // спрайт нарисован вниз
            ctx.drawImage(tent, 0, k * sh, tent.width, sh, -N.TENT_W / 2, 0, N.TENT_W, len);
            ctx.restore();
          }
          // Красный только на смыкании и только на кончике: это
          // предупреждение, а не раскраска. В покое его нет вовсе.
          if (warn > 0.02) {
            const tip = t.pts[t.pts.length - 1];
            const py = (tip.depth - depth) * pxPerM;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,70,55,${0.5 * warn})`;
            ctx.beginPath(); ctx.arc(tip.x, py, 2.5 + 2.5 * warn, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      }

      // ОСНОВАНИЕ поверх корней щупалец — стыки прячутся под ним
      if (base) {
        const w0 = Canyon.getWalls(n.depth + baseM * 0.5);
        const x = n.side === 'left' ? w0.hitLeft : w0.hitRight - N.BASE_OUT;
        const img = n.side === 'left' ? base : Sprites.at('nest_base', N.BASE_OUT, N.BASE_PX, true);
        const src = n.side === 'left' ? Sprites.at('nest_base', N.BASE_OUT, N.BASE_PX, false) : img;
        if (src) ctx.drawImage(src, x, topPy, N.BASE_OUT, N.BASE_PX);
      }
    }
  }

  function count() { return nests.length; }

  return { reset, update, hitTest, clearGapAt, draw, count };

})();
