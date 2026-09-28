// ===== swarm.js =====
// ============================================================
// СТАЯ БРИТВ — первая тварь в игре.
//
// Её вопрос игроку: НАЙТИ ДЫРУ В СТРОЮ.
//
// Это единственное в игре, что требует читать обстановку заранее, а не
// реагировать. Стену видно как стену, нарост как нарост — там всё решает
// точность. Здесь же надо за полсекунды разглядеть, где в косяке просвет,
// и начать смещаться ДО того, как он подойдёт. Расстрелять стаю нельзя:
// девять выстрелов в секунду против шестнадцати особей за 0.7 секунды —
// арифметика не сходится, и это намеренно.
//
// ГЛАВНОЕ ПРАВИЛО БЕЗОПАСНОСТИ, как и у ущелья: проход гарантирован
// всегда. Особи хранят не координату x, а долю t поперёк ЧИСТОГО прохода,
// и настоящий x считается от стен на текущей глубине. Отсюда два следствия:
//
//   1. Стая никогда не окажется в породе — положения прижимаются к стенам
//      на текущей глубине. Ровно та ошибка, что была у капсул.
//   2. Дыра задана в ПИКСЕЛЯХ, а не в долях. В узком месте она съедает
//      почти весь косяк, и особей там просто не остаётся — стая и горловина
//      не складываются в испытание, которое не пройти.
// ============================================================

const Swarm = (() => {

  const S = CONFIG.SWARM;

  let groups = [];          // косяки: {depth, gapT, razors:[{t, phase, dead}]}
  let nextSpawnDepth = 0;
  let armed = false;        // до первого появления стаи в заходе

  function reset() {
    groups = [];
    nextSpawnDepth = 0;
    armed = false;
  }

  function _rand(a, b) { return a + Math.random() * (b - a); }

  // Ширина дыры в пикселях на заданной ширине прохода
  function _gapHalf(clear) {
    return Math.max(S.GAP_MIN, clear * S.GAP_FRACTION) / 2;
  }

  // Геометрия на глубине особи: стены, дыры и допустимый створ.
  // Абсолютные координаты лишь ПРИЖИМАЮТСЯ к стенам — не пересчитываются
  // от них. Поэтому дыра стоит на месте, пока стена её не толкнёт.
  function _geom(g, depth) {
    const w = Canyon.getWalls(depth);
    const clear = w.hitRight - w.hitLeft;
    const half = _gapHalf(clear);
    const gaps = g.gaps.map(x => Math.max(w.hitLeft + half,
                            Math.min(w.hitRight - half, x)));
    return { lo: w.hitLeft + S.RADIUS, hi: w.hitRight - S.RADIUS, clear, gaps, half };
  }

  function _razorX(r, geom) {
    return Math.max(geom.lo, Math.min(geom.hi, r.x));
  }

  // Появление: только на широких участках и не раньше, чем игрок освоится
  function _maybeSpawn(depth, aheadDepth) {
    const t = Canyon.timeAt(depth);
    if (t < S.FIRST_AT) return;
    if (!armed) { armed = true; nextSpawnDepth = depth + S.SPAWN_EVERY * 0.5; }

    while (nextSpawnDepth < aheadDepth) {
      const d = nextSpawnDepth;
      const w = Canyon.getWalls(d);
      const clear = w.hitRight - w.hitLeft;
      const phaseOk = w.phase === 'rest' || w.phase === 'release';

      // В горловине не ставим вовсе: два испытания разом не складываем
      if (phaseOk && clear > S.MIN_CORRIDOR) {
        const count = Math.round(_rand(S.COUNT_MIN, S.COUNT_MAX));
        // Широкий проход — две дыры, разнесённые по разные стороны центра
        const ts = clear >= S.TWO_GAPS_FROM
          ? [_rand(0.16, 0.38), _rand(0.62, 0.84)]
          : [_rand(0.22, 0.78)];
        const gaps = ts.map(t => w.hitLeft + t * clear);
        const razors = [];
        for (let i = 0; i < count; i++) {
          razors.push({
            // равномерно поперёк прохода, с лёгким разбросом
            x: w.hitLeft + clear * Math.min(1, Math.max(0,
                 (i + 0.5) / count + _rand(-0.03, 0.03))),
            // слой по глубине: косяк не плоский, а объёмный
            row: Math.floor(Math.random() * S.ROWS),
            phase: Math.random() * Math.PI * 2,
            dead: false,
          });
        }
        groups.push({ depth: d, gaps, razors });
      }
      nextSpawnDepth += S.SPAWN_EVERY * _rand(0.7, 1.3);
    }
  }

  function update(depth, aheadDepth, dt) {
    _maybeSpawn(depth, aheadDepth);
    for (const g of groups) g.depth -= S.RISE_SPEED * dt;
    groups = groups.filter(g => g.depth > depth - 150 &&
                                g.razors.some(r => !r.dead));
  }

  // Глубина конкретной особи с учётом её слоя
  function _razorDepth(g, r) {
    return g.depth + r.row * S.ROW_GAP;
  }

  // Существует ли особь сейчас: попавшие в дыру просто не рисуются
  function _alive(g, r, geom) {
    if (r.dead) return false;
    const x = _razorX(r, geom);
    for (const gx of geom.gaps) if (Math.abs(x - gx) < geom.half) return false;
    return true;
  }

  // Столкновение с дроном. true = гибель
  function hitTest(droneX, droneDepth, pxPerM) {
    const reach = S.RADIUS + CONFIG.DRONE_RADIUS;
    for (const g of groups) {
      for (const r of g.razors) {
        const rd = _razorDepth(g, r);
        const dy = (rd - droneDepth) * pxPerM;
        if (Math.abs(dy) > reach) continue;
        const geom = _geom(g, rd);
        if (!_alive(g, r, geom)) continue;
        if (Math.hypot(_razorX(r, geom) - droneX, dy) < reach) return true;
      }
    }
    return false;
  }

  // Выстрел сбивает одну особь. Стаю этим не разогнать — и не надо
  function shootAt(shotX, shotDepth, pxPerM) {
    const reach = S.RADIUS + CONFIG.PICKUP.SHOT_RADIUS + 3;
    for (const g of groups) {
      for (const r of g.razors) {
        if (r.dead) continue;
        const rd = _razorDepth(g, r);
        const dy = (rd - shotDepth) * pxPerM;
        if (Math.abs(dy) > reach) continue;
        const geom = _geom(g, rd);
        if (!_alive(g, r, geom)) continue;
        if (Math.abs(_razorX(r, geom) - shotX) < reach) { r.dead = true; return true; }
      }
    }
    return false;
  }

  function draw(ctx, depth, pxPerM, time) {
    for (const g of groups) {
      for (const r of g.razors) {
        const rd = _razorDepth(g, r);
        const py = (rd - depth) * pxPerM;
        if (py < -30 || py > CONFIG.CANVAS_H + 30) continue;
        const geom = _geom(g, rd);
        if (!_alive(g, r, geom)) continue;
        // Лёгкое рыскание — косяк должен выглядеть живым, а не сеткой
        const sway = Math.sin(time * 6 + r.phase) * 3;
        const x = _razorX(r, geom) + sway;

        ctx.save();
        ctx.translate(x, py);
        ctx.fillStyle = '#c9d9e2';
        ctx.beginPath();                    // клин носом вверх: они всплывают
        ctx.moveTo(0, -S.RADIUS);
        ctx.lineTo(S.RADIUS * 0.62, S.RADIUS * 0.8);
        ctx.lineTo(0, S.RADIUS * 0.35);
        ctx.lineTo(-S.RADIUS * 0.62, S.RADIUS * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5fd8ff';          // глаз-огонёк
        ctx.beginPath();
        ctx.arc(0, -S.RADIUS * 0.25, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Самый широкий свободный просвет в стае на этой глубине, в пикселях.
  // Ради него всё и затевалось: инвариант «сквозь косяк всегда есть проход»
  // должен проверяться числом, а не на глаз.
  // Возвращает ширину прохода, если стаи на этой глубине нет — ширину коридора.
  function freeGapAt(depth, bandPx, pxPerM) {
    const w = Canyon.getWalls(depth);
    const занято = [];
    for (const g of groups) {
      for (const r of g.razors) {
        const rd = _razorDepth(g, r);
        if (Math.abs((rd - depth) * pxPerM) > bandPx) continue;
        const geom = _geom(g, rd);
        if (!_alive(g, r, geom)) continue;
        занято.push(_razorX(r, geom));
      }
    }
    if (!занято.length) return w.hitRight - w.hitLeft;
    занято.sort((a, b) => a - b);
    let best = 0, prev = w.hitLeft;
    for (const x of занято) {
      best = Math.max(best, (x - S.RADIUS) - prev);
      prev = Math.max(prev, x + S.RADIUS);
    }
    return Math.max(best, w.hitRight - prev);
  }

  // Для отладки и тестов: центры дыр вблизи этой глубины
  function gapsAt(depth, bandPx, pxPerM) {
    const out = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const rd = g.depth + S.ROW_GAP;            // середина косяка
      if (Math.abs((rd - depth) * pxPerM) > bandPx) continue;
      const geom = _geom(g, rd);
      geom.gaps.forEach((x, k) => out.push({ id: gi + ':' + k, x }));
    }
    return out;
  }

  // Для отладки: сколько особей сейчас в мире
  function count() {
    let n = 0;
    for (const g of groups) for (const r of g.razors) if (!r.dead) n++;
    return n;
  }

  return { reset, update, hitTest, shootAt, draw, count, freeGapAt, gapsAt };

})();
