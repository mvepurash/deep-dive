// ===== drone.js =====
// ============================================================
// Дрон. Ключевое отличие от прототипа: не телепортируется за пальцем,
// а разгоняется и тормозит. Батискаф в воде должен ощущаться тяжёлым —
// именно это превращает управление из «попал пальцем» в навык.
// ============================================================

const Drone = (() => {

  let x = CONFIG.CANVAS_W / 2;
  let vx = 0;                      // горизонтальная скорость
  let targetX = CONFIG.CANVAS_W / 2;
  let alive = true;

  function reset() {
    x = CONFIG.CANVAS_W / 2;
    vx = 0;
    targetX = x;
    alive = true;
  }

  function setTarget(tx) { targetX = tx; }

  function update(dt) {
    if (!alive) return;

    // Тянемся к цели с ускорением, а не мгновенно
    const dx = targetX - x;
    vx += Math.sign(dx) * Math.min(Math.abs(dx) * 12, CONFIG.DRONE_ACCEL) * dt;

    // Сопротивление воды — гасит скорость, даёт «тяжесть»
    vx -= vx * CONFIG.DRONE_DAMPING * dt;

    // Предел скорости
    vx = Math.max(-CONFIG.DRONE_MAX_SPEED, Math.min(CONFIG.DRONE_MAX_SPEED, vx));

    x += vx * dt;

    // За края экрана не выпускаем
    const r = CONFIG.DRONE_RADIUS;
    if (x < r) { x = r; vx = 0; }
    if (x > CONFIG.CANVAS_W - r) { x = CONFIG.CANVAS_W - r; vx = 0; }
  }

  function kill() { alive = false; }

  return {
    reset, update, setTarget, kill,
    get x() { return x; },
    get vx() { return vx; },
    get alive() { return alive; },
  };

})();
