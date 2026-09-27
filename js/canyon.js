// ===== canyon.js =====
// ============================================================
// Форма ущелья: волны сужения с передышками, асимметричное давление.
//
// Отличие от прототипа: там сдвиг прибавлялся к левой стене и вычитался из
// правой, поэтому коридор вилял змейкой при почти постоянной ширине. Здесь
// ширина — главный параметр, и давит либо одна стена, либо другая, либо обе.
// ============================================================

const Canyon = (() => {

  const C = CONFIG.CANYON;

  // Фазы волны идут по кругу
  const PHASE = { SQUEEZE: 'squeeze', THROAT: 'throat', RELEASE: 'release', REST: 'rest' };

  // Кто давит в текущей волне
  const SIDE = { LEFT: 'left', RIGHT: 'right', BOTH: 'both' };

  let waves = [];        // рассчитанные волны: от какой глубины до какой, какая фаза
  let builtTo = 0;       // до какой глубины уже построено
  let waveIndex = 0;     // номер следующей волны

  function reset() {
    waves = [];
    builtTo = 0;
    waveIndex = 0;
    _buildAhead(3000);   // строим с запасом вперёд
  }

  function _rnd(v, jitter) {
    return v * (1 + (Math.random() * 2 - 1) * jitter);
  }

  // Параметры волны по её номеру: берём строку из таблицы,
  // после последней держим её же
  function _waveParams(n) {
    const w = C.WAVES[Math.min(n, C.WAVES.length - 1)];
    return {
      minWidth: Math.max(C.MIN_WIDTH_FLOOR, _rnd(w.minWidth, C.JITTER)),
      throatLen: _rnd(w.throatLen, C.JITTER),
      restLen: _rnd(w.restLen, C.JITTER),
    };
  }

  // Достраиваем волны, пока не покроем нужную глубину
  function _buildAhead(toDepth) {
    while (builtTo < toDepth) {
      const p = _waveParams(waveIndex);

      // Кто давит — решается один раз на волну, внутри не меняется:
      // игрок должен успеть прочитать сценарий
      const r = Math.random();
      const side = r < 0.38 ? SIDE.LEFT : (r < 0.76 ? SIDE.RIGHT : SIDE.BOTH);

      const squeeze = _rnd(C.SQUEEZE_LEN, C.JITTER);
      const release = _rnd(C.RELEASE_LEN, C.JITTER);

      let d = builtTo;
      waves.push({ from: d, to: d + squeeze, phase: PHASE.SQUEEZE, side, minWidth: p.minWidth }); d += squeeze;
      waves.push({ from: d, to: d + p.throatLen, phase: PHASE.THROAT, side, minWidth: p.minWidth }); d += p.throatLen;
      waves.push({ from: d, to: d + release, phase: PHASE.RELEASE, side, minWidth: p.minWidth }); d += release;
      waves.push({ from: d, to: d + p.restLen, phase: PHASE.REST, side, minWidth: p.minWidth }); d += p.restLen;

      builtTo = d;
      waveIndex++;
    }
  }

  function _segmentAt(d) {
    if (d > builtTo - 1500) _buildAhead(d + 3000);
    for (let i = 0; i < waves.length; i++) {
      const s = waves[i];
      if (d >= s.from && d < s.to) return s;
    }
    return waves[waves.length - 1];
  }

  // Плавное сглаживание, чтобы стены не дёргались на стыках фаз
  function _smooth(t) { return t * t * (3 - 2 * t); }

  const TAU = Math.PI * 2;

  // ---- Слой 1: ось русла. Живёт независимо от ширины ----
  function axisAt(d) {
    const A = C.AXIS;
    return Math.sin(d * TAU / A.SLOW_PERIOD) * A.SLOW_AMP
         + Math.sin(d * TAU / A.FAST_PERIOD + 1.7) * A.FAST_AMP;
  }

  // ---- Слой 3: фактура. Всегда >= 0, стена только отступает ----
  function _rough(d, seed) {
    const R = C.ROUGH;
    const o = (p, a, ph) => (Math.sin(d * TAU / p + ph) + 1) * 0.5 * a;
    return o(R.O1.period, R.O1.amp, seed)
         + o(R.O2.period, R.O2.amp, seed * 2.3 + 1.1)
         + o(R.O3.period, R.O3.amp, seed * 5.1 + 2.7);
  }

  // Ширина прохода на заданной глубине
  function _widthAt(d) {
    const s = _segmentAt(d);
    const t = (d - s.from) / (s.to - s.from);
    switch (s.phase) {
      case PHASE.SQUEEZE: return C.WIDE_WIDTH + (s.minWidth - C.WIDE_WIDTH) * _smooth(t);
      case PHASE.THROAT:  return s.minWidth;
      case PHASE.RELEASE: return s.minWidth + (C.WIDE_WIDTH - s.minWidth) * _smooth(t);
      default:            return C.WIDE_WIDTH;
    }
  }

  // Границы прохода на глубине d.
  // Асимметрия: при давлении слева правая стена стоит на месте и наоборот.
  //
  // Ширина считается с учётом наростов: если они съедают место, ущелье
  // раздвигается, чтобы ЭФФЕКТИВНЫЙ проход остался обещанным. Без этого
  // заявленные 120px превращались бы в 70px и проход становился невозможным.
  function getWalls(d) {
    const s = _segmentAt(d);
    let width = _widthAt(d);
    const W = CONFIG.CANVAS_W;
    const full = C.WIDE_WIDTH;
    const margin = (W - full) / 2;

    // Компенсация наростов
    let growL = 0, growR = 0;
    if (typeof Growth !== 'undefined') {
      growL = Growth.reachAt(d, s.phase, 'left', s.side);
      growR = Growth.reachAt(d, s.phase, 'right', s.side);
      // Расстрелянные участки — наростов там больше нет
      if (typeof Game !== 'undefined' && Game.isCleared) {
        if (Game.isCleared(d, 'left'))  growL = 0;
        if (Game.isCleared(d, 'right')) growR = 0;
      }
      const eaten = growL + growR;
      if (eaten > 0) {
        // минимум, который обязан остаться чистым
        const need = CONFIG.DRONE_RADIUS * 2 + CONFIG.GROWTH.MIN_GAP;
        width = Math.max(width, need + eaten);
      }
    }

    // Проход строится вокруг ГУЛЯЮЩЕЙ оси, а не вокруг краёв экрана.
    // Асимметрия сохраняется: при давлении слева неподвижна правая
    // кромка русла, при давлении справа — левая.
    const axis = W / 2 + axisAt(d);
    let left, right;
    if (s.side === SIDE.LEFT) {
      right = axis + full / 2;
      left = right - width;
    } else if (s.side === SIDE.RIGHT) {
      left = axis - full / 2;
      right = left + width;
    } else {
      left = axis - width / 2;
      right = axis + width / 2;
    }

    // Не выпускаем проход за экран, СОХРАНЯЯ его ширину
    const em = C.EDGE_MARGIN;
    if (right - left > W - em * 2) {          // шире экрана — просто центруем
      left = em; right = W - em;
    } else {
      if (left < em)      { right += em - left;            left = em; }
      if (right > W - em) { left -= right - (W - em);      right = W - em; }
    }

    // Чистая ширина прохода зафиксирована ВЫШЕ этой строки. Фактура только
    // раздвигает стены наружу, поэтому обещанный просвет не уменьшается
    // ни на пиксель. В горловине фактуру почти гасим: там проход должен
    // быть точным, а не рваным.
    const span = C.WIDE_WIDTH - C.MIN_WIDTH_FLOOR;
    const tight = span > 0 ? (width - C.MIN_WIDTH_FLOOR) / span : 1;
    const rs = Math.max(C.ROUGH.MIN_SCALE, Math.min(1, tight));
    left  -= _rough(d, 0.0) * rs;
    right += _rough(d, 3.7) * rs;

    // Наросты — это уже опасная граница, по ней и считаем столкновение
    return {
      left, right,
      width: right - left,
      hitLeft: left + growL,          // фактическая граница с наростом
      hitRight: right - growR,
      growL, growR,
      phase: s.phase, side: s.side,
    };
  }

  return { reset, getWalls, axisAt, PHASE, SIDE };

})();
