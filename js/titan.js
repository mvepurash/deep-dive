// ===== titan.js =====
// ============================================================
// ТИТАН — веха, редкое событие (docs/tz_creatures_ru.md, раздел 7).
// Неподвижная туша перекрывает ущелье почти целиком. У одной из стен остаётся
// щель шириной GAP_MIN..GAP_MAX px. Правила:
//   1. Щель стоит на месте, туша неподвижна.
//   2. Сторона щели случайна, видна на входе, ширина >= 80 px.
//   3. Касание смертельно. Щит титана не пробивает.
//   4. Выстрелы урона не наносят: пули гаснут о тушу.
//   5. Сигнал — свечение глаза, растёт за SIGNAL_S секунд до входа в тушу.
//
// Всё состояние — функция глубины дрона: пауза ничего не ломает.
// Титан — полоса глубины H_PX; в ней всё, кроме щели, — туша.
// ============================================================

const Titan = (() => {

  const T = CONFIG.TITAN;
  const DR = CONFIG.DRONE_RADIUS;
  const H = T.H_PX;
  const FR = T.FRAME_PX;

  let list = [];            // {depth (центр полосы, м), side ('left'|'right'), gapW (px)}
  let nextSpawn = 0;
  let armed = false;
  let _v = 250;
  let _lastDepth = null;
  let _pxPerM = 1;

  function reset() { list = []; nextSpawn = 0; armed = false; _lastDepth = null; }

  function _span(pxPerM) { return H / pxPerM; }
  function _ramp(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // Внутренний край щели на глубине dd (px). Щель прижата к стене своей
  // стороны и идёт вместе с ней: на глубине dd стена та, что там есть.
  function _gapEdge(t, dd) {
    const w = Canyon.getWalls(dd);
    return t.side === 'left' ? w.hitLeft + t.gapW : w.hitRight - t.gapW;
  }

  // Свечение глаза 0..1: растёт за SIGNAL_S секунд до входа в тушу
  function _glow(t, dd) {
    const top = t.depth - _span(_pxPerM) / 2;
    const sig = T.SIGNAL_S * _v;
    return _ramp((dd - (top - sig)) / sig);
  }

  // Может ли титан стоять на глубине dc. Щель прижата к стене, туша — то, что
  // осталось от коридора, поэтому полоса не обязана быть вся в передышке.
  // Достаточно: коридор на всей полосе не уже щели плюс запас и без развилки.
  function _fit(dc, pxPerM) {
    const span = _span(pxPerM);
    for (let i = 0; i <= 8; i++) {
      const w = Canyon.getWalls(dc - span / 2 + span * (i / 8));
      if (w.phase === 'fork') return false;
      if (w.hitRight - w.hitLeft < T.GAP_MAX_PX + 40) return false;
    }
    return true;
  }

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < T.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + T.SPAWN_EVERY * 0.5; }
    while (nextSpawn < aheadDepth) {
      let placed = null;
      for (let d = nextSpawn; d < nextSpawn + T.SEARCH_AHEAD; d += 6) {
        if (_fit(d, pxPerM)) { placed = d; break; }
      }
      if (placed === null) { nextSpawn += T.SEARCH_AHEAD; continue; }
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const gapW = T.GAP_MIN_PX + Math.random() * (T.GAP_MAX_PX - T.GAP_MIN_PX);
      list.push({ depth: placed, side, gapW });
      nextSpawn = placed + T.SPAWN_EVERY;
    }
  }

  function update(depth, aheadDepth, pxPerM, dt) {
    _pxPerM = pxPerM;
    if (_lastDepth !== null && dt > 0) {
      const v = (depth - _lastDepth) / dt;
      if (v > 50 && v < 1000) _v = v;
    }
    _lastDepth = depth;
    _maybeSpawn(depth, aheadDepth, pxPerM);
    const span = _span(pxPerM);
    list = list.filter(t => t.depth + span / 2 > depth - 10);
  }

  // Дрон в полосе титана: его правый (для левой щели) или левый (для правой)
  // край должен оставаться внутри щели. Всё остальное — туша.
  function _lethal(t, x, dd) {
    const edge = _gapEdge(t, dd);
    return t.side === 'left' ? (x + DR > edge) : (x - DR < edge);
  }

  // droneX — экранная X дрона; droneDepth — глубина дрона, м
  function hitTest(droneX, droneDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const t of list) {
      if (droneDepth < t.depth - span / 2 || droneDepth > t.depth + span / 2) continue;
      if (_lethal(t, droneX, droneDepth)) return true;
    }
    return false;
  }

  // Выстрел: туша гасит пулю без урона, щель пропускает
  function shootAt(sx, sDepth, pxPerM) {
    const span = _span(pxPerM);
    for (const t of list) {
      if (sDepth < t.depth - span / 2 || sDepth > t.depth + span / 2) continue;
      if (_lethal(t, sx, sDepth)) return { x: sx, y: CONFIG.DRONE_Y + (t.depth - sDepth) * pxPerM };
    }
    return null;
  }

  // Коралы не растут в полосе титана ни на одной стене
  function covers(depth, side) {
    const span = _span(_pxPerM);
    for (const t of list) {
      if (depth > t.depth - span / 2 - 6 && depth < t.depth + span / 2 + 6) return true;
    }
    return false;
  }

  // ---------- отрисовка ----------

  function draw(ctx, depth, pxPerM) {
    const crest = Sprites.at('titan_crest', FR, FR, false);
    const eye = Sprites.at('titan_eye', FR, FR, false);
    const edge = Sprites.at('titan_edge', FR, FR, false);
    if (!crest || !eye || !edge) return;
    const droneDepth = depth + CONFIG.DRONE_Y / pxPerM;
    for (const t of list) {
      const cy = CONFIG.DRONE_Y + (t.depth - droneDepth) * pxPerM;
      if (cy + H / 2 < 0 || cy - H / 2 > CONFIG.CANVAS_H) continue;
      const w = Canyon.getWalls(t.depth);
      const gx = _gapEdge(t, t.depth);
      // туша — со стороны, противоположной щели; рисуем в её пределах
      const x0 = t.side === 'left' ? gx : w.hitLeft;
      const x1 = t.side === 'left' ? w.hitRight : gx;
      const mx = (x0 + x1) / 2;
      const top = cy - H / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, top, x1 - x0, H);
      ctx.clip();
      ctx.drawImage(crest, mx - FR / 2, top, FR, FR);
      ctx.drawImage(edge, mx - FR / 2, top + H - FR, FR, FR);
      ctx.drawImage(eye, mx - FR / 2, cy - FR / 2, FR, FR);
      ctx.restore();

      // Свечение глаза: сигнал — красный отсвет у щели, растёт до входа
      const g = _glow(t, droneDepth);
      if (g > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 * g;
        const grad = ctx.createLinearGradient(gx, 0, t.side === 'left' ? gx + 60 : gx - 60, 0);
        grad.addColorStop(0, 'rgba(200,30,30,1)');
        grad.addColorStop(1, 'rgba(200,30,30,0)');
        ctx.fillStyle = grad;
        const rx = t.side === 'left' ? gx : gx - 60;
        ctx.fillRect(rx, top, 60, H);
        ctx.restore();
      }

      if (T.DEBUG) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.strokeRect(x0, top, x1 - x0, H);
        ctx.restore();
      }
    }
  }

  function count() { return list.length; }
  function items() { return list; }

  return { reset, update, hitTest, shootAt, covers, draw, count, list: items };

})();
