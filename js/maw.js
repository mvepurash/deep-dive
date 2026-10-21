// ===== maw.js =====
// ============================================================
// ПАСТЬ — веха. Занимает всю ширину передышки: губы прилегают к стенам,
// зубы-полусферы образуют дугу, между вершинами по центру — глотка-сфинктер.
// Правила прохождения — docs/tz_creatures_ru.md (1, 1a–1d):
//   1.  Проход всегда возможен, если войти по центру (96 px между вершинами).
//   1a. Смертельны только зубы. Губы и десны проходятся без урона.
//   1c. Сомкнутая пасть проходима только по центральной оси, в пике смыкания.
//       Затем пасть отходит: проход расширяется, пасть уменьшается и темнеет.
//   1d. По бокам пустот нет: пасть занимает всю ширину коридора.
//
// Всё состояние — функция глубины дрона, а не таймера: картинка и проход
// всегда показывают одно и то же, пауза ничего не ломает.
//   start  — начало смыкания (до входа в пасть на SIGNAL_LEAD)
//   closed — пик смыкания, проход минимальный (96 px по центру)
//   closed .. closed+RETREAT — отход: проход расширяется, масштаб уменьшается
// ============================================================

const Maw = (() => {

  const M = CONFIG.MAW;
  const W = M.W_PX, HH = M.H_PX;
  const DR = CONFIG.DRONE_RADIUS;

  let list = [];            // {depth (центр в метрах), xc (центр по X, px)}
  let nextSpawn = 0;
  let armed = false;
  let _pxPerM = 1;
  let _v = 250;             // скорость падения, м/с — оценивается по ходу игры
  let _lastDepth = null;

  function reset() { list = []; nextSpawn = 0; armed = false; _lastDepth = null; }

  function _span(pxPerM) { return HH / pxPerM; }
  function _closeM() { return M.CLOSE_S * _v; }
  function _retreatM() { return M.RETREAT_S * _v; }

  // Гладкая кривая 0..1 по линейной величине u
  function _ramp(u) {
    u = Math.max(0, Math.min(1, u));
    return u * u * (3 - 2 * u);
  }

  // Состояние пасти на глубине дрона dd:
  //   p  — смыкание 0..1 (открыто -> сомкнуто)
  //   q  — отход 0..1 (после пика)
  //   s  — масштаб спрайта (1 -> 1 - SHRINK)
  //   rx — полуширина прохода на экране, px
  function _state(m, dd, pxPerM) {
    const span = _span(pxPerM);
    const top = m.depth - span / 2;
    const cm = _closeM();
    const rm = _retreatM();
    const start = top - M.SIGNAL_LEAD * cm;
    const closed = start + cm;
    const p = _ramp((dd - start) / cm);
    const q = _ramp((dd - closed) / rm);
    let rx = M.HOLE_RX + (M.HOLE_RX_MIN - M.HOLE_RX) * p;
    rx = rx + (M.HOLE_RX - rx) * q;
    const s = 1 - M.SHRINK * q;
    return { p, q, s, rx: rx * s };
  }

  // ---------- появление ----------

  // Можно ли поставить пасть с центром на глубине dc: вся высота в передышке
  // и ущелье не уже ширины спрайта (правило 1d: пасть перекрывает коридор)
  function _fit(dc, pxPerM) {
    const span = _span(pxPerM);
    const top = Canyon.getWalls(dc - span / 2), bot = Canyon.getWalls(dc + span / 2);
    if (top.phase !== 'rest' || bot.phase !== 'rest') return null;
    for (let i = 0; i <= 8; i++) {
      const w = Canyon.getWalls(dc - span / 2 + span * (i / 8));
      if (w.hitRight - w.hitLeft < W) return null;
    }
    const mid = Canyon.getWalls(dc);
    return { xc: (mid.hitLeft + mid.hitRight) / 2 };
  }

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < M.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + M.SPAWN_EVERY * 0.6; }

    while (nextSpawn < aheadDepth) {
      let placed = null;
      for (let d = nextSpawn; d < nextSpawn + M.SEARCH_AHEAD; d += 6) {
        const fit = _fit(d, pxPerM);
        if (fit) { placed = { d, fit }; break; }
      }
      if (!placed) { nextSpawn += M.SEARCH_AHEAD; continue; }
      list.push({ depth: placed.d, xc: placed.fit.xc });
      nextSpawn = placed.d + M.SPAWN_EVERY;
    }
  }

  // ---------- шаг ----------

  function update(depth, aheadDepth, pxPerM, dt) {
    _pxPerM = pxPerM;
    // Скорость падения — по ходу игры: смыкание меряется в метрах
    if (_lastDepth !== null && dt > 0) {
      const v = (depth - _lastDepth) / dt;
      if (v > 50 && v < 1000) _v = v;
    }
    _lastDepth = depth;
    _maybeSpawn(depth, aheadDepth, pxPerM);
    // Пасть ушла за верх экрана целиком (с запасом на отход)
    const span = _span(pxPerM);
    list = list.filter(m => m.depth + span / 2 + _closeM() + _retreatM() > depth - 10);
  }

  // ---------- столкновение и выстрел ----------

  // Дрон гибнет, если выходит за проход по центру. Зубы — единственная опасность.
  function hitTest(droneX, droneDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const m of list) {
      if (droneDepth < m.depth - span / 2 || droneDepth > m.depth + span / 2) continue;
      const st = _state(m, droneDepth, pxPerM);
      if (Math.abs(droneX - m.xc) > st.rx - DR) return true;
    }
    return false;
  }

  // Пуля в зубы поглощается, в глотку пролетает. Пасть не умирает.
  function shootAt(sx, sDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const m of list) {
      if (sDepth < m.depth - span / 2 || sDepth > m.depth + span / 2) continue;
      const st = _state(m, sDepth, pxPerM);
      if (Math.abs(sx - m.xc) > st.rx) return { x: sx, y: sDepth };
    }
    return null;
  }

  // Коралы не растут на стенах в полосе пасти
  function covers(depth, side) {
    const span = _span(_pxPerM);
    for (const m of list) {
      if (depth > m.depth - span / 2 - 6 && depth < m.depth + span / 2 + 6) return true;
    }
    return false;
  }

  // ---------- отрисовка ----------

  // Три спрайта: открыто (p=0) -> наполовину (p=0.5) -> сомкнуто (p=1).
  // Переход между соседними кадрами — кроссфейд по p.
  function _alphas(p) {
    if (p <= 0.5) return { open: 1 - 2 * p, half: 2 * p, closed: 0 };
    return { open: 0, half: 2 - 2 * p, closed: 2 * p - 1 };
  }

  function draw(ctx, depth, pxPerM) {
    const open = Sprites.at('maw_open', W, HH, false);
    const half = Sprites.at('maw_half', W, HH, false);
    const shut = Sprites.at('maw_closed', W, HH, false);
    if (!open || !half || !shut) return;   // без картинки хитбокс остаётся

    const droneDepth = depth + CONFIG.DRONE_Y / pxPerM;
    for (const m of list) {
      const st = _state(m, droneDepth, pxPerM);
      const w = W * st.s, h = HH * st.s;
      const cy = (m.depth - depth) * pxPerM;
      if (cy < -h / 2 - 40 || cy > CONFIG.CANVAS_H + h / 2 + 40) continue;
      const x = m.xc - w / 2, y = cy - h / 2;
      const a = _alphas(st.p);

      const dim = st.q > 0 && 'filter' in ctx;
      if (dim) ctx.filter = `brightness(${1 - M.DIM * st.q})`;
      if (a.open > 0)   { ctx.globalAlpha = a.open;   ctx.drawImage(open, x, y, w, h); }
      if (a.half > 0)   { ctx.globalAlpha = a.half;   ctx.drawImage(half, x, y, w, h); }
      if (a.closed > 0) { ctx.globalAlpha = a.closed; ctx.drawImage(shut, x, y, w, h); }
      ctx.globalAlpha = 1;
      if (dim) ctx.filter = 'none';

      if (M.DEBUG) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(m.xc - st.rx, cy - h / 2); ctx.lineTo(m.xc - st.rx, cy + h / 2);
        ctx.moveTo(m.xc + st.rx, cy - h / 2); ctx.lineTo(m.xc + st.rx, cy + h / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function count() { return list.length; }
  function items() { return list; }

  return { reset, update, hitTest, shootAt, covers, draw, count, list: items };

})();
