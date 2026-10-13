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
  const PHASE = { SQUEEZE: 'squeeze', THROAT: 'throat', RELEASE: 'release', REST: 'rest', FORK: 'fork' };

  // Кто давит в текущей волне
  const SIDE = { LEFT: 'left', RIGHT: 'right', BOTH: 'both' };

  let waves = [];        // рассчитанные волны: от какой глубины до какой, какая фаза
  let builtTo = 0;       // до какой глубины уже построено
  let waveIndex = 0;     // номер следующей волны
  let nextForkWave = 0;  // на какой волне ставить следующую развилку

  function reset() {
    waves = [];
    builtTo = 0;
    waveIndex = 0;
    nextForkWave = -1;   // посчитается при первой же постройке
    _buildAhead(3000);   // строим с запасом вперёд
  }

  // Первая развилка привязана к ВРЕМЕНИ падения, а не к номеру волны:
  // волны разной длины, и «через три волны» на старте и на глубине —
  // это совсем разные моменты игры.
  function _forkDue(d) {
    const F = C.FORK;
    if (_timeAt(d) < F.FIRST_AT) return false;
    if (nextForkWave < 0) { nextForkWave = waveIndex; return true; }
    return waveIndex >= nextForkWave;
  }

  function _rollForkType() {
    const T = C.FORK.TYPES;
    const r = Math.random();
    if (r < T.both) return 'both';
    if (r < T.both + T.dead) return 'dead';
    return 'merge';
  }

  function _rnd(v, jitter) {
    return v * (1 + (Math.random() * 2 - 1) * jitter);
  }

  // Параметры волны по её номеру: берём строку из таблицы,
  // после последней держим её же
  // Скорость падения на глубине — та же формула, что в игре. Нужна, чтобы
  // перевести длительности фаз из секунд в метры прямо при постройке волны.
  function _fallSpeedAt(d) {
    return Math.min(CONFIG.FALL_SPEED_MAX,
                    CONFIG.FALL_SPEED_START + CONFIG.FALL_ACCEL_PER_M * d);
  }

  function _waveParams(n, d) {
    const w = C.WAVES[Math.min(n, C.WAVES.length - 1)];
    const v = _fallSpeedAt(d);
    return {
      minWidth: Math.max(C.MIN_WIDTH_FLOOR, _rnd(w.minWidth, C.JITTER)),
      throatLen: _rnd(w.throatTime * v, C.JITTER),
      restLen: _rnd(w.restTime * v, C.JITTER),
      squeezeLen: _rnd(C.SQUEEZE_TIME * v, C.JITTER),
      releaseLen: _rnd(C.RELEASE_TIME * v, C.JITTER),
    };
  }

  // Достраиваем волны, пока не покроем нужную глубину
  function _buildAhead(toDepth) {
    while (builtTo < toDepth) {
      const p = _waveParams(waveIndex, builtTo);

      // Кто давит — решается один раз на волну, внутри не меняется:
      // игрок должен успеть прочитать сценарий
      const r = Math.random();
      const side = r < 0.38 ? SIDE.LEFT : (r < 0.76 ? SIDE.RIGHT : SIDE.BOTH);

      const squeeze = p.squeezeLen;
      const release = p.releaseLen;

      let d = builtTo;
      waves.push({ from: d, to: d + squeeze, phase: PHASE.SQUEEZE, side, minWidth: p.minWidth }); d += squeeze;
      waves.push({ from: d, to: d + p.throatLen, phase: PHASE.THROAT, side, minWidth: p.minWidth }); d += p.throatLen;
      waves.push({ from: d, to: d + release, phase: PHASE.RELEASE, side, minWidth: p.minWidth }); d += release;
      waves.push({ from: d, to: d + p.restLen, phase: PHASE.REST, side, minWidth: p.minWidth }); d += p.restLen;

      // РАЗВИЛКА идёт после передышки — отдельной фазой, а не поверх
      // горловины. Складывать выбор рукава с точностью прохода нельзя:
      // это два разных испытания, и вместе они дают проход, который
      // физически не пройти. То же правило, что и у наростов.
      if (_forkDue(d)) {
        const F = C.FORK;
        const len = _rnd(F.TIME * _fallSpeedAt(d), C.JITTER);
        waves.push({
          from: d, to: d + len, phase: PHASE.FORK, side, minWidth: p.minWidth,
          fork: {
            type: _rollForkType(),
            // Куда закроется тупик и насколько остров смещён от середины.
            dieLeft: Math.random() < 0.5,
            wobble: (Math.random() * 2 - 1) * F.WOBBLE,
          },
        });
        d += len;
        nextForkWave = waveIndex + Math.max(1, Math.round(_rnd(F.EVERY, 0.5)));
      }

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

  // Время падения до глубины d, аналитически. Скорость растёт линейно до
  // потолка: v = v0 + a*d, пока не упрётся. Нужно, чтобы мерить изгибы
  // русла в секундах, а не в метрах.
  let _tCache = null;
  function _timeAt(d) {
    const v0 = CONFIG.FALL_SPEED_START, a = CONFIG.FALL_ACCEL_PER_M,
          vm = CONFIG.FALL_SPEED_MAX;
    if (!_tCache || _tCache.v0 !== v0) {
      const dCap = (vm - v0) / a;
      _tCache = { v0, dCap, tCap: Math.log(vm / v0) / a };
    }
    if (d <= _tCache.dCap) return Math.log((v0 + a * d) / v0) / a;
    return _tCache.tCap + (d - _tCache.dCap) / vm;
  }

  // ---- Слой 1: ось русла. Живёт независимо от ширины ----
  function axisAt(d) {
    const A = C.AXIS, t = _timeAt(d);
    return Math.sin(t * TAU / A.SLOW_TIME) * A.SLOW_AMP
         + Math.sin(t * TAU / A.FAST_TIME + 1.7) * A.FAST_AMP;
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
    if (s.phase === PHASE.FORK) return C.FORK.WIDTH;
    switch (s.phase) {
      case PHASE.SQUEEZE: return C.WIDE_WIDTH + (s.minWidth - C.WIDE_WIDTH) * _smooth(t);
      case PHASE.THROAT:  return s.minWidth;
      case PHASE.RELEASE: return s.minWidth + (C.WIDE_WIDTH - s.minWidth) * _smooth(t);
      default:            return C.WIDE_WIDTH;
    }
  }

  // ---- Скала-остров на развилке ----
  //
  // Две огибающие, и обе сделаны профилями, а не формулой на глаз:
  //
  // half(t) — полуширина острова. Растёт из нуля, держится, уходит в ноль.
  //   Нулевые концы обязательны: иначе камень возникал бы и исчезал
  //   скачком, а у игрока на экране это выглядит как телепорт стены.
  //
  // close(t) — насколько остров ПРИЖАТ к стене. Для тупика он к концу
  //   доезжает до неё вплотную, закрывая свой рукав, и уже там тает.
  //   Именно в таком порядке: сначала закрыть, потом исчезнуть. Если
  //   растворить его раньше, тупик перестанет быть тупиком.
  function _forkProfile(type, t) {
    const sm = _smooth;
    const GROW = 0.18;
    let half;
    if (type === 'merge') {
      half = t < GROW ? sm(t / GROW)
           : t < 0.62 ? 1
           : sm(Math.max(0, (1 - t) / 0.38));
    } else {
      half = t < GROW ? sm(t / GROW)
           : t < 0.85 ? 1
           : sm(Math.max(0, (1 - t) / 0.15));
    }
    // Прижим только у тупика
    const close = type === 'dead' ? sm(Math.max(0, Math.min(1, (t - 0.45) / 0.40))) : 0;
    return { half, close };
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

    // Гасим наросты к границам фазы: там меняется правило их расстановки,
    // и без затухания нарост исчезал скачком
    const tf = (d - s.from) / (s.to - s.from);
    const edge = Math.min(tf, 1 - tf) / C.PHASE_FADE;
    const fade = _smooth(Math.max(0, Math.min(1, edge)));

    // Компенсация наростов
    let growL = 0, growR = 0;
    if (typeof Growth !== 'undefined') {
      growL = Growth.reachAt(d, s.phase, 'left', s.side, fade);
      growR = Growth.reachAt(d, s.phase, 'right', s.side, fade);

      // ВАЖНО: ширину считаем по НЕрасстрелянным наростам. Скала не
      // сдвигается оттого, что игрок сшиб с неё нарост — иначе выстрел
      // дёргал бы весь проход вбок.
      const eaten = growL + growR;
      if (eaten > 0) {
        // минимум, который обязан остаться чистым
        const need = CONFIG.DRONE_RADIUS * 2 + CONFIG.GROWTH.MIN_GAP;
        width = Math.max(width, need + eaten);
      }

      // Расстрелянные участки — наростов там больше нет, проход только шире
      if (typeof Game !== 'undefined' && Game.isCleared) {
        if (Game.isCleared(d, 'left'))  growL = 0;
        if (Game.isCleared(d, 'right')) growR = 0;
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

    // Скала-остров на развилке. Считается ПОСЛЕ того, как стены встали
    // на свои места: остров живёт внутри прохода, а не рядом с ним.
    let pillar = null;
    if (s.phase === PHASE.FORK && s.fork) {
      const F = C.FORK;
      const t = (d - s.from) / (s.to - s.from);
      const pr = _forkProfile(s.fork.type, t);
      const hw = F.PILLAR * 0.5 * pr.half;
      if (hw > 0.5) {
        const mid = (left + right) * 0.5 + (right - left) * s.fork.wobble;
        let x1 = mid - hw, x2 = mid + hw;
        if (pr.close > 0) {
          // Тупик: двигаем остров целиком к своей стене
          const toL = s.fork.dieLeft;
          const tx1 = toL ? left : right - hw * 2;
          const tx2 = tx1 + hw * 2;
          x1 = x1 + (tx1 - x1) * pr.close;
          x2 = x2 + (tx2 - x2) * pr.close;
        }
        pillar = [x1, x2];
      }
    }

    // Наросты — это уже опасная граница, по ней и считаем столкновение
    return {
      left, right,
      width: right - left,
      hitLeft: left + growL,          // фактическая граница с наростом
      hitRight: right - growR,
      growL, growR,
      pillar,                         // [x1, x2] или null
      phase: s.phase, side: s.side,
    };
  }

  return { reset, getWalls, axisAt, timeAt: _timeAt, PHASE, SIDE };

})();
