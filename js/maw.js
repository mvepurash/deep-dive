// ===== maw.js =====
// ============================================================
// ПАСТЬ — веха. Перекрывает ущелье по ширине: зубы стоят у стен, между
// ними отверстие по центру. По мере приближения дрона зубы сходятся.
//
// Правила прохождения (docs/tz_creatures_ru.md, согласованы):
//   1. Проход всегда возможен, если войти по центру: отверстие не закрывается
//      ниже HOLE_RX_MIN, то есть 96 px поперёк при дроне 36 px.
//   2. Смыкание идёт CLOSE_S секунд падения (не меньше 0.5 с).
//   3. Смыкание начинается до входа: сигнал виден заранее.
//
// Прогресс смыкания p — функция глубины, а не таймера. Значит, картинка и
// хитбокс всегда показывают одно и то же состояние, и пауза ничего не ломает.
// ============================================================

const Maw = (() => {

  const M = CONFIG.MAW;
  const W = M.W_PX, HH = M.H_PX;
  const DR = CONFIG.DRONE_RADIUS;

  let list = [];            // {depth (центр в метрах), xc (центр отверстия, px), alive}
  let nextSpawn = 0;
  let armed = false;
  let _pxPerM = 1;
  let _v = 250;             // скорость падения, м/с — оценивается по ходу игры
  let _lastDepth = null;

  function reset() { list = []; nextSpawn = 0; armed = false; _lastDepth = null; }

  function _span(pxPerM) { return HH / pxPerM; }

  // Время смыкания в метрах падения при текущей скорости
  function _closeM() { return M.CLOSE_S * _v; }

  // Прогресс смыкания 0..1 по глубине дрона. Сигнал начинается заранее:
  // при входе в пасть смыкание уже на SIGNAL_LEAD.
  function _p(m, droneDepth, pxPerM) {
    const top = m.depth - _span(pxPerM) / 2;
    const cm = _closeM();
    const start = top - M.SIGNAL_LEAD * cm;
    let u = (droneDepth - start) / cm;
    u = Math.max(0, Math.min(1, u));
    return u * u * (3 - 2 * u);
  }

  // Полуширина отверстия при прогрессе p
  function _rx(p) { return M.HOLE_RX + (M.HOLE_RX_MIN - M.HOLE_RX) * p; }

  // ---------- появление ----------

  // Можно ли поставить пасть с центром на глубине dc: вся высота в передышке
  // и ущелье не уже ширины спрайта
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
      list.push({ depth: placed.d, xc: placed.fit.xc, alive: true });
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
    // Пасть ушла за верх экрана целиком
    const span = _span(pxPerM);
    list = list.filter(m => m.depth + span / 2 > depth - 10);
  }

  // ---------- столкновение и выстрел ----------

  function hitTest(droneX, droneDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const m of list) {
      if (droneDepth < m.depth - span / 2 || droneDepth > m.depth + span / 2) continue;
      const rx = _rx(_p(m, droneDepth, pxPerM));
      // Зубы сходятся к центру: за пределами отверстия дрон цел только если
      // целиком внутри него, с учётом своего радиуса
      if (Math.abs(droneX - m.xc) > rx - DR) return true;
    }
    return false;
  }

  // Пуля в зубы поглощается, в отверстие пролетает. Пасть не убивается.
  function shootAt(sx, sDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const m of list) {
      if (sDepth < m.depth - span / 2 || sDepth > m.depth + span / 2) continue;
      const rx = _rx(_p(m, sDepth, pxPerM));
      if (Math.abs(sx - m.xc) > rx) return { x: sx, y: sDepth };
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

  function draw(ctx, depth, pxPerM) {
    const open = Sprites.at('maw_open', W, HH, false);
    const shut = Sprites.at('maw_closed', W, HH, false);
    if (!open || !shut) return;   // игра идёт и без картинки; хитбокс остаётся
    const droneDepth = depth + CONFIG.DRONE_Y / pxPerM;
    for (const m of list) {
      const py = (m.depth - depth) * pxPerM;
      if (py < -HH / 2 - 40 || py > CONFIG.CANVAS_H + HH / 2 + 40) continue;
      const p = _p(m, droneDepth, pxPerM);
      ctx.globalAlpha = 1 - p;
      ctx.drawImage(open, m.xc - W / 2, py - HH / 2, W, HH);
      ctx.globalAlpha = p;
      ctx.drawImage(shut, m.xc - W / 2, py - HH / 2, W, HH);
      ctx.globalAlpha = 1;

      if (M.DEBUG) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.lineWidth = 1;
        const rx = _rx(p);
        ctx.beginPath();
        ctx.moveTo(m.xc - rx, py - HH / 2); ctx.lineTo(m.xc - rx, py + HH / 2);
        ctx.moveTo(m.xc + rx, py - HH / 2); ctx.lineTo(m.xc + rx, py + HH / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function count() { return list.length; }
  function items() { return list; }

  return { reset, update, hitTest, shootAt, covers, draw, count, list: items };

})();
