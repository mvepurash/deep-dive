// ===== crusher.js =====
// ============================================================
// БРОНЕНОСЕЦ — неубиваемый таран (docs/tz_creatures_ru.md, раздел 6).
// Стоит у стены, занимает половину коридора. За TELE_S секунд до тарана
// по стене тянется шлейф мути и челюсть открывается. За RAM_S секунд он
// выходит от стены к центру. Касание корпуса и челюсти смертельно,
// выстрелы отскакивают: оружие его не убивает.
//
// Всё состояние — функция глубины дрона, а не таймера: пауза ничего не ломает.
//   teleStart — шлейф и замах начинаются
//   ramStart  — бросок начинается
//   c.depth   — броненосец в центре, бросок окончен
// Экранная Y броненосца: CONFIG.DRONE_Y + (c.depth - dd) * pxPerM, где dd —
// глубина дрона. Так же, как у остальных тварей на стене.
// ============================================================

const Crusher = (() => {

  const C = CONFIG.CRUSHER;
  const DR = CONFIG.DRONE_RADIUS;
  const BW = C.BODY_W, BH = C.BODY_H;
  const FR = C.FRAME_PX;
  const JAW_FR = FR * C.JAW_SCALE;
  const JAW_LEN = JAW_FR * 0.97;        // длина челюсти по содержимому кадра

  let list = [];            // {depth (м), side ('left'|'right')}
  let nextSpawn = 0;
  let armed = false;
  let _v = 250;
  let _lastDepth = null;
  let _pxPerM = 1;

  function reset() { list = []; nextSpawn = 0; armed = false; _lastDepth = null; }

  function _span(pxPerM) { return BH / pxPerM; }
  function _ramp(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // Состояние броненосца, когда дрон на глубине dd
  function _state(c, dd) {
    const teleStart = c.depth - (C.TELE_S + C.RAM_S) * _v;
    const ramStart = c.depth - C.RAM_S * _v;
    const t = _ramp((dd - teleStart) / (C.TELE_S * _v));    // замах 0..1
    const r = _ramp((dd - ramStart) / (C.RAM_S * _v));      // бросок 0..1
    const w = Canyon.getWalls(c.depth);
    const mid = (w.hitLeft + w.hitRight) / 2;
    const wallX = c.side === 'left' ? w.hitLeft + BW / 2 : w.hitRight - BW / 2;
    const cx = wallX + (mid - wallX) * r;
    const open = C.OPEN_RAD * t * (1 - 0.5 * r);            // раствор челюсти
    return { t, r, cx, open };
  }

  // Направление головы: левый броненосец смотрит вправо, правый — влево
  function _dir(c) { return c.side === 'left' ? 1 : -1; }

  // Прямоугольники корпуса и челюсти в экранных координатах
  function _boxes(c, dd, pxPerM) {
    const s = _state(c, dd);
    const cy = CONFIG.DRONE_Y + (c.depth - dd) * pxPerM;
    const body = { x0: s.cx - BW / 2, x1: s.cx + BW / 2, y0: cy - BH / 2, y1: cy + BH / 2 };
    const d = _dir(c);
    const hx = s.cx + d * (BW / 2);                          // шарнир у головы
    const tipX = hx + d * JAW_LEN * Math.cos(s.open);
    const tipY = cy + JAW_LEN * Math.sin(s.open);            // нижняя челюсть опускается
    const jaw = {
      x0: Math.min(hx, tipX), x1: Math.max(hx, tipX),
      y0: cy - JAW_FR * 0.25, y1: Math.max(cy + JAW_FR * 0.25, tipY + JAW_FR * 0.25),
    };
    return { body, jaw, s, cy, hx, d };
  }

  function _fit(dc, pxPerM) {
    const span = _span(pxPerM);
    const top = Canyon.getWalls(dc - span / 2), bot = Canyon.getWalls(dc + span / 2);
    if (top.phase !== 'rest' || bot.phase !== 'rest') return false;
    for (let i = 0; i <= 8; i++) {
      const w = Canyon.getWalls(dc - span / 2 + span * (i / 8));
      if (w.hitRight - w.hitLeft < BW * 2) return false;   // коридор не уже двух корпусов
    }
    return true;
  }

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < C.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + C.SPAWN_EVERY * 0.6; }
    while (nextSpawn < aheadDepth) {
      let placed = null;
      for (let d = nextSpawn; d < nextSpawn + C.SEARCH_AHEAD; d += 6) {
        if (_fit(d, pxPerM)) { placed = d; break; }
      }
      if (placed === null) { nextSpawn += C.SEARCH_AHEAD; continue; }
      // Стороны чередуются, чтобы не ставить двух у одной стены подряд
      const side = (list.length % 2 === 0) ? 'left' : 'right';
      list.push({ depth: placed, side });
      nextSpawn = placed + C.SPAWN_EVERY;
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
    // Уходит за верх экрана целиком после тарана
    const span = _span(pxPerM);
    list = list.filter(c => c.depth + span / 2 > depth - 10);
  }

  // Прямоугольник против круга дрона
  function _hitRect(x, y, r, b) {
    const nx = Math.max(b.x0, Math.min(x, b.x1));
    const ny = Math.max(b.y0, Math.min(y, b.y1));
    const dx = x - nx, dy = y - ny;
    return dx * dx + dy * dy <= r * r;
  }

  // droneX — экранная X дрона; droneDepth — глубина дрона, м
  function hitTest(droneX, droneDepth, pxPerM) {
    const y = CONFIG.DRONE_Y;                  // дрон всегда на DRONE_Y по экрану
    for (const c of list) {
      const { body, jaw } = _boxes(c, droneDepth, pxPerM);
      if (_hitRect(droneX, y, DR, body) || _hitRect(droneX, y, DR, jaw)) return true;
    }
    return false;
  }

  // Выстрел: пуля гаснет о броню, урона нет. sDepth — глубина пули, м.
  function shootAt(sx, sDepth, pxPerM) {
    const half = (BH / 2) / pxPerM + 4 / pxPerM;
    for (const c of list) {
      if (sDepth < c.depth - half || sDepth > c.depth + half) continue;
      const { body, jaw } = _boxes(c, sDepth, pxPerM);
      const inBody = sx >= body.x0 - 4 && sx <= body.x1 + 4;
      const inJaw = sx >= jaw.x0 - 4 && sx <= jaw.x1 + 4;
      if (inBody || inJaw) {
        return { x: sx, y: CONFIG.DRONE_Y + (c.depth - sDepth) * pxPerM };
      }
    }
    return null;
  }

  // Коралы не растут на стене броненосца в полосе его тела
  function covers(depth, side) {
    const span = _span(_pxPerM);
    for (const c of list) {
      if (c.side !== side) continue;
      if (depth > c.depth - span / 2 - 6 && depth < c.depth + span / 2 + 6) return true;
    }
    return false;
  }

  // ---------- отрисовка ----------

  function draw(ctx, depth, pxPerM) {
    const body = Sprites.at('crusher_body', FR, FR, false);
    const jaw = Sprites.at('crusher_jaw', JAW_FR, JAW_FR, false);
    if (!body || !jaw) return;
    const droneDepth = depth + CONFIG.DRONE_Y / pxPerM;
    for (const c of list) {
      const { s, cy, hx, d } = _boxes(c, droneDepth, pxPerM);
      if (cy < -FR || cy > CONFIG.CANVAS_H + FR) continue;

      // Шлейф мути: тянется по стене, пока растёт замах
      if (s.t > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 * s.t;
        ctx.fillStyle = '#4a4036';
        const x0 = c.side === 'left' ? 0 : ctx.canvas.width - 40;
        ctx.fillRect(x0, cy - 260, 40, 260);
        ctx.restore();
      }

      // Корпус
      ctx.drawImage(body, s.cx - FR / 2, cy - FR / 2, FR, FR);

      // Челюсть: шарнир у головы, раствор — поворотом вокруг шарнира
      ctx.save();
      ctx.translate(hx, cy);
      if (d < 0) ctx.scale(-1, 1);
      ctx.rotate(s.open);
      ctx.drawImage(jaw, 0, -JAW_FR / 2, JAW_FR, JAW_FR);
      ctx.restore();

      if (C.DEBUG) {
        const { body: bb, jaw: jb } = _boxes(c, droneDepth, pxPerM);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.strokeRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
        ctx.strokeRect(jb.x0, jb.y0, jb.x1 - jb.x0, jb.y1 - jb.y0);
        ctx.restore();
      }
    }
  }

  function count() { return list.length; }
  function items() { return list; }

  return { reset, update, hitTest, shootAt, covers, draw, count, list: items };

})();
