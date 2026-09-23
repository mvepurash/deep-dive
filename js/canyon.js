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
  function getWalls(d) {
    const s = _segmentAt(d);
    const width = _widthAt(d);
    const W = CONFIG.CANVAS_W;
    const full = C.WIDE_WIDTH;
    const margin = (W - full) / 2;   // поля при широком проходе

    let left, right;
    if (s.side === SIDE.LEFT) {
      right = W - margin;            // правая неподвижна
      left = right - width;
    } else if (s.side === SIDE.RIGHT) {
      left = margin;                 // левая неподвижна
      right = left + width;
    } else {
      const c = W / 2;               // обе сходятся к центру
      left = c - width / 2;
      right = c + width / 2;
    }

    // Фактура стен — мелкая неровность, на геймплей не влияет
    const n1 = Math.sin(d * C.NOISE_FREQ) * C.NOISE_AMP;
    const n2 = Math.cos(d * C.NOISE_FREQ * 1.37 + 2.1) * C.NOISE_AMP;
    left += n1;
    right += n2;

    return { left, right, width: right - left, phase: s.phase, side: s.side };
  }

  return { reset, getWalls, PHASE, SIDE };

})();
