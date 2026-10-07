// ===== pickups.js =====
// ============================================================
// Предметы, всплывающие снизу навстречу дрону.
//
// Зачем: сейчас игрок двигается вбок только чтобы уклоняться. Предметы дают
// вторую, противоположную причину — тянуться К чему-то. Из этой пары
// «убегать / дотянуться» и рождается интересный выбор.
//
// Типы заложены сразу, чтобы потом не переделывать: энергия работает,
// щит и оружие подключаются добавлением строки в TYPES.
// ============================================================

const Pickups = (() => {

  const P = CONFIG.PICKUP;

  // Буква на капсуле — не код, а подсказка: первая буква того же слова на
  // языке игрока. Поэтому она берётся из словаря в момент отрисовки, а не
  // записана здесь намертво.
  const TYPES = {
    energy: { color: '#ffd36e', glow: 'rgba(255,211,110,0.9)', key: 'cap_energy' },
    shield: { color: '#7fd4ff', glow: 'rgba(127,212,255,0.9)', key: 'cap_shield' },
    weapon: { color: '#ff8a6e', glow: 'rgba(255,138,110,0.9)', key: 'cap_weapon' },
  };

  // Случайный тип по весам
  function _rollType() {
    const w = CONFIG.PICKUP.WEIGHTS;
    let r = Math.random(), acc = 0;
    for (const [k, v] of Object.entries(w)) { acc += v; if (r < acc) return k; }
    return 'energy';
  }

  let items = [];
  let nextSpawnDepth = 0;

  function reset() {
    items = [];
    nextSpawnDepth = 260;   // первую бочку не сразу, дать освоиться
  }

  // Порождаем по мере погружения, с оглядкой на фазу волны
  function _maybeSpawn(depth, aheadDepth) {
    while (nextSpawnDepth < aheadDepth) {
      const d = nextSpawnDepth;
      const w = Canyon.getWalls(d);
      const chance = P.BY_PHASE[w.phase] ?? 0;

      if (chance > 0 && Math.random() < chance) {
        // Ставим внутри чистого прохода, не вплотную к наростам
        const pad = P.RADIUS + 10;
        const lo = w.hitLeft + pad, hi = w.hitRight - pad;
        if (hi > lo) {
          items.push({
            depth: d,
            x: lo + Math.random() * (hi - lo),
            type: _rollType(),
            taken: false,
          });
        }
      }
      nextSpawnDepth += P.SPAWN_EVERY * (0.6 + Math.random() * 0.8);
    }
  }

  // depth — глубина верхней кромки экрана, dt — шаг кадра
  function update(depth, aheadDepth, dt) {
    _maybeSpawn(depth, aheadDepth);
    const pad = P.RADIUS + 6;
    for (const it of items) {
      it.prevDepth = it.depth;
      // Предметы всплывают, то есть их глубина уменьшается
      it.depth -= P.RISE_SPEED * dt;

      // Выше по ущелью стены стоят иначе, а x у капсулы свой. Без этого
      // она всплывала прямо сквозь породу. Поджимаем её внутрь прохода —
      // капсулу как бы вытесняет сужающимися стенками.
      const w = Canyon.getWalls(it.depth);
      const lo = w.hitLeft + pad, hi = w.hitRight - pad;
      if (hi <= lo) { it.taken = true; continue; }   // проход уже капсулы
      if (it.x < lo) it.x = lo;
      if (it.x > hi) it.x = hi;
    }
    // Убираем уплывшие вверх и подобранные
    items = items.filter(it => !it.taken && it.depth > depth - 120);
  }

  // Проверка подбора. Возвращает массив подобранных типов.
  function collect(droneX, droneDepth, pxPerM) {
    const got = [];
    for (const it of items) {
      if (it.taken) continue;
      const reach = P.RADIUS + CONFIG.DRONE_RADIUS;
      const dy = (it.depth - droneDepth) * pxPerM;
      // Скорость сближения на бусте доходит до 1400 px/с: на просадке
      // кадров капсула перескочила бы дрона за один шаг. Поэтому ловим
      // и сам факт пересечения глубины дрона за кадр.
      const prev = it.prevDepth === undefined ? it.depth : it.prevDepth;
      const crossed = (prev - droneDepth) * (it.depth - droneDepth) <= 0;
      if (!crossed && Math.abs(dy) > reach) continue;
      const dx = it.x - droneX;
      if (Math.abs(dx) < reach && (crossed || Math.hypot(dx, dy) < reach)) {
        it.taken = true;
        got.push(it.type);
      }
    }
    return got;
  }

  function draw(ctx, depth, pxPerM, droneY) {
    for (const it of items) {
      if (it.taken) continue;
      // depth — глубина верхней кромки экрана, поэтому droneY тут лишний:
      // с ним капсулы рисовались на 260 px ниже, чем находились, и
      // исчезали в момент подбора, не дойдя до дрона на экране
      const py = (it.depth - depth) * pxPerM;
      if (py < -40 || py > CONFIG.CANVAS_H + 40) continue;
      const t = TYPES[it.type];

      ctx.save();
      ctx.shadowColor = t.glow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(it.x, py, P.RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a1c00';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Lang.t(t.key), it.x, py + 1);
      ctx.restore();
    }
  }

  // list() — только для проверок: автопилоту в тесте надо знать, куда
  // лететь за капсулой. Игра этим не пользуется.
  function list() { return items; }

  return { reset, update, collect, draw, list };

})();
