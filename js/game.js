// ===== game.js =====
// ============================================================
// Главный цикл. Графика намеренно примитивная: сначала проверяем,
// интересно ли играется на прямоугольниках, потом подключаем арт.
// ============================================================

const Game = (() => {

  let canvas, ctx;
  let depth = 0;
  let fallSpeed = CONFIG.FALL_SPEED_START;
  let running = false;
  let lastTime = 0;
  let bestDepth = 0;

  // Сколько метров укладывается в высоту экрана — задаёт масштаб обзора
  const M_PER_SCREEN = 340;
  const PX_PER_M = CONFIG.CANVAS_H / M_PER_SCREEN;

  function init() {
    canvas = document.getElementById('game-canvas');
    canvas.width = CONFIG.CANVAS_W;
    canvas.height = CONFIG.CANVAS_H;
    ctx = canvas.getContext('2d');

    try { bestDepth = parseInt(localStorage.getItem('dd_best') || '0', 10); } catch (e) {}

    _bindInput();
    start();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function start() {
    depth = 0;
    fallSpeed = CONFIG.FALL_SPEED_START;
    Canyon.reset();
    Drone.reset();
    running = true;
  }

  function _bindInput() {
    const toCanvasX = (clientX) => {
      const r = canvas.getBoundingClientRect();
      return (clientX - r.left) * (CONFIG.CANVAS_W / r.width);
    };
    const move = (clientX) => Drone.setTarget(toCanvasX(clientX));

    canvas.addEventListener('touchstart', e => { e.preventDefault(); move(e.touches[0].clientX); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); move(e.touches[0].clientX); }, { passive: false });

    // Мышь слушаем на ВСЁМ окне, а не только над холстом: иначе управление
    // пропадает, стоит курсору выйти за край, и это читается как «не реагирует»
    window.addEventListener('mousemove', e => move(e.clientX));

    // Клавиатура — для удобства отладки на компьютере
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  Drone.setTarget(Drone.x - 60);
      if (e.key === 'ArrowRight') Drone.setTarget(Drone.x + 60);
      if (e.key === 'r' || e.key === 'R') start();
    });
  }

  function update(dt) {
    if (!running) return;

    // Падение: скорость растёт с глубиной, но медленно
    fallSpeed = Math.min(CONFIG.FALL_SPEED_MAX,
                         CONFIG.FALL_SPEED_START + depth * CONFIG.FALL_ACCEL_PER_M);
    depth += fallSpeed * dt;

    Drone.update(dt);

    // Столкновение со стенами на глубине дрона
    const droneDepth = depth + (CONFIG.DRONE_Y / PX_PER_M);
    const w = Canyon.getWalls(droneDepth);
    const r = CONFIG.DRONE_RADIUS;
    if (Drone.x - r < w.left || Drone.x + r > w.right) {
      _crash();
    }
  }

  function _crash() {
    running = false;
    Drone.kill();
    if (depth > bestDepth) {
      bestDepth = depth;
      try { localStorage.setItem('dd_best', String(Math.floor(bestDepth))); } catch (e) {}
    }
    setTimeout(start, 900);
  }

  function draw() {
    // Фон — тем темнее, чем глубже
    const dark = Math.min(0.75, depth / 4000);
    ctx.fillStyle = `rgb(${Math.round(12 * (1 - dark))},${Math.round(30 * (1 - dark))},${Math.round(48 * (1 - dark))})`;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // Стены: идём сверху вниз, каждую полосу считаем по своей глубине
    const STEP = 4;
    ctx.fillStyle = '#0a1a24';
    ctx.strokeStyle = '#1d5f7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let py = 0; py <= CONFIG.CANVAS_H; py += STEP) {
      const d = depth + py / PX_PER_M;
      const w = Canyon.getWalls(d);
      ctx.fillRect(0, py, w.left, STEP);
      ctx.fillRect(w.right, py, CONFIG.CANVAS_W - w.right, STEP);
    }

    // Контур прохода
    ctx.beginPath();
    for (let py = 0; py <= CONFIG.CANVAS_H; py += STEP) {
      const w = Canyon.getWalls(depth + py / PX_PER_M);
      if (py === 0) ctx.moveTo(w.left, py); else ctx.lineTo(w.left, py);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let py = 0; py <= CONFIG.CANVAS_H; py += STEP) {
      const w = Canyon.getWalls(depth + py / PX_PER_M);
      if (py === 0) ctx.moveTo(w.right, py); else ctx.lineTo(w.right, py);
    }
    ctx.stroke();

    // Дрон — пока просто круг
    ctx.fillStyle = Drone.alive ? '#5fd8ff' : '#ff4444';
    ctx.beginPath();
    ctx.arc(Drone.x, CONFIG.DRONE_Y, CONFIG.DRONE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // Лёгкий след показывает инерцию
    ctx.strokeStyle = 'rgba(95,216,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Drone.x, CONFIG.DRONE_Y);
    ctx.lineTo(Drone.x - Drone.vx * 0.06, CONFIG.DRONE_Y + 14);
    ctx.stroke();

    _drawHud();
  }

  function _drawHud() {
    ctx.fillStyle = '#9fe8ff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.floor(depth) + ' м', CONFIG.CANVAS_W / 2, 40);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#6fa8bd';
    ctx.fillText('рекорд ' + Math.floor(bestDepth) + ' м', CONFIG.CANVAS_W / 2, 62);

    if (!CONFIG.DEBUG) return;

    // Отладка: видно фазу волны, кто давит и насколько узко
    const droneDepth = depth + (CONFIG.DRONE_Y / PX_PER_M);
    const w = Canyon.getWalls(droneDepth);
    const names = { squeeze: 'СЖАТИЕ', throat: 'ГОРЛОВИНА', release: 'РАЗЖАТИЕ', rest: 'ПЕРЕДЫШКА' };
    const sides = { left: 'давит ЛЕВАЯ', right: 'давит ПРАВАЯ', both: 'давят ОБЕ' };
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = w.phase === 'throat' ? '#ff9a6e' : '#7fd4a8';
    ctx.fillText(names[w.phase], 10, CONFIG.CANVAS_H - 58);
    ctx.fillStyle = '#7fb0d4';
    ctx.fillText(sides[w.side], 10, CONFIG.CANVAS_H - 42);
    ctx.fillText('проход ' + Math.round(w.width) + 'px', 10, CONFIG.CANVAS_H - 26);
    ctx.fillText('падение ' + Math.round(fallSpeed) + ' м/с', 10, CONFIG.CANVAS_H - 10);
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('load', init);

  return { start };

})();
