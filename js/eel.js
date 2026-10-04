// ===== eel.js =====
// ============================================================
// УГОРЬ ИЗ НОРЫ — тварь, которая бьёт один раз и по месту.
//
// Гнездо спрашивает «когда»: щупальца ходят по кругу, надо поймать окно.
// Угорь спрашивает «где». Он сидит в норе, зажигает глаз, и когда дрон
// подходит — бьёт туда, где дрон был в этот момент. Увернуться можно,
// но уходить надо ЗАРАНЕЕ: на сам удар дано треть секунды.
//
// ТРИ ВЕЩИ, КОТОРЫЕ ЗДЕСЬ ВАЖНЕЕ ВСЕГО.
//
// 1. ГОЛОВА — ПЕРЕДНИЙ КОНЕЦ, ВСЕГДА. Владелец разбирал мою схему и
//    поймал ровно эту ошибку: «голова осталась на месте, а вылетел из
//    неё заострённый рог». Рога нет и не было — я посадил голову у стены,
//    и наружу поехало тело. Теперь голова жёстко привязана к ПОСЛЕДНЕЙ
//    точке кривой, а тело тянется за ней назад, в темноту норы.
//
// 2. СТЫК СЧИТАЕТСЯ ПО КАСАТЕЛЬНОЙ ПОСЛЕДНЕГО ОТРЕЗКА, а не по хорде.
//    Второй отлов владельца: «стык головы с туловищем скошенный». Хорда
//    через две точки кривой даёт угол, отличный от направления тела в
//    самой точке стыка, и шея встаёт наискось. Плюс тело заходит ПОД
//    голову на HEAD_SINK: прямой срез шеи должен быть чем-то закрыт.
//
// 3. КАРТИНКА И СМЕРТЬ — ОДНА КРИВАЯ, как у гнезда. Полосы тела, голова
//    и капсулы хитбокса берутся из одного и того же массива точек. Не
//    «похожи», а построены из одного.
//
// Обещание по проходу то же, что у гнезда, и держится так же: вылет
// считается от ширины коридора, и каждая точка дополнительно прижата к
// пределу со своим радиусом. Проход не бывает уже GAP_MIN — не по
// замеру, а по построению.
// ============================================================

const Eel = (() => {

  const E = CONFIG.EEL;

  let eels = [];           // {depth, side, state, t, cool, lockX, len, aim}
  let nextSpawn = 0;
  let armed = false;
  let _span = 0;           // высота норы в метрах, заполняется в update

  function reset() { eels = []; nextSpawn = 0; armed = false; }

  // Высота норы в метрах
  function _spanM(pxPerM) { return E.BURROW_H / pxPerM; }

  // Сколько породы нужно слева от устья, чтобы спрайт встал целиком.
  // Нора сажается по ОТВЕРСТИЮ (см. MOUTH_IN в config), а не по силуэту.
  const SPR_LEFT = E.MOUTH_IN + E.MOUTH_X * E.BURROW_W;

  function _mouth(e, pxPerM) {
    const md = e.depth + E.BURROW_H * E.MOUTH_Y / pxPerM;
    const w = Canyon.getWalls(md);
    const dir = e.side === 'left' ? 1 : -1;
    const wall = e.side === 'left' ? w.hitLeft : w.hitRight;
    return { x: wall - dir * E.MOUTH_IN, depth: md, py: md * pxPerM, dir, wall };
  }

  // Насколько обод норы выступает в проход на этой глубине.
  // Вне норы — ноль.
  function _out(e, depth, pxPerM) {
    const span = E.BURROW_H / pxPerM;
    const t = (depth - e.depth) / span;
    if (t <= 0 || t >= 1) return 0;
    return _prof(E.OUT_PROFILE, t);
  }

  // Линейная выборка по массиву-профилю
  function _prof(P, u) {
    const n = P.length - 1;
    const x = Math.max(0, Math.min(n, u * n));
    const i = Math.min(n - 1, Math.floor(x));
    return P[i] + (P[i + 1] - P[i]) * (x - i);
  }

  // Радиус тела/головы на расстоянии arc от устья.
  // До стыка работает профиль тела (от хвоста к голове), после — профиль
  // головы. Пасть раскрыта и шире шеи, и считать её трубкой шириной с
  // шею значит обещать игроку зазор, которого нет.
  function _radAt(arc, total) {
    const headStart = Math.max(0, total - E.HEAD_LEN);
    if (arc >= headStart) {
      const u = E.HEAD_LEN > 0 ? Math.min(1, (arc - headStart) / E.HEAD_LEN) : 0;
      return _prof(E.HEAD_PROFILE, u);
    }
    // Строка картинки для этой точки — та же, что берёт отрисовка.
    // Если бы радиус считался по своей формуле, хитбокс разъехался бы с
    // телом, и это вылезло бы не сразу: ровно так было у коралла.
    const u = headStart > 0 ? arc / headStart : 0;      // 0 у хвоста, 1 у шеи
    return E.BODY_W * 0.5 * _prof(E.BODY_PROFILE, E.BODY_V_TAIL * (1 - u));
  }

  function _bez(p0, p1, p2, s) {
    const u = 1 - s;
    return { x: u * u * p0.x + 2 * u * s * p1.x + s * s * p2.x,
             y: u * u * p0.y + 2 * u * s * p1.y + s * s * p2.y };
  }

  // ---------- геометрия удара ----------

  // Докуда вообще можно дотянуться с этой стены, не перекрыв проход.
  // Самое тесное место берём по ВСЕЙ полосе глубин, которую занимает
  // тварь: ущелье колышется с периодом в восемь метров, и одной пробы
  // мало. Ровно на этом гнездо четыре раза не добирало обещанных 60 px.
  function _limit(m, pxPerM) {
    const band = (E.HEAD_W * 0.5 + CONFIG.DRONE_RADIUS + 60) / pxPerM;
    let lim = m.dir > 0 ? 1e9 : -1e9;
    for (let k = 0; k <= 8; k++) {
      const w = Canyon.getWalls(m.depth - band + 2 * band * k / 8);
      lim = m.dir > 0 ? Math.min(lim, w.hitRight) : Math.max(lim, w.hitLeft);
    }
    return lim;
  }

  function maxReach(e, pxPerM) {
    const m = _mouth(e, pxPerM);
    const lim = _limit(m, pxPerM);
    const room = Math.abs(lim - m.x) - E.GAP_MIN - E.SAFETY - E.HEAD_W * 0.5;
    return Math.max(0, Math.min(E.MAX_REACH, room));
  }

  // Точки тела и голова. Одна функция на отрисовку и на столкновение.
  // Форма считается ОДИН раз на кадр и отдаётся всем троим — отрисовке,
  // хитбоксу и замеру просвета. Иначе девять опросов ущелья на тварь
  // умножались бы на три, а getWalls — не бесплатная функция.
  function _shape(e, pxPerM, time) {
    if (e._sh && e._shT === time && e._shL === e.len) return e._sh;
    const r = _shapeCalc(e, pxPerM, time);
    e._sh = r; e._shT = time; e._shL = e.len;
    return r;
  }

  function _shapeCalc(e, pxPerM, time) {
    const m = _mouth(e, pxPerM);
    const L = e.len;
    if (L <= 0.5) return null;

    // Провис. На выходе тело почти прямое — это бросок. На возврате
    // слабнет и выгибается: втянуться струной нельзя.
    const sl = e.slack;
    const wob = Math.sin(time * 2.1 + e.phase * 7) * 3;
    const P0 = { x: m.x, y: m.py };
    const P1 = { x: m.x + m.dir * L * 0.55, y: m.py + (-6 + 50 * sl) + wob };
    const P2 = { x: m.x + m.dir * L,        y: m.py + (10 + 30 * sl) };

    const lim = _limit(m, pxPerM);

    // Плотная выборка: сначала без прижима, чтобы узнать длину дуги,
    // потом с прижимом по собственному радиусу каждой точки.
    const M = 32;
    const raw = [];
    for (let k = 0; k <= M; k++) raw.push(_bez(P0, P1, P2, k / M));
    let approx = 0;
    for (let k = 1; k <= M; k++) approx += Math.hypot(raw[k].x - raw[k - 1].x, raw[k].y - raw[k - 1].y);

    const pts = [];
    let arc = 0;
    for (let k = 0; k <= M; k++) {
      const p = raw[k];
      if (k > 0) arc += Math.hypot(p.x - raw[k - 1].x, p.y - raw[k - 1].y);
      const r = _radAt(arc, approx);
      let x = p.x;
      if (m.dir > 0) x = Math.min(x, lim - E.GAP_MIN - E.SAFETY - r);
      else           x = Math.max(x, lim + E.GAP_MIN + E.SAFETY + r);
      pts.push({ x, y: p.y, r });
    }

    // Длины дуги уже по ПРИЖАТЫМ точкам: по ним режем тело и сажаем голову
    const arcs = [0];
    for (let k = 1; k <= M; k++)
      arcs.push(arcs[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const total = arcs[M];

    return { m, pts, arcs, total, headStart: Math.max(0, total - E.HEAD_LEN) };
  }

  // Точка и КАСАТЕЛЬНАЯ на заданной длине дуги. Касательная берётся у
  // отрезка, внутри которого лежит точка, — не хордой через соседей.
  function _atArc(sh, a) {
    const A = sh.arcs, n = A.length - 1;
    a = Math.max(0, Math.min(sh.total, a));
    let i = 0;
    while (i < n - 1 && A[i + 1] < a) i++;
    const seg = A[i + 1] - A[i];
    const u = seg > 1e-6 ? (a - A[i]) / seg : 0;
    const p0 = sh.pts[i], p1 = sh.pts[i + 1];
    return { x: p0.x + (p1.x - p0.x) * u,
             y: p0.y + (p1.y - p0.y) * u,
             ang: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
  }

  // ---------- появление ----------

  function _maybeSpawn(depth, aheadDepth, pxPerM) {
    if (Canyon.timeAt(depth) < E.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawn = depth + E.SPAWN_EVERY * 0.5; }

    while (nextSpawn < aheadDepth) {
      const span = _spanM(pxPerM);
      let placed = null;
      for (let d = nextSpawn; d < nextSpawn + E.SEARCH_AHEAD; d += 6) {
        const a = Canyon.getWalls(d), b = Canyon.getWalls(d + span);
        if (a.phase !== 'rest' || b.phase !== 'rest') continue;
        if (a.hitRight - a.hitLeft < E.MIN_CORRIDOR) continue;
        if (b.hitRight - b.hitLeft < E.MIN_CORRIDOR) continue;
        // Нора и гнездо на одной стене — это две твари в одной точке.
        // Правило на всю игру: испытания не складываются.
        if (typeof Nest !== 'undefined' &&
            (Nest.covers(d, 'left') || Nest.covers(d, 'right') ||
             Nest.covers(d + span, 'left') || Nest.covers(d + span, 'right'))) continue;
        placed = d; break;
      }
      if (placed === null) { nextSpawn += E.SEARCH_AHEAD; continue; }
      eels.push({ depth: placed, side: Math.random() < 0.5 ? 'left' : 'right',
                  state: 'ambush', t: 0, cool: 0, lockX: 0, len: 0, aim: 0,
                  slack: 0, phase: Math.random() });
      nextSpawn = placed + E.SPAWN_EVERY;
    }
  }

  // ---------- состояния ----------

  function update(depth, aheadDepth, pxPerM, dt, droneX, droneDepth, fallSpeed) {
    _maybeSpawn(depth, aheadDepth, pxPerM);
    const span = _span = _spanM(pxPerM);

    for (const e of eels) {
      e.t += dt;
      if (e.cool > 0) e.cool -= dt;
      const m = _mouth(e, pxPerM);
      const dd = m.depth - droneDepth;          // >0 — дрон ещё выше норы
      const py = (m.depth - depth) * pxPerM;    // где устье на экране

      switch (e.state) {
        case 'ambush':
          // Прицел включается, когда нора входит в кадр: предупреждение
          // должно быть видно, а не случиться за нижней кромкой экрана.
          if (e.cool <= 0 && dd > 0 && py <= CONFIG.CANVAS_H + E.TRIGGER_PY) {
            e.state = 'tele'; e.t = 0;
          }
          break;

        case 'tele':
          // Ждём, пока дрон подойдёт на STRIKE_LEAD секунд падения. Так
          // угроза одинакова и на 150 м/с, и на 320: предупреждение
          // растягивается, а сам удар всегда занимает одно и то же время.
          if (e.t >= E.TELE_MIN && dd <= fallSpeed * E.STRIKE_LEAD) {
            e.state = 'lunge'; e.t = 0;
            e.lockX = droneX;                   // бьёт туда, где дрон БЫЛ
            const mx = m.x;
            const want = Math.abs(e.lockX - mx) + E.OVERSHOOT;
            e.aim = Math.max(E.MIN_REACH, Math.min(maxReach(e, pxPerM), want));
          }
          break;

        case 'lunge': {
          const u = Math.min(1, e.t / E.LUNGE);
          e.len = e.aim * (1 - Math.pow(1 - u, 3));    // резко, с доводкой
          e.slack = 0;
          if (u >= 1) { e.state = 'hold'; e.t = 0; }
          break;
        }

        case 'hold':
          e.len = e.aim; e.slack = 0;
          // Держит, пока дрон не прошёл мимо. Фиксированная выдержка
          // сделала бы тварь безобидной на малой скорости и
          // неотвратимой на большой.
          if (dd < -12 || e.t >= E.HOLD_MAX) { e.state = 'back'; e.t = 0; }
          break;

        case 'back': {
          const u = Math.min(1, e.t / E.RETRACT);
          e.len = e.aim * (1 - u) * (1 - u);
          e.slack = Math.sin(Math.PI * u);      // провисает и подбирается
          if (u >= 1) { e.state = 'ambush'; e.t = 0; e.len = 0; e.slack = 0; e.cool = E.COOL; }
          break;
        }
      }
    }

    eels = eels.filter(e => e.depth + span > depth - 60);
  }

  // ---------- столкновение ----------

  function _segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L = vx * vx + vy * vy;
    let t = L > 0 ? ((px - ax) * vx + (py - ay) * vy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }

  function hitTest(droneX, droneDepth, pxPerM, time) {
    const dr = CONFIG.DRONE_RADIUS;
    const dy = droneDepth * pxPerM;
    for (const e of eels) {
      // Сам обод норы — камень, и он торчит в проход. Берём выступ по
      // профилю силуэта, а не прямоугольником: прямоугольник убивал бы
      // в пустоте у верхнего и нижнего краёв норы.
      const out = _out(e, droneDepth, pxPerM);
      if (out > 0) {
        const w = Canyon.getWalls(droneDepth);
        if (e.side === 'left'  && droneX - dr < w.hitLeft  + out) return true;
        if (e.side === 'right' && droneX + dr > w.hitRight - out) return true;
      }

      if (e.len <= 0.5) continue;               // в норе — не опасен
      const sh = _shape(e, pxPerM, time);
      if (!sh) continue;
      for (let k = 0; k < sh.pts.length - 1; k++) {
        const a = sh.pts[k], b = sh.pts[k + 1];
        if (_segDist(droneX, dy, a.x, a.y, b.x, b.y) < dr + (a.r + b.r) * 0.5) return true;
      }
    }
    return false;
  }

  // Чистый просвет на этой глубине с учётом угря, в пикселях.
  // Ради него всё и затевалось: обещание «не уже GAP_MIN» проверяется
  // числом на всей трассе, а не на глаз в паре кадров.
  function clearGapAt(depth, pxPerM, time) {
    const w = Canyon.getWalls(depth);
    let lo = w.hitLeft, hi = w.hitRight;
    const py = depth * pxPerM;
    for (const e of eels) {
      const out = _out(e, depth, pxPerM);
      if (out > 0) {
        if (e.side === 'left') lo = Math.max(lo, w.hitLeft + out);
        else                   hi = Math.min(hi, w.hitRight - out);
      }
      if (e.len <= 0.5) continue;
      const sh = _shape(e, pxPerM, time);
      if (!sh) continue;
      for (const p of sh.pts) {
        if (Math.abs(p.y - py) > p.r + CONFIG.DRONE_RADIUS) continue;
        if (e.side === 'left') lo = Math.max(lo, p.x + p.r);
        else                   hi = Math.min(hi, p.x - p.r);
      }
    }
    return Math.max(0, hi - lo);
  }

  // ---------- отрисовка ----------

  function draw(ctx, depth, pxPerM, time) {
    const span = _spanM(pxPerM);
    const bur = Sprites.raw('eel_burrow');
    const body = Sprites.raw('eel_body');
    const head = Sprites.raw('eel_head');

    for (const e of eels) {
      const topPy = (e.depth - depth) * pxPerM;
      if (topPy > CONFIG.CANVAS_H + 120 || topPy + E.BURROW_H < -120) continue;
      const left = e.side === 'left';

      // НОРА. Полосами по стене, не одной картинкой: за свои 119 px стена
      // успевает уйти вбок, и нора, посаженная прямоугольником, отклеится
      // от породы. Та же ошибка была у коралла и у основания гнезда, и
      // то же лекарство.
      if (bur) {
        const bimg = Sprites.at('eel_burrow', E.BURROW_W, E.BURROW_H, !left);
        if (bimg) {
          const STEP = 4;
          for (let o = 0; o < E.BURROW_H; o += STEP) {
            const d = e.depth + o / pxPerM;
            const py = (d - depth) * pxPerM;
            if (py < -STEP || py > CONFIG.CANVAS_H + STEP) continue;
            const w = Canyon.getWalls(d);
            const x = left ? w.hitLeft - SPR_LEFT
                           : w.hitRight + SPR_LEFT - E.BURROW_W;
            const sy = (o / E.BURROW_H) * bimg.height;
            const sh = Math.max(1, (STEP / E.BURROW_H) * bimg.height);
            ctx.drawImage(bimg, 0, sy, bimg.width, sh, x, py, E.BURROW_W, STEP + 1);
          }
        }
      }

      // ГЛАЗ. В засаде тусклый янтарь, на прицеле наливается красным.
      // Это единственное предупреждение, которое игрок получает, поэтому
      // оно светится, а не меняет оттенок на полтона.
      const m = _mouth(e, pxPerM);
      const epy = (m.depth - depth) * pxPerM;
      if (epy > -40 && epy < CONFIG.CANVAS_H + 40 && e.len <= 0.5) {
        const warn = e.state === 'tele' ? Math.min(1, e.t / 0.35) : 0;
        const puls = 0.65 + 0.35 * Math.sin(time * (warn > 0 ? 11 : 3) + e.phase * 6);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Два круга: широкое гало и плотное ядро. Одним кругом глаз на
        // кадре из игры читался как точка — а это ЕДИНСТВЕННОЕ
        // предупреждение, которое игрок получает перед ударом.
        const col = warn > 0 ? `255,${Math.round(70 - 40 * warn)},45` : '255,170,60';
        ctx.fillStyle = `rgba(${col},${(warn > 0 ? 0.14 + 0.20 * warn : 0.07) * puls})`;
        ctx.beginPath();
        ctx.arc(m.x, epy, 10 + 16 * warn, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${col},${(warn > 0 ? 0.45 + 0.55 * warn : 0.26) * puls})`;
        ctx.beginPath();
        ctx.arc(m.x, epy, 3.5 + 4.5 * warn, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (e.len <= 0.5) continue;
      const sh = _shape(e, pxPerM, time);
      if (!sh || !body || !head) continue;

      // ТЕЛО. Полосами вдоль кривой, как щупальце. Толстый конец спрайта —
      // у головы, тонкий уходит в темноту норы, поэтому строка картинки
      // берётся от конца к началу. Тело заходит за стык на HEAD_SINK:
      // прямой срез шеи должен быть чем-то закрыт.
      const bodyEnd = Math.min(sh.total, sh.headStart + E.HEAD_SINK);
      if (bodyEnd > 1) {
        // Размер уменьшенной копии ПОСТОЯННЫЙ. Если просить её по текущей
        // длине тела, на каждом кадре броска запрашивается новый размер,
        // и кэш спрайтов распухает на сотню холстов за секунду. Растянуть
        // полосы по кривой дешевле, чем пересобирать картинку.
        const bimg = Sprites.at('eel_body', E.BODY_W, E.BODY_H, false);
        if (bimg) {
          const N = E.SEGMENTS;
          for (let k = 0; k < N; k++) {
            const a0 = bodyEnd * k / N, a1 = bodyEnd * (k + 1) / N;
            const p0 = _atArc(sh, a0), p1 = _atArc(sh, a1);
            const ay = p0.y - depth * pxPerM, by = p1.y - depth * pxPerM;
            if (ay < -140 && by < -140) continue;
            if (ay > CONFIG.CANVAS_H + 140 && by > CONFIG.CANVAS_H + 140) continue;
            const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) + 1.2;   // нахлёст
            const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            // строка картинки: BODY_V_TAIL у устья, 0 у шеи (верх спрайта).
            // Нижняя часть картинки — хвост — остаётся в норе и не
            // показывается вовсе.
            const v0 = E.BODY_V_TAIL * (1 - a0 / bodyEnd);
            const v1 = E.BODY_V_TAIL * (1 - a1 / bodyEnd);
            const sy = v1 * bimg.height;
            const shh = Math.max(1, (v0 - v1) * bimg.height);
            ctx.save();
            ctx.translate(p0.x, ay);
            ctx.rotate(ang - Math.PI / 2);          // спрайт нарисован вниз
            ctx.scale(1, -1);                        // хвост снизу — разворот
            ctx.drawImage(bimg, 0, sy, bimg.width, shh, -E.BODY_W / 2, -len, E.BODY_W, len);
            ctx.restore();
          }
        }
      }

      // ГОЛОВА. Сустав — на длине дуги headStart, угол — касательная ТОГО
      // отрезка, в котором сустав лежит. Хорда через соседние точки давала
      // скошенный стык, и владелец это увидел сразу.
      const j = _atArc(sh, sh.headStart);
      const himg = Sprites.at('eel_head', E.HEAD_W, E.HEAD_H, !left);
      if (himg) {
        const jx = left ? E.HEAD_JOINT[0] : E.HEAD_W - E.HEAD_JOINT[0];
        const jy = E.HEAD_JOINT[1];
        const axis = (left ? E.HEAD_AXIS : 180 - E.HEAD_AXIS) * Math.PI / 180;
        ctx.save();
        ctx.translate(j.x, j.y - depth * pxPerM);
        ctx.rotate(j.ang - axis);
        ctx.drawImage(himg, -jx, -jy, E.HEAD_W, E.HEAD_H);
        ctx.restore();
      }
    }
  }

  // Занято ли это место норой. Нужно наростам: коралл, выросший на норе,
  // закрыл бы единственное предупреждение, которое есть у игрока.
  function covers(depth, side) {
    for (const e of eels) {
      if (e.side !== side) continue;
      if (depth > e.depth - 8 && depth < e.depth + _span + 8) return true;
    }
    return false;
  }

  function count() { return eels.length; }
  function list() { return eels; }

  // Для проверок: точки и радиусы хитбокса в экранных координатах.
  // Нужны, чтобы наложить хитбокс на кадр из игры и УВИДЕТЬ совпадение,
  // а не рассуждать о нём. На коралле невидимое убивающее место нашлось
  // именно так, и нашёл его не я.
  function debugShape(depth, pxPerM, time) {
    const out = [];
    for (const e of eels) {
      if (e.len <= 0.5) continue;
      const sh = _shape(e, pxPerM, time);
      if (!sh) continue;
      out.push({ side: e.side, state: e.state,
                 pts: sh.pts.map(p => ({ x: p.x, y: p.y - depth * pxPerM, r: p.r })) });
    }
    return out;
  }

  return { reset, update, hitTest, clearGapAt, draw, count, covers, maxReach,
           list, debugShape };

})();
