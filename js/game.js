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
  let joy = { active: false, dx: 0, dy: 0 };   // отклонение стика, -1..1
  let speedMod = 0;                             // -1 тормоз, +1 ускорение

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

  function _joyCenter() {
    return { x: CONFIG.CANVAS_W / 2, y: CONFIG.CANVAS_H - CONFIG.JOY.BOTTOM };
  }

  // Геометрия полосы управления
  function _stripRect() {
    const S = CONFIG.STRIP;
    return {
      x: S.MARGIN_X,
      y: CONFIG.CANVAS_H - S.BOTTOM - S.HEIGHT,
      w: CONFIG.CANVAS_W - S.MARGIN_X * 2,
      h: S.HEIGHT,
    };
  }

  function _bindInput() {
    const toCanvas = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (clientX - r.left) * (CONFIG.CANVAS_W / r.width),
        y: (clientY - r.top)  * (CONFIG.CANVAS_H / r.height),
      };
    };

    // Полоса: положение пальца на полосе линейно отображается на всю ширину
    // прохода. Полоса уже экрана, поэтому ход пальца меньше хода дрона.
    const stripTarget = (cx) => {
      const s = _stripRect();
      const t = Math.max(0, Math.min(1, (cx - s.x) / s.w));
      const r = CONFIG.DRONE_RADIUS;
      Drone.setTarget(r + t * (CONFIG.CANVAS_W - r * 2));
    };

    // Относительное
    let anchorX = null, anchorTarget = 0;
    const grab = (cx) => { anchorX = cx; anchorTarget = Drone.target; };
    const drag = (cx) => {
      if (anchorX === null) { grab(cx); return; }
      Drone.setTarget(anchorTarget + (cx - anchorX) * CONFIG.CONTROL_SENSITIVITY);
    };

    // Джойстик: считаем отклонение от центра площадки
    const joyMove = (cx, cy) => {
      const c = _joyCenter();
      const R = CONFIG.JOY.RADIUS;
      let dx = (cx - c.x) / R, dy = (cy - c.y) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }          // не выходим за круг
      const dz = CONFIG.JOY.DEADZONE;
      joy.active = true;
      joy.dx = Math.abs(dx) < dz ? 0 : dx;
      joy.dy = Math.abs(dy) < dz ? 0 : dy;
    };
    const joyRelease = () => { joy.active = false; joy.dx = 0; joy.dy = 0; };

    const onStart = (cx, cy) => {
      const m = CONFIG.CONTROL_MODE;
      if (m === 'joystick')      joyMove(cx, cy);
      else if (m === 'strip')    stripTarget(cx);
      else if (m === 'relative') grab(cx);
      else                       Drone.setTarget(cx);
    };
    const onMove = (cx, cy) => {
      const m = CONFIG.CONTROL_MODE;
      if (m === 'joystick')      joyMove(cx, cy);
      else if (m === 'strip')    stripTarget(cx);
      else if (m === 'relative') drag(cx);
      else                       Drone.setTarget(cx);
    };
    const release = () => { anchorX = null; joyRelease(); };

    canvas.addEventListener('touchstart', e => { e.preventDefault(); const p = toCanvas(e.touches[0].clientX, e.touches[0].clientY); onStart(p.x, p.y); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); const p = toCanvas(e.touches[0].clientX, e.touches[0].clientY); onMove(p.x, p.y); }, { passive: false });
    canvas.addEventListener('touchend',   e => { e.preventDefault(); release(); }, { passive: false });

    let mouseDown = false;
    window.addEventListener('mousedown', e => { mouseDown = true; const p = toCanvas(e.clientX, e.clientY); onStart(p.x, p.y); });
    window.addEventListener('mouseup',   () => { mouseDown = false; release(); });
    window.addEventListener('mousemove', e => {
      const p = toCanvas(e.clientX, e.clientY);
      if (CONFIG.CONTROL_MODE === 'absolute') onMove(p.x, p.y);
      else if (mouseDown) onMove(p.x, p.y);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  Drone.setTarget(Drone.target - 60);
      if (e.key === 'ArrowRight') Drone.setTarget(Drone.target + 60);
      if (e.key === 'r' || e.key === 'R') start();
      // C — циклом переключить схему управления для сравнения
      if (e.key === 'c' || e.key === 'C') {
        const order = ['joystick', 'strip', 'relative', 'absolute'];
        CONFIG.CONTROL_MODE = order[(order.indexOf(CONFIG.CONTROL_MODE) + 1) % order.length];
        release();
      }
    });
  }

  function update(dt) {
    if (!running) return;

    // Джойстик: горизонталь задаёт скорость дрона, вертикаль — темп погружения
    if (CONFIG.CONTROL_MODE === 'joystick') {
      Drone.setVelocity(joy.dx * CONFIG.DRONE_MAX_SPEED);
      speedMod = -joy.dy;                 // палец вверх по стику = ускорение
    } else {
      Drone.setPositionMode();
      speedMod = 0;
    }

    // Падение: скорость растёт с глубиной, но медленно
    const base = Math.min(CONFIG.FALL_SPEED_MAX,
                          CONFIG.FALL_SPEED_START + depth * CONFIG.FALL_ACCEL_PER_M);
    // Торможение и ускорение. Цена торможения встроена: глубина — это счёт,
    // значит медленное погружение само себя наказывает, выдумывать штраф не нужно.
    const mod = speedMod >= 0
      ? 1 + speedMod * CONFIG.JOY.BOOST_FACTOR
      : 1 + speedMod * CONFIG.JOY.BRAKE_FACTOR;
    fallSpeed = base * mod;
    depth += fallSpeed * dt;

    Drone.update(dt);

    // Столкновение со стенами на глубине дрона
    const droneDepth = depth + (CONFIG.DRONE_Y / PX_PER_M);
    const w = Canyon.getWalls(droneDepth);
    const r = CONFIG.DRONE_RADIUS;
    if (Drone.x - r < w.hitLeft || Drone.x + r > w.hitRight) {
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

    // Наросты на стенах — пока просто выступы другого цвета
    ctx.fillStyle = '#2d5a3a';
    for (let py = 0; py <= CONFIG.CANVAS_H; py += STEP) {
      const d = depth + py / PX_PER_M;
      const w = Canyon.getWalls(d);
      if (w.growL > 0.5) ctx.fillRect(w.left, py, w.growL, STEP);
      if (w.growR > 0.5) ctx.fillRect(w.right - w.growR, py, w.growR, STEP);
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

    _drawStrip();
    _drawJoy();
    _drawHud();
  }

  // Отладочные строки ставим НАД полосой управления, иначе она их накрывает
  function _dbgY(i) {
    const stripTop = CONFIG.CANVAS_H - CONFIG.STRIP.BOTTOM - CONFIG.STRIP.HEIGHT;
    const joyTop = CONFIG.CANVAS_H - CONFIG.JOY.BOTTOM - CONFIG.JOY.RADIUS;
    const m = CONFIG.CONTROL_MODE;
    const base = (m === 'strip' ? stripTop : m === 'joystick' ? joyTop : CONFIG.CANVAS_H) - 12;
    return base - (3 - i) * 16;
  }

  function _drawStrip() {
    if (CONFIG.CONTROL_MODE !== 'strip') return;
    const s = _stripRect();

    ctx.fillStyle = 'rgba(8,26,38,0.82)';
    ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(95,216,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(s.x, s.y, s.w, s.h, 12); ctx.stroke();

    // Насечки — показывают, что полосу можно возить пальцем
    ctx.strokeStyle = 'rgba(95,216,255,0.22)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = s.x + s.w * i / 8;
      ctx.beginPath(); ctx.moveTo(x, s.y + 10); ctx.lineTo(x, s.y + s.h - 10); ctx.stroke();
    }

    // Ползунок стоит там, где дрон
    const r = CONFIG.DRONE_RADIUS;
    const t = (Drone.x - r) / (CONFIG.CANVAS_W - r * 2);
    const hx = s.x + t * s.w;
    ctx.fillStyle = '#5fd8ff';
    ctx.shadowColor = 'rgba(95,216,255,0.9)';
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(hx - 22, s.y + 8, 44, s.h - 16, 9); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function _drawJoy() {
    if (CONFIG.CONTROL_MODE !== 'joystick') return;
    const c = _joyCenter(), R = CONFIG.JOY.RADIUS;

    ctx.fillStyle = 'rgba(8,26,38,0.55)';
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(95,216,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();

    // Подсказки осей: вверх — быстрее, вниз — медленнее
    ctx.fillStyle = 'rgba(95,216,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('БЫСТРЕЕ', c.x, c.y - R + 16);
    ctx.fillText('ТОРМОЗ',  c.x, c.y + R - 8);

    // Ручка
    const hx = c.x + joy.dx * R * 0.72;
    const hy = c.y + joy.dy * R * 0.72;
    ctx.fillStyle = joy.active ? '#5fd8ff' : 'rgba(95,216,255,0.5)';
    ctx.shadowColor = 'rgba(95,216,255,0.9)';
    ctx.shadowBlur = joy.active ? 16 : 0;
    ctx.beginPath(); ctx.arc(hx, hy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.fillText(names[w.phase], 10, _dbgY(0));
    ctx.fillStyle = '#7fb0d4';
    ctx.fillText(sides[w.side], 10, _dbgY(1));
    const eff = Math.round(w.hitRight - w.hitLeft);
    ctx.fillText('проход ' + Math.round(w.width) + 'px  чистый ' + eff + 'px', 10, _dbgY(2));
    const modTxt = speedMod > 0.05 ? ' (ускорение)' : (speedMod < -0.05 ? ' (тормоз)' : '');
    ctx.fillText('падение ' + Math.round(fallSpeed) + ' м/с' + modTxt + '   [C] ' + CONFIG.CONTROL_MODE, 10, _dbgY(3));
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
