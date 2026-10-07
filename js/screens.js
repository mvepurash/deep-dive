// ===== screens.js =====
// ============================================================
// ЭКРАНЫ И КНОПКИ.
//
// До этого файла игра стартовала сразу в падение и после гибели
// перезапускалась через 0.9 с. Ни титула, ни «Как играть», ни паузы в
// коде не было вовсе.
//
// ГЛАВНОЕ РЕШЕНИЕ: кнопки заданы прямоугольниками в координатах холста
// 480x854, и эти прямоугольники СНЯТЫ С КАРТИНОК, а не назначены на глаз.
// Я читал их по координатной сетке, наложенной на сам экран, и проверял
// обратным наложением — рамка должна лечь на кнопку.
//
// Это прямое следствие урока гнезда: точки, которые должны совпасть с
// рисунком, меряются по рисунку. Дважды за эту неделю я назначал их по
// наитию и дважды промахивался.
//
// ВАЖНО: правя заставку, надо пересчитать и её прямоугольники. Иначе
// игрок будет жать на кнопку, а срабатывать будет соседняя — молча.
// ============================================================

const Screens = (() => {

  // Экраны, у которых есть картинка. Имя файла одно на оба языка — папку
  // выбирает Lang.uiPath, и больше нигде в коде язык заставок не всплывает.
  //
  // НАСТРОЕК здесь нет нарочно. Английская картинка настроек отдана, а
  // русская — нет: она пришла с запечённой шахматкой вместо прозрачности,
  // и её вернули художнику. Показывать русскому игроку английское окно
  // нельзя, держать экран, который работает только в одном языке, — тоже.
  // Поэтому настройки пока рисует код, ровно как паузу.
  const ART_FILE = {
    title:    'title_screen.webp',
    howto:    'howto_screen.webp',
    gameover: 'game_over_screen.webp',
  };

  // Экраны-ОКНА поверх живой игры. Фон у них прозрачный, и рисуются они
  // не во весь холст, а в свой прямоугольник. Числа посчитаны один раз:
  // окно приведено к общей ширине 392 и поставлено по центру, а здесь
  // записано, куда при этом попадает ВЕСЬ файл вместе с прозрачными
  // полями. Поэтому в коде нет ни обрезки, ни поиска силуэта.
  const MODAL = {
    gameover: [34.9, 58.7, 409.4, 727.0],
  };

  // Прямоугольники кнопок: [x, y, ширина, высота] на холсте 480x854.
  // Снято с картинок по сетке и проверено наложением.
  const BTN = {
    title: [
      { id: 'start',    rect: [100, 575, 285, 57] },   // СТАРТ
      { id: 'howto',    rect: [100, 657, 285, 56] },   // КАК ИГРАТЬ
      { id: 'settings', rect: [100, 737, 285, 56] },   // НАСТРОЙКИ
      { id: 'sound',    rect: [417,  19,  43, 41] },   // значок звука
    ],
    howto: [
      { id: 'back',     rect: [100, 733, 280,  80] },  // ПОНЯТНО
    ],
    gameover: [
      { id: 'ad',       rect: [108, 511, 290, 43] },   // ПРОДОЛЖИТЬ ЗА РЕКЛАМУ
      { id: 'again',    rect: [108, 572, 290, 42] },   // ПОГРУЗИТЬСЯ СНОВА
      { id: 'menu',     rect: [108, 627, 290, 43] },   // В ГЛАВНОЕ МЕНЮ
      { id: 'menu',     rect: [366,  95,  40, 42] },   // крестик — то же, что «в меню»
    ],
  };

  // Куда программа пишет свои значения. Рисовать там в макете нельзя —
  // наложится.
  const SLOT = {
    title: { best: [228, 241, 149, 32] },              // ЛУЧШАЯ ГЛУБИНА
    gameover: {
      cause: [172, 218, 205, 38],                      // причина гибели
      depth: [108, 404, 132, 32],                      // ДОСТИГНУТАЯ ГЛУБИНА
      caps:  [247, 404, 152, 32],                      // СОБРАНО КАПСУЛ
      best:  [228, 455, 172, 33],                      // ЛИЧНЫЙ РЕКОРД
      tip:   [108, 685, 290, 42],                      // строка совета
    },
  };

  // Советы живут в словаре языка: это такой же текст для игрока, как
  // всё остальное. Выбирается один на показ окна, а не на кадр —
  // мигающий совет читать невозможно.
  function tips() { return Lang.tips(); }

  // Старый титул был с червями из «Тайны астероида», и прямоугольники
  // выше сняты уже с нового. Все до единого переехали: кнопки стали шире
  // и ниже, а поле рекорда уехало с низа экрана наверх, под заголовок.
  // Это и есть причина, по которой их нельзя задавать на глаз один раз
  // и забыть: меняется картинка — меняются все числа.

  // ---------- ОКНО НАСТРОЕК ----------
  //
  // Рисуется кодом, пока нет русской картинки. Отсюда и устройство:
  // прямоугольники кнопок не СНИМАЮТСЯ с макета, а СЧИТАЮТСЯ из тех же
  // чисел, по которым окно рисуется. Поэтому промахнуться мимо кнопки
  // здесь нельзя в принципе — в отличие от отрисованных экранов, где
  // расхождение ловится только замером.
  //
  // Когда художник отдаст окно на magenta, этот блок заменится на ART +
  // снятые прямоугольники, а поведение останется тем же.
  const S_PANEL = [60, 170, 360, 500];        // само окно
  const S_ROW_Y = [250, 318, 386, 454];       // четыре строки
  const S_ROW_H = 46;
  const S_VAL_X = 245, S_VAL_W = 150;         // правая колонка — переключатель
  const S_ROWS = ['music', 'sounds', 'vibro', 'lang'];

  const imgs = {};
  let state = 'title';
  let pressed = null;        // id кнопки, на которой сейчас палец

  BTN.settings = [
    { id: 'set_music', rect: [S_VAL_X, S_ROW_Y[0], S_VAL_W, S_ROW_H] },
    { id: 'set_sound', rect: [S_VAL_X, S_ROW_Y[1], S_VAL_W, S_ROW_H] },
    { id: 'set_vibro', rect: [S_VAL_X, S_ROW_Y[2], S_VAL_W, S_ROW_H] },
    { id: 'set_lang',  rect: [S_VAL_X, S_ROW_Y[3], S_VAL_W, S_ROW_H] },
    { id: 'back',      rect: [150, 580, 180, 54] },                      // ЗАКРЫТЬ
    { id: 'back',      rect: [S_PANEL[0] + S_PANEL[2] - 56, S_PANEL[1] + 12, 44, 44] },
  ];

  // Настройки игрока. Звук уже жил здесь ради значка на титуле, остальные
  // переехали к нему: одно место, один формат, один перезаход.
  //
  // ЧЕСТНО О ТОМ, ЧТО ЗА НИМИ СТОИТ. Вибрация работает по-настоящему —
  // браузер умеет её сам. Музыка и звуки СОХРАНЯЮТСЯ, но звучать им пока
  // нечему: в игре нет ни одного аудиофайла. Поэтому в окне они помечены
  // словом «скоро», и это не заглушка-обманка, а предупреждение игроку.
  const OPT = { music: true, sounds: true, vibro: true };
  try {
    for (const k in OPT) {
      const v = localStorage.getItem('dd_' + k);
      if (v !== null) OPT[k] = v === '1';
    }
    // Старый ключ выключенного звука: был до окна настроек.
    if (localStorage.getItem('dd_muted') === '1') OPT.sounds = false;
  } catch (e) {}

  function _save(k) {
    try { localStorage.setItem('dd_' + k, OPT[k] ? '1' : '0'); } catch (e) {}
    if (k === 'sounds') {
      try { localStorage.setItem('dd_muted', OPT.sounds ? '0' : '1'); } catch (e) {}
    }
  }

  function opt(k) { return !!OPT[k]; }
  function setOpt(k, v) { if (k in OPT) { OPT[k] = !!v; _save(k); } return OPT[k]; }
  function isMuted() { return !OPT.sounds; }
  function toggleMute() { setOpt('sounds', !OPT.sounds); return !OPT.sounds; }

  // Короткий толчок. Единственная настройка, за которой сегодня стоит
  // настоящее железо, поэтому и вызов тут, рядом с галочкой, а не
  // размазан по игре.
  function buzz(ms) {
    if (!OPT.vibro) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  function load() {
    for (const k in ART_FILE) {
      const im = new Image();
      const want = Lang.get();
      im.onload = () => { if (Lang.get() === want) imgs[k] = im; };
      im.src = Lang.uiPath(ART_FILE[k]);
    }
  }

  // Сменили язык — заставки надо перезабрать. Старые НЕ стираем до
  // прихода новых: иначе на время загрузки игрок увидит «ЗАГРУЗКА…»
  // вместо экрана, на котором только что стоял.
  Lang.onChange(() => load());

  function get() { return state; }
  function set(s) { state = s; pressed = null; }

  function _hit(x, y, r) {
    return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  }

  // Палец опустился: запоминаем кнопку, но ничего не делаем.
  // Действие — по отпусканию, как везде: иначе промах пальцем нельзя
  // отменить, сдвинув его в сторону перед отпусканием.
  // Запоминаем САМУ кнопку, а не её id. На конце погружения в меню ведут
  // две: большая внизу и крестик вверху, и у них одинаковый id. По id
  // поиск находил бы первую, и нажатие на крестик молча пропадало бы.
  function down(x, y) {
    pressed = null;
    const list = BTN[state];
    if (!list) return false;
    for (const b of list) if (_hit(x, y, b.rect)) { pressed = b; return true; }
    return false;
  }

  // Отпустил на той же кнопке — срабатывает. Увёл палец — нет.
  function up(x, y) {
    const was = pressed; pressed = null;
    if (!was) return null;
    return _hit(x, y, was.rect) ? was.id : null;
  }

  function cancel() { pressed = null; }


  // Текст по центру прямоугольника — ПО ЧЕРНИЛАМ, а не по строке.
  //
  // Прежде стояло textBaseline = 'middle', и владелец сразу увидел, что
  // число задрано к верхнему краю поля и сдвинуто вбок. Он прав, и
  // причина не в опечатке в координатах: 'middle' центрует по кегельной
  // площадке шрифта, а она выше видимых цифр — у неё сверху запас под
  // выносные элементы, которых в «3271 м» нет вовсе. По горизонтали то же
  // самое: 'center' делит ШИРИНУ СТРОКИ, включая боковые отступы кегля.
  //
  // Поэтому центруем по настоящим границам отрисованных пикселей, которые
  // браузер сообщает в actualBoundingBox*. Старый путь оставлен на случай,
  // если метрик нет, — но тогда и перекос вернётся, так что он только
  // чтобы не упасть.
  function _inkCenter(ctx, txt, rect) {
    const [x, y, w, h] = rect;
    // Не влезает — УМЕНЬШАЕМ кегль, а не выпускаем текст за поле.
    // Поймано на живом кадре: «6483 м  НОВЫЙ!» вылезло за правый край
    // поля рекорда и ушло за край окна. Поле просили шире остальных
    // именно под эту строку, но запаса всё равно не хватило, и чинить
    // это надо кодом — рисовать поле ещё шире некуда.
    // ВЫРАВНИВАНИЕ СТАВИМ ДО ЗАМЕРА. measureText отдаёт границы
    // ОТНОСИТЕЛЬНО текущего textAlign, и если он остался 'center' от
    // прошлого вызова, то L и R выходят равными, поправка обнуляется, и
    // строка начинается ровно от середины поля вместо того, чтобы быть
    // по ней отцентрованной. Так «7416 м НОВЫЙ!» и уехало за край окна,
    // хотя по ширине помещалось: 168.6 px в поле 172.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let m = ctx.measureText(txt);
    const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    if (iw > w - 8) {
      const mm = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
      if (mm) {
        const size = parseFloat(mm[1]);
        ctx.font = ctx.font.replace(/(\d+(?:\.\d+)?)px/,
                                    Math.max(8, size * (w - 8) / iw).toFixed(1) + 'px');
        m = ctx.measureText(txt);
      }
    }
    const L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight;
    const A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
    if (L === undefined || A === undefined) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, x + w / 2, y + h / 2);
      return;
    }
    ctx.fillText(txt, x + w / 2 - (R - L) / 2, y + h / 2 + (A - D) / 2);
  }


  // Совет — в две строки, если не влез в одну. Перенос по словам, обе
  // строки по центру.
  function _wrapCenter(ctx, txt, rect, lh) {
    const [x, y, w, h] = rect;
    const words = txt.split(' ');
    const lines = []; let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(t).width > w - 10 && cur) { lines.push(cur); cur = wd; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    const top = y + h / 2 - (lines.length - 1) * lh / 2;
    for (let i = 0; i < lines.length; i++)
      _inkCenter(ctx, lines[i], [x, top + i * lh - lh / 2, w, lh]);
  }

  function draw(ctx, data) {
    const im = imgs[state];

    // ВРЕМЕННАЯ ПАУЗА. Отрисованного экрана паузы ещё нет — он ждёт
    // художника. Но кнопка на игровом поле уже есть, и кнопка, которая
    // ничего не делает, хуже отсутствующей. Поэтому пауза РАБОТАЕТ:
    // кадр замирает, поверх ложится затемнение и слово. Придёт картинка
    // — этот кусок уйдёт целиком, а поведение останется тем же.
    if (state === 'paused' && !im) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,10,18,0.66)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.fillStyle = '#9fe8ff';
      ctx.font = 'bold 34px sans-serif';
      _inkCenter(ctx, Lang.t('paused'), [0, CONFIG.CANVAS_H / 2 - 60, CONFIG.CANVAS_W, 50]);
      ctx.fillStyle = 'rgba(190,225,255,0.75)';
      ctx.font = '14px sans-serif';
      _inkCenter(ctx, Lang.t('paused_hint'),
                 [0, CONFIG.CANVAS_H / 2 + 4, CONFIG.CANVAS_W, 24]);
      ctx.restore();
      return;
    }

    if (state === 'settings') { _drawSettings(ctx); _drawPressed(ctx); return; }

    if (!im) {                      // картинка ещё едет — не чёрный экран
      ctx.fillStyle = '#0a1a26';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.fillStyle = '#5fd8ff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Lang.t('loading'), CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2);
      ctx.textAlign = 'left';
      return;
    }
    // Окно кладётся в свой прямоугольник поверх замороженной игры, а
    // полноэкранная заставка — во весь холст. Затемнение под окном рисуем
    // мы: художник отдаёт только само окно, и правильно делает — иначе
    // игрок на паузе смотрел бы на нарисованную сцену вместо своей.
    const md = MODAL[state];
    if (md) {
      ctx.save();
      ctx.fillStyle = 'rgba(2,10,18,0.62)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.restore();
      ctx.drawImage(im, md[0], md[1], md[2], md[3]);
    } else {
      ctx.drawImage(im, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    }

    // Значения, которые пишет программа. В макете под ними пусто.
    const s = SLOT[state];
    if (s && data) {
      ctx.save();
      ctx.fillStyle = '#eaf6ff';
      if (s.best !== undefined && data.best !== undefined) {
        ctx.font = 'bold 20px monospace';
        // Новый рекорд пишем золотом и с пометкой: ради этого поле
        // рекорда и просили шире остальных.
        if (data.fresh) ctx.fillStyle = '#ffd36e';
        _inkCenter(ctx,
          data.best > 0
            ? Math.floor(data.best) + ' ' + Lang.t('m') +
              (data.fresh ? '  ' + Lang.t('new_record') : '')
            : Lang.t('no_record'),
          s.best);
        ctx.fillStyle = '#eaf6ff';
      }
      if (s.depth && data.depth !== undefined) {
        ctx.font = 'bold 20px monospace';
        _inkCenter(ctx, Math.floor(data.depth) + ' ' + Lang.t('m'), s.depth);
      }
      if (s.caps && data.caps !== undefined) {
        ctx.font = 'bold 20px monospace';
        _inkCenter(ctx, String(data.caps), s.caps);
      }
      if (s.cause && data.cause) {
        ctx.fillStyle = '#ff9a8a';
        ctx.font = 'bold 15px sans-serif';
        _inkCenter(ctx, data.cause, s.cause);
      }
      if (s.tip && data.tip) {
        ctx.fillStyle = 'rgba(190,225,255,0.85)';
        ctx.font = '12px sans-serif';
        _wrapCenter(ctx, data.tip, s.tip, 14);
      }
      ctx.restore();
    }

    // Перечёркнутый динамик. Художник рисует значок включённым, выключенное
    // состояние — наше дело: иначе пришлось бы держать две картинки титула
    // и следить, чтобы они не разъехались.
    if (isMuted() && BTN[state]) {
      const b = BTN[state].find(q => q.id === 'sound');
      if (b) {
        const [x, y, w, h] = b.rect;
        // Черта у нас НАРИСОВАННАЯ, а не проведённая кодом. Своя линия
        // работала, но рядом с отрисованным значком читалась как заплата:
        // ровный отрезок без блика и без скруглений. Черту вынул из пары
        // icon_sound_on / icon_sound_off, которая уже лежала в проекте, —
        // взял ровно те пиксели, что покраснели.
        const sl = Sprites.at('sound_slash', w, h, false);
        if (sl) ctx.drawImage(sl, x, y, w, h);
        else {                                  // картинка ещё не доехала
          ctx.save();
          ctx.strokeStyle = 'rgba(255,90,70,0.95)';
          ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + w - 7, y + h - 7);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    _drawPressed(ctx);
  }

  // Подсветка нажатия: прямоугольник кнопки, светлее на короткое время.
  // Ничего не двигаем и не масштабируем — кнопка нарисована художником,
  // наше дело только показать, что палец попал.
  function _drawPressed(ctx) {
    if (!pressed) return;
    const [x, y, w, h] = pressed.rect;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(95,216,255,0.18)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.restore();
  }

  // Рамка в стиле остальных экранов: тонкая бирюзовая линия по тёмному.
  // Это не попытка заменить художника, а заглушка, которая не выглядит
  // отладочной: игрок не должен понимать, что одного экрана ещё нет.
  function _frame(ctx, x, y, w, h, r, fill, line) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.stroke();
  }

  function _drawSettings(ctx) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    ctx.save();
    // Фон перерисовываем ЦЕЛИКОМ каждый кадр. Полупрозрачное затемнение
    // поверх несмытого кадра копилось бы само на себе и за секунду
    // превратило титул в чёрный прямоугольник.
    if (imgs.title) ctx.drawImage(imgs.title, 0, 0, W, H);
    else { ctx.fillStyle = '#0a1a26'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(2,10,18,0.72)';
    ctx.fillRect(0, 0, W, H);

    const [px, py, pw, ph] = S_PANEL;
    _frame(ctx, px, py, pw, ph, 18, 'rgba(8,28,42,0.96)', 'rgba(95,216,255,0.55)');

    ctx.fillStyle = '#9fe8ff';
    ctx.font = 'bold 28px sans-serif';
    _inkCenter(ctx, Lang.t('settings'), [px, py + 18, pw, 44]);

    // Крестик
    {
      const b = BTN.settings[5].rect;
      _frame(ctx, b[0], b[1], b[2], b[3], 10, 'rgba(10,36,52,0.9)', 'rgba(95,216,255,0.5)');
      ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b[0] + 14, b[1] + 14); ctx.lineTo(b[0] + b[2] - 14, b[1] + b[3] - 14);
      ctx.moveTo(b[0] + b[2] - 14, b[1] + 14); ctx.lineTo(b[0] + 14, b[1] + b[3] - 14);
      ctx.stroke();
    }

    for (let i = 0; i < S_ROWS.length; i++) {
      const key = S_ROWS[i], y = S_ROW_Y[i];
      // Звука в игре ещё нет вовсе, и молчать об этом нельзя: переключатель,
      // который ничего не меняет, игрок считает поломкой, а не задумкой.
      const dead = (key === 'music' || key === 'sounds');

      ctx.fillStyle = dead ? 'rgba(190,225,255,0.5)' : '#dff2ff';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(Lang.t(key === 'vibro' ? 'vibration' : key === 'lang' ? 'language' : key),
                   px + 24, y + S_ROW_H / 2);
      if (dead) {
        ctx.fillStyle = 'rgba(255,180,120,0.75)';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText(Lang.t('soon'), px + 24, y + S_ROW_H / 2 + 16);
      }

      const on = key === 'lang' ? true : OPT[key];
      const val = key === 'lang' ? Lang.name() : Lang.t(on ? 'on' : 'off');
      _frame(ctx, S_VAL_X, y, S_VAL_W, S_ROW_H, 12,
             on ? 'rgba(16,58,80,0.95)' : 'rgba(14,26,36,0.95)',
             on ? 'rgba(95,216,255,0.8)' : 'rgba(95,216,255,0.3)');
      ctx.fillStyle = on ? '#9fe8ff' : 'rgba(190,225,255,0.55)';
      ctx.font = 'bold 15px sans-serif';
      _inkCenter(ctx, val, [S_VAL_X, y, S_VAL_W, S_ROW_H]);
    }

    // ЗАКРЫТЬ
    {
      const b = BTN.settings[4].rect;
      _frame(ctx, b[0], b[1], b[2], b[3], 12, 'rgba(16,58,80,0.95)', 'rgba(95,216,255,0.8)');
      ctx.fillStyle = '#9fe8ff';
      ctx.font = 'bold 18px sans-serif';
      _inkCenter(ctx, Lang.t('close'), b);
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  return { load, get, set, down, up, cancel, draw, BTN, SLOT, MODAL, tips,
           isMuted, toggleMute, opt, setOpt, buzz };

})();
