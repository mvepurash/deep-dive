// ===== hydra.js =====
// ============================================================
// ГИДРА — засада на стене: стебель с короной на конце. Корона бьёт
// кончиками щупалец, и игрок может попасться на них.
//
// ЗАЧЕМ ОНА ТАК УСТРОЕНА. На скорости падения гидра проходит экран за
// две секунды: её основание въезжает снизу, корона поднимается и уходит
// вверх. Поэтому её бросок привязан не к секундам, а к ГЛУБИНЕ: она бьёт,
// когда корона оказывается на одной высоте с дрононом. Окно замаха
// (раскрытие головы) идёт прямо перед этим, и его видно. Гидра бьёт один
// раз за свою видимую жизнь — как засада, а не как метроном.
//
// Выстрел в корону убивает её, выстрел в стебель просто гаснет о неё.
//
// ТРИ ПРАВИЛА, НА КОТОРЫХ ВСЁ ДЕРЖИТСЯ.
//
// 1. КАРТИНКА И ХИТБОКС — ИЗ ОДНОГО ИСТОЧНИКА. Координаты кончиков и стебля
//    сняты с самих спрайтов (key_hydra.py), а не нарисованы на глаз. Слева
//    и справа — одна и та же геометрия, зеркалится только картинка.
//
// 2. ПРОСВЕТ ЗАДАЁТСЯ ПРИ ПОЯВЛЕНИИ. Угол выноса головы считается по
//    ширине коридора на всей высоте гидры и больше не меняется. Если
//    коридор узок, голова просто не выходит в проход, а не перекрывает его.
//    Гидру не ставим, где вынос меньше MIN_LEAN: тварь без броска — не тварь.
//
// 3. БРОСОК ОГРАНИЧЕН СКОРОСТЬЮ. Конец броска идёт линейно, со средней
//    скоростью кончика ниже бокового предела дрона — от него можно уйти.
// ============================================================

const Hydra = (() => {

  const H = CONFIG.HYDRA;
  const W = H.W_PX, HH = H.H_PX;
  const SIDE_SIGN = { left: 1, right: -1 };

  let list = [];            // {depth, side, wallX, thFit, th, k, state, t, age, phase, alive, fade}
  let nextSpawn = 0;
  let armed = false;
  let _spanM = 0;           // высота гидры в метрах
  let _pxPerM = 1;
  let _v = 250;             // скорость падения, м/с — оценивается по ходу игры
  let _lastDepth = null;

  function reset() { list = []; nextSpawn = 0; armed = false; _lastDepth = null; }

  // ---------- геометрия ----------

  // Из доли спрайта в локальные пиксели относительно точки крепления.
  // Y вверх отрицательный: гидра растёт в сторону меньших глубин (на экран вверх).
  function _lx(fx) { return (fx - H.PIVOT[0]) * W; }
  function _ly(fy) { return (fy - H.PIVOT[1]) * HH; }

  // Поворот вокруг точки крепления. Тот же порядок, что у ctx.rotate.
  function _rot(x, y, th) {
    const c = Math.cos(th), s = Math.sin(th);
    return [x * c - y * s, x * s + y * c];
  }

  const HULL_LOC = H.HULL.map(([fx, fy]) => [_lx(fx), _ly(fy)]);

  // Наибольший вынос головы от крепления вглубь прохода (px) при повороте th.
  // Для выпуклой оболочки максимум линейной функции достигается в вершине,
  // поэтому проверяем только вершины, а не все пиксели картинки.
  function _offset(th) {
    let m = -1e9;
    for (const [x, y] of HULL_LOC) {
      const rx = x * Math.cos(th) - y * Math.sin(th);
      if (rx > m) m = rx;
    }
    return m;
  }

  // Высота короны над креплением, в метрах
  function _crownOffM(pxPerM) { return ((H.PIVOT[1] - H.CROWN[1]) * HH) / pxPerM; }

  // ---------- место и наклон ----------

  // Глубины, на которых гидра стоит: от крепления (самая глубокая точка)
  // до кончика короны. Коридор проверяем на всех них.
  function _depthsAt(dp, pxPerM) {
    const span = HH / pxPerM, out = [];
    for (let i = 0; i <= 8; i++) out.push(dp - span * (i / 8));
    return out;
  }

  // Можно ли поставить гидру здесь и на какую сторону. Возвращает наклон
  // головы, при котором просвет ещё не меньше GAP_MIN, либо null.
  function _fit(dp, side, pxPerM) {
    const w0 = Canyon.getWalls(dp);
    if (w0.phase !== 'rest') return null;
    if (Canyon.getWalls(dp - HH / pxPerM).phase !== 'rest') return null;

    let minRight = Infinity, maxLeft = -Infinity;
    for (const d of _depthsAt(dp, pxPerM)) {
      const w = Canyon.getWalls(d);
      if (w.hitRight - w.hitLeft < H.MIN_CORRIDOR) return null;
      if (w.hitRight < minRight) minRight = w.hitRight;
      if (w.hitLeft > maxLeft) maxLeft = w.hitLeft;
    }

    let pivotX, room;
    if (side === 'left') {
      pivotX = w0.hitLeft;
      room = minRight - H.GAP_MIN - pivotX;
    } else {
      pivotX = w0.hitRight;
      room = pivotX - maxLeft - H.GAP_MIN;
    }

    // В покое голова отходит на STRIKE_AMP к стене. Если даже это не
    // влезает, гидру не ставим — иначе покой сам перекроет проход.
    const lo = H.LEAN_BACK + H.STRIKE_AMP;
    if (_offset(lo) > room) return null;

    // Самый большой вынос, который ещё влезает
    let thFit = null;
    for (let th = H.LEAN_MAX; th >= lo - 1e-9; th -= 0.01) {
      if (_offset(th) <= room) { thFit = th; break; }
    }
    if (thFit === null || thFit < H.MIN_LEAN) return null;

    return { pivotX, thFit };
  }

  // ---------- появление ----------

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < H.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + H.SPAWN_EVERY * 0.6; }

    while (nextSpawn < aheadDepth) {
      let placed = null;
      // Ищем передышку, где гидра поместится и голова может выйти в проход
      for (let d = nextSpawn; d < nextSpawn + H.SEARCH_AHEAD; d += 6) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const fit = _fit(d, side, pxPerM);
        if (fit) { placed = { d, side, fit }; break; }
      }
      if (!placed) { nextSpawn += H.SEARCH_AHEAD; continue; }

      const phase = Math.random() * Math.PI * 2;
      const thIdle = placed.fit.thFit - H.STRIKE_AMP + H.SWAY * Math.sin(phase);
      list.push({
        depth: placed.d,
        side: placed.side,
        wallX: placed.fit.pivotX,
        thFit: placed.fit.thFit,
        th: thIdle,
        k: 0,                       // 0 — голова закрыта, 1 — раскрыта
        state: 'rest',              // rest -> tele -> strike -> hold -> retreat -> done
        t: 0,
        age: 0,
        phase,
        alive: true,
        fade: 0,
      });
      nextSpawn = placed.d + H.SPAWN_EVERY;
    }
  }

  // ---------- шаг ----------

  function _smooth(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

  // Глубина, на которой корона оказывается на одной высоте с дрононом,
  // минус время замаха в метрах. Замах начинается отсюда, бросок — точно
  // в момент, когда корона над дрононом.
  function _triggerDepth(h) {
    const strikeAt = h.depth - _crownOffM(_pxPerM) - CONFIG.DRONE_Y / _pxPerM;
    return strikeAt - H.TELE * _v;
  }

  function _step(h, dt, depth) {
    h.age += dt;
    if (!h.alive) { h.fade = Math.max(0, h.fade - dt); return; }

    // Покой с покачиванием. Все фазы идут от ЭТОГО угла, а не от голого
    // покоя, — иначе на стыке фаз голова щёлкала бы на величину покачивания
    const idle = h.thFit - H.STRIKE_AMP + H.SWAY * Math.sin(2 * Math.PI * h.age / H.SWAY_PERIOD + h.phase);
    const thPull = idle - H.PULL;

    switch (h.state) {
      case 'rest': {
        // Покачивается, пока не настанет момент замаха по глубине
        h.th = idle;
        h.k = 0;
        if (depth >= _triggerDepth(h)) { h.state = 'tele'; h.t = 0; }
        break;
      }
      case 'tele': {
        h.t += dt;
        const u = Math.min(1, h.t / H.TELE);
        h.th = idle + (thPull - idle) * _smooth(u);      // голова отходит
        h.k = _smooth(u);                                // и раскрывается
        if (h.t >= H.TELE) { h.state = 'strike'; h.t = 0; }
        break;
      }
      case 'strike': {
        // Линейно, без разгона: скорость кончика ровная и предсказуемая
        h.t += dt;
        const u = Math.min(1, h.t / H.STRIKE);
        h.th = thPull + (h.thFit - thPull) * u;
        h.k = 1;
        if (h.t >= H.STRIKE) { h.state = 'hold'; h.t = 0; }
        break;
      }
      case 'hold': {
        h.t += dt;
        h.th = h.thFit;
        h.k = 1;
        if (h.t >= H.HOLD) { h.state = 'retreat'; h.t = 0; }
        break;
      }
      case 'retreat': {
        h.t += dt;
        const u = Math.min(1, h.t / H.RETREAT);
        h.th = h.thFit + (idle - h.thFit) * _smooth(u);
        h.k = 1 - _smooth(u * 2);                        // раскрытие гаснет в первой половине
        if (h.t >= H.RETREAT) { h.state = 'done'; h.t = 0; }
        break;
      }
      case 'done': {
        // Бросок окончен: гидра спокойна и не опасна, пока не уйдёт вверх
        h.th = idle;
        h.k = 0;
        break;
      }
    }
  }

  function update(depth, aheadDepth, pxPerM, dt) {
    _pxPerM = pxPerM;
    _spanM = HH / pxPerM;
    const step = dt || 0;
    // Скорость падения — по ходу игры: замах нужен в метрах, а метры
    // зависят от того, насколько быстро мы падаем сейчас
    if (_lastDepth !== null && step > 0) {
      const v = (depth - _lastDepth) / step;
      if (v > 50 && v < 1000) _v = v;
    }
    _lastDepth = depth;

    for (const h of list) _step(h, step, depth);
    _maybeSpawn(depth, aheadDepth, pxPerM);
    // Убираем, когда гидра полностью ушла за верх экрана
    list = list.filter(h => (h.alive || h.fade > 0) && h.depth > depth - _spanM - 10);
  }

  // ---------- столкновение и выстрел ----------

  // Все круги гидры в мировых пикселях. head — круги, выстрел в которые
  // убивает тварь (корона и кончики), остальные — стебель, он поглощает пули.
  function _worldCircles(h, pxPerM) {
    const s = SIDE_SIGN[h.side];
    const baseY = h.depth * pxPerM;
    const out = [];

    const toWorld = (lx, ly) => {
      const [rx, ry] = _rot(lx, ly, h.th);
      return { x: h.wallX + s * rx, y: baseY + ry };
    };

    for (const [fx, fy, fr] of H.STALK) {
      const p = toWorld(_lx(fx), _ly(fy));
      out.push({ x: p.x, y: p.y, r: fr * HH, head: false });
    }

    // Центр короны плавно едет от покоя к раскрытию: скачок хитбокса за
    // кадр был бы гибелью без предупреждения
    const cx = H.CROWN[0] + (H.CROWN_STRIKE[0] - H.CROWN[0]) * h.k;
    const cy = H.CROWN[1] + (H.CROWN_STRIKE[1] - H.CROWN[1]) * h.k;
    const pc = toWorld(_lx(cx), _ly(cy));
    out.push({ x: pc.x, y: pc.y, r: H.CROWN_R * HH, head: true });

    const tips = h.k < 0.5 ? H.TIPS_IDLE : H.TIPS_STRIKE;
    for (const [fx, fy] of tips) {
      const p = toWorld(_lx(fx), _ly(fy));
      out.push({ x: p.x, y: p.y, r: H.TIP_R * HH, head: true });
    }
    return out;
  }

  function hitTest(droneX, droneDepth, pxPerM) {
    const dr = CONFIG.DRONE_RADIUS;
    for (const h of list) {
      if (!h.alive) continue;
      if (droneDepth < h.depth - _spanM - 2 || droneDepth > h.depth + 2) continue;
      const dy = droneDepth * pxPerM;
      for (const c of _worldCircles(h, pxPerM)) {
        if (Math.hypot(droneX - c.x, dy - c.y) < dr + c.r) return true;
      }
    }
    return false;
  }

  // Возвращает точку попадания, если пуля задела гидру, иначе null.
  // В корону — гидра гибнет. В стебель — пуля гаснет, тварь цела.
  function shootAt(sx, sDepth, pxPerM) {
    const sy = sDepth * pxPerM, sr = CONFIG.PICKUP.SHOT_RADIUS;
    for (const h of list) {
      if (!h.alive) continue;
      if (sDepth < h.depth - _spanM - 3 || sDepth > h.depth + 3) continue;
      const circles = _worldCircles(h, pxPerM);
      for (const c of circles) {
        if (c.head && Math.hypot(sx - c.x, sy - c.y) < sr + c.r) {
          h.alive = false;
          h.fade = H.DEAD_TIME;
          return { x: sx, y: sDepth };
        }
      }
      for (const c of circles) {
        if (!c.head && Math.hypot(sx - c.x, sy - c.y) < sr + c.r) {
          return { x: sx, y: sDepth };
        }
      }
    }
    return null;
  }

  // Коралы на этой стене не растут там, где стоит гидра
  function covers(depth, side) {
    for (const h of list) {
      if (h.side !== side) continue;
      if (depth > h.depth - _spanM - 6 && depth < h.depth + 6) return true;
    }
    return false;
  }

  // ---------- отрисовка ----------

  function draw(ctx, depth, pxPerM) {
    for (const h of list) {
      const py = (h.depth - depth) * pxPerM;
      if (py < -HH - 40 || py > CONFIG.CANVAS_H + 40) continue;

      const idle = Sprites.at('hydra_idle', W, HH, false);
      const strike = Sprites.at('hydra_strike', W, HH, false);
      if (!idle || !strike) continue;   // игра идёт и без картинки; хитбокс остаётся

      const fade = h.alive ? 1 : h.fade / H.DEAD_TIME;
      const ox = -H.PIVOT[0] * W, oy = -H.PIVOT[1] * HH;

      ctx.save();
      ctx.translate(h.wallX, py);
      if (h.side === 'right') ctx.scale(-1, 1);
      ctx.rotate(h.th);

      ctx.globalAlpha = fade * (1 - h.k);
      ctx.drawImage(idle, ox, oy, W, HH);
      ctx.globalAlpha = fade * h.k;
      ctx.drawImage(strike, ox, oy, W, HH);
      ctx.restore();
      ctx.globalAlpha = 1;

      if (H.DEBUG) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.lineWidth = 1;
        for (const c of _worldCircles(h, pxPerM)) {
          ctx.beginPath();
          ctx.arc(c.x, c.y - depth * pxPerM, c.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  function count() { return list.length; }
  function items() { return list; }

  return { reset, update, hitTest, shootAt, covers, draw, count, list: items };

})();
