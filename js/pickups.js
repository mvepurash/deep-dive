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

  const TYPES = {
    energy: { color: '#ffd36e', glow: 'rgba(255,211,110,0.9)', label: 'E' },
    shield: { color: '#7fd4ff', glow: 'rgba(127,212,255,0.9)', label: 'S' },
    weapon: { color: '#ff8a6e', glow: 'rgba(255,138,110,0.9)', label: 'W' },
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

  // depth — текущая глубина дрона, dt — шаг кадра
  function update(depth, aheadDepth, dt) {
    _maybeSpawn(depth, aheadDepth);
    // Предметы всплывают, то есть их глубина уменьшается
    for (const it of items) it.depth -= P.RISE_SPEED * dt;
    // Убираем уплывшие вверх и подобранные
    items = items.filter(it => !it.taken && it.depth > depth - 120);
  }

  // Проверка подбора. Возвращает массив подобранных типов.
  function collect(droneX, droneDepth, pxPerM) {
    const got = [];
    for (const it of items) {
      if (it.taken) continue;
      const dy = (it.depth - droneDepth) * pxPerM;
      if (Math.abs(dy) > P.RADIUS + CONFIG.DRONE_RADIUS) continue;
      const dx = it.x - droneX;
      if (Math.hypot(dx, dy) < P.RADIUS + CONFIG.DRONE_RADIUS) {
        it.taken = true;
        got.push(it.type);
      }
    }
    return got;
  }

  function draw(ctx, depth, pxPerM, droneY) {
    for (const it of items) {
      if (it.taken) continue;
      const py = droneY + (it.depth - depth) * pxPerM;
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
      ctx.fillText(t.label, it.x, py + 1);
      ctx.restore();
    }
  }

  return { reset, update, collect, draw };

})();
