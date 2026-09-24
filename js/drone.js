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
    desiredV = 0;
  }

  // Цель ограничиваем краями: при относительном управлении палец можно
  // увести далеко, и без ограничения цель «улетала» бы за экран, после чего
  // дрон переставал отзываться на обратное движение
  function setTarget(tx) {
    const r = CONFIG.DRONE_RADIUS;
    targetX = Math.max(r, Math.min(CONFIG.CANVAS_W - r, tx));
  }

  // Скоростной режим (джойстик): отклонение стика напрямую задаёт желаемую
  // скорость. Позиционная цель при этом не используется.
  let velocityMode = false;
  let desiredV = 0;
  function setVelocity(v) { velocityMode = true; desiredV = v; }
  function setPositionMode() { velocityMode = false; }

  function update(dt) {
    if (!alive) return;

    if (velocityMode) {
      vx += (desiredV - vx) * Math.min(1, CONFIG.DRONE_ACCEL_RATE * dt);
      x += vx * dt;
      const rr = CONFIG.DRONE_RADIUS;
      if (x < rr) { x = rr; vx = 0; }
      if (x > CONFIG.CANVAS_W - rr) { x = CONFIG.CANVAS_W - rr; vx = 0; }
      targetX = x;   // держим цель при дроне, чтобы переключение режимов не дёргало
      return;
    }

    // Желаемая скорость: пропорциональна расстоянию до цели, но с потолком.
    // Раньше от расстояния зависело УСКОРЕНИЕ — из-за этого на малых
    // смещениях дрон почти не реагировал и казался неуправляемым.
    const dx = targetX - x;
    let desired = dx * CONFIG.DRONE_RESPONSE;
    desired = Math.max(-CONFIG.DRONE_MAX_SPEED, Math.min(CONFIG.DRONE_MAX_SPEED, desired));

    // Тянемся к желаемой скорости с ограниченным темпом — это и есть «масса»
    vx += (desired - vx) * Math.min(1, CONFIG.DRONE_ACCEL_RATE * dt);

    x += vx * dt;

    // За края экрана не выпускаем
    const r = CONFIG.DRONE_RADIUS;
    if (x < r) { x = r; vx = 0; }
    if (x > CONFIG.CANVAS_W - r) { x = CONFIG.CANVAS_W - r; vx = 0; }
  }

  function kill() { alive = false; }

  return {
    reset, update, setTarget, setVelocity, setPositionMode, kill,
    get x() { return x; },
    get vx() { return vx; },
    get target() { return targetX; },
    get alive() { return alive; },
  };

})();
