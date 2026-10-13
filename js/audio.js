// ===== audio.js =====
// ============================================================
// МУЗЫКА.
//
// До этого файла в игре не звучало ничего, и переключатель «МУЗЫКА» в
// настройках был помечен словом «скоро». Теперь он настоящий.
//
// Четыре вещи, без которых музыка в браузерной игре не работает:
//
// 1. БЕЗ КАСАНИЯ ЗВУКА НЕ БУДЕТ. Браузер не даёт играть, пока игрок не
//    тронул страницу. Поэтому при первом же касании мы «прогреваем»
//    элементы: запускаем их с нулевой громкостью и сразу ставим на
//    паузу. После этого их можно включать программно когда угодно.
//
// 2. ПЕРЕКЛЮЧЕНИЕ ТОЛЬКО ЧЕРЕЗ ЗАТУХАНИЕ. Резкая смена трека на гибели
//    звучит как обрыв провода. Полсекунды туда, полсекунды сюда.
//
// 3. ГРОМКОСТЬ ТРЕКОВ РАЗНАЯ, И ЭТО НЕ ПРИХОТЬ. Готовые файлы уже
//    выровнены, но гибель осталась на 4.8 дБ тише фона: поднять её при
//    сжатии не вышло — mp3 начинал клиппировать. Добираем здесь,
//    приглушая фон, а не усиливая гибель: громкость элемента больше
//    единицы браузер не принимает.
//
// 4. ИГРА ОБЯЗАНА ИДТИ БЕЗ ЗВУКА. Файл не доехал, формат не поддержан,
//    автоплей запрещён — любая из этих бед не должна стоить игроку
//    погружения. Поэтому здесь нет ни одного места, где ошибка звука
//    могла бы выбросить исключение наружу.
// ============================================================

const Music = (() => {

  const SRC = {
    main: 'assets/music/dive_main.mp3',       // петля 70 с, вырезана из 3:00
    over: 'assets/music/dive_gameover.mp3',   // петля 42 с, вырезана из 1:14
  };

  // Поправка громкости на трек. Фон приглушён, чтобы гибель на его фоне
  // не казалась провалом: разница между файлами 4.8 дБ, нам нужно около 2.
  const VOL = { main: 0.76, over: 1.0 };

  const FADE_MS = 600;

  const els = {};
  let current = null;        // какой трек играет сейчас
  let primed = false;
  let ready = false;

  function _make(name) {
    const a = new Audio(SRC[name]);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    els[name] = a;
  }

  function load() {
    if (ready) return;
    ready = true;
    for (const k in SRC) { try { _make(k); } catch (e) { /* без музыки, но живы */ } }
  }

  // Разрешено ли звучать. Значок на титуле — общий выключатель, строка
  // «МУЗЫКА» в настройках — только про музыку. Выключить можно любым,
  // включить — надо обоими.
  function _allowed() {
    try { return !Screens.isMuted() && Screens.opt('music'); } catch (e) { return false; }
  }

  // Прогрев на первом касании. Без него первый же play() молча
  // отклоняется, и музыки не будет до конца сессии.
  function prime() {
    if (primed) return;
    primed = true;
    load();
    for (const k in els) {
      const a = els[k];
      try {
        const p = a.play();
        // ГОНКА, которую видно только замером. play() отдаёт обещание, и
        // оно исполняется ПОЗЖЕ — уже после того, как игра успела нажать
        // «начать» и включить фон. Прогрев тогда глушил только что
        // запущенный трек, и погружение шло в тишине при включённой
        // музыке. Поэтому глушим лишь то, что к этому моменту не стало
        // текущим.
        const stop = () => {
          if (current === k) return;
          try { a.pause(); a.currentTime = 0; } catch (e) {}
        };
        if (p && p.then) p.then(stop).catch(() => {}); else stop();
      } catch (e) { /* не критично */ }
    }
  }

  function _fade(a, to, ms, done) {
    if (!a) return;
    const from = a.volume, t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      try { a.volume = Math.max(0, Math.min(1, from + (to - from) * t)); } catch (e) {}
      if (t < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  // Включить трек. Повторный вызов с тем же именем ничего не делает —
  // иначе фон перезапускался бы с начала на каждом кадре.
  function play(name) {
    load();
    if (!SRC[name]) return;
    if (current === name && _allowed()) return;
    const next = els[name];
    const prev = current && current !== name ? els[current] : null;
    current = name;
    if (prev) _fade(prev, 0, FADE_MS, () => { try { prev.pause(); } catch (e) {} });
    if (!_allowed()) { try { next.pause(); } catch (e) {} return; }
    try {
      next.volume = 0;
      const p = next.play();
      if (p && p.catch) p.catch(() => {});   // автоплей ещё не разрешён — молчим
      _fade(next, VOL[name], FADE_MS);
    } catch (e) { /* играем без музыки */ }
  }

  function stop() {
    const a = current && els[current];
    current = null;
    if (a) _fade(a, 0, FADE_MS, () => { try { a.pause(); } catch (e) {} });
  }

  // Пауза в игре музыку приглушает, но не сбрасывает: вернувшись, игрок
  // продолжает с того же места трека, а не с начала.
  function pause() { const a = current && els[current]; if (a) { try { a.pause(); } catch (e) {} } }
  function resume() {
    const a = current && els[current];
    if (!a || !_allowed()) return;
    try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }

  // Игрок щёлкнул переключателем. Если выключил — гасим, если включил —
  // поднимаем тот трек, который сейчас положен по состоянию экрана.
  function refresh() {
    const a = current && els[current];
    if (!a) return;
    if (_allowed()) {
      try { const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      _fade(a, VOL[current], FADE_MS);
    } else {
      _fade(a, 0, FADE_MS, () => { try { a.pause(); } catch (e) {} });
    }
  }

  function playing() { return current; }

  // Что происходит на самом деле. playing() отдаёт лишь то, какой трек
  // ВЫБРАН; звучит он или приглушён до нуля — отдельный вопрос, и без
  // этого проверить переключатели нечем.
  function status() {
    const a = current && els[current];
    return {
      track: current,
      volume: a ? Math.round(a.volume * 100) / 100 : 0,
      paused: a ? a.paused : true,
      allowed: _allowed(),
    };
  }

  return { load, prime, play, stop, pause, resume, refresh, playing, status };

})();
