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

  // Экраны, у которых есть картинка. Имена совпадают с файлами в
  // assets/ui_designs/ — язык выбирает папка, а не имя.
  const ART = {
    title: 'assets/ui_designs/title_screen.webp',
    howto: 'assets/ui_designs/howto_screen.webp',
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
  };

  // Куда программа пишет свои значения. Рисовать там в макете нельзя —
  // наложится.
  const SLOT = {
    title: { best: [233, 232, 154, 44] },              // ЛУЧШАЯ ГЛУБИНА
  };

  // Старый титул был с червями из «Тайны астероида», и прямоугольники
  // выше сняты уже с нового. Все до единого переехали: кнопки стали шире
  // и ниже, а поле рекорда уехало с низа экрана наверх, под заголовок.
  // Это и есть причина, по которой их нельзя задавать на глаз один раз
  // и забыть: меняется картинка — меняются все числа.

  const imgs = {};
  let state = 'title';
  let pressed = null;        // id кнопки, на которой сейчас палец

  // Звук выключен или нет. Значок на титуле нарисован ВКЛЮЧЁННЫМ —
  // перечёркивание рисует программа. Второй картинки не нужно, а
  // состояние должно пережить перезаход.
  let muted = false;
  try { muted = localStorage.getItem('dd_muted') === '1'; } catch (e) {}
  function isMuted() { return muted; }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('dd_muted', muted ? '1' : '0'); } catch (e) {}
    return muted;
  }

  function load() {
    for (const k in ART) {
      const im = new Image();
      im.onload = () => { imgs[k] = im; };
      im.src = ART[k];
    }
  }

  function get() { return state; }
  function set(s) { state = s; pressed = null; }

  function _hit(x, y, r) {
    return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  }

  // Палец опустился: запоминаем кнопку, но ничего не делаем.
  // Действие — по отпусканию, как везде: иначе промах пальцем нельзя
  // отменить, сдвинув его в сторону перед отпусканием.
  function down(x, y) {
    pressed = null;
    const list = BTN[state];
    if (!list) return false;
    for (const b of list) if (_hit(x, y, b.rect)) { pressed = b.id; return true; }
    return false;
  }

  // Отпустил на той же кнопке — срабатывает. Увёл палец — нет.
  function up(x, y) {
    const was = pressed; pressed = null;
    if (!was) return null;
    const b = (BTN[state] || []).find(q => q.id === was);
    return (b && _hit(x, y, b.rect)) ? was : null;
  }

  function cancel() { pressed = null; }

  function draw(ctx, data) {
    const im = imgs[state];
    if (!im) {                      // картинка ещё едет — не чёрный экран
      ctx.fillStyle = '#0a1a26';
      ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      ctx.fillStyle = '#5fd8ff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ЗАГРУЗКА…', CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2);
      ctx.textAlign = 'left';
      return;
    }
    ctx.drawImage(im, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // Значения, которые пишет программа. В макете под ними пусто.
    const s = SLOT[state];
    if (s && s.best && data && data.best !== undefined) {
      const [x, y, w, h] = s.best;
      ctx.save();
      ctx.fillStyle = '#eaf6ff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.best > 0 ? Math.floor(data.best) + ' м' : 'ПЕРВОЕ',
                   x + w / 2, y + h / 2);
      ctx.restore();
    }

    // Перечёркнутый динамик. Художник рисует значок включённым, выключенное
    // состояние — наше дело: иначе пришлось бы держать две картинки титула
    // и следить, чтобы они не разъехались.
    if (muted && BTN[state]) {
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

    // Подсветка нажатия: прямоугольник кнопки, светлее на короткое время.
    // Ничего не двигаем и не масштабируем — кнопка нарисована художником,
    // наше дело только показать, что палец попал.
    if (pressed) {
      const b = (BTN[state] || []).find(q => q.id === pressed);
      if (b) {
        const [x, y, w, h] = b.rect;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(95,216,255,0.18)';
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
        ctx.restore();
      }
    }
  }

  return { load, get, set, down, up, cancel, draw, BTN, SLOT, isMuted, toggleMute };

})();
