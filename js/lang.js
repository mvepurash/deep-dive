// ===== lang.js =====
// ============================================================
// ЯЗЫК ИГРЫ.
//
// Это не украшение и не задел на будущее. Яндекс.Игры требуют, чтобы игра
// САМА определяла язык игрока при запуске: русскому показываем русское,
// всем остальным — английское. Пока все строки лежали прямо в коде
// вперемешку с отрисовкой, выполнить это требование было нечем.
//
// ДВА ИСТОЧНИКА ЯЗЫКА, и порядок у них жёсткий:
//   1. Выбор игрока в настройках. Если человек однажды переключил язык
//      руками, никакая автоматика не имеет права его переспорить.
//   2. Определение: язык площадки (SDK Яндекса, когда он появится),
//      иначе язык браузера. Всё, что не русский, украинский, белорусский
//      или казахский, считаем английским — это те рынки, где игроки
//      читают кириллицу.
//
// КАРТИНКИ ТОЖЕ ЯЗЫК. Заставки отрисованы дважды, и выбирает между ними
// папка: assets/ui_designs/ против assets/ui_designs/en/. Если английской
// версии какого-то экрана ещё нет, берётся русская — лучше чужой язык,
// чем пустой экран. Сейчас так с «Как играть»: английский файл художник
// ещё не отдал.
//
// ПРАВИЛО НА БУДУЩЕЕ: ни одной видимой игроку строки больше не писать
// прямо в отрисовке. Пропущенная строка не падает и не краснеет — она
// просто остаётся по-русски у английского игрока, и заметит это не
// разработчик, а площадка на приёмке.
// ============================================================

const Lang = (() => {

  const DICT = {
    ru: {
      // --- единицы и счётчики на игровом поле ---
      m: 'м',
      best: 'рекорд',
      energy: 'ЭНЕРГИЯ',
      shield: 'ЩИТ',
      fire: 'ОГОНЬ',
      faster: 'БЫСТРЕЕ',
      brake: 'ТОРМОЗ',
      // Буквы на капсулах. Это не перевод слова, а ПЕРВАЯ БУКВА того же
      // слова на своём языке: игрок читает её как подсказку, а не как код.
      cap_energy: 'Э',
      cap_shield: 'Щ',
      cap_weapon: 'О',

      // --- причины гибели ---
      crushed: 'РАЗДАВЛЕН',
      eaten: 'СЪЕДЕН',

      // --- служебные экраны ---
      loading: 'ЗАГРУЗКА…',
      paused: 'ПАУЗА',
      paused_hint: 'коснитесь, чтобы продолжить',
      no_record: 'ПЕРВОЕ',
      new_record: 'НОВЫЙ!',

      // --- настройки ---
      settings: 'НАСТРОЙКИ',
      music: 'МУЗЫКА',
      sounds: 'ЗВУКИ',
      vibration: 'ВИБРАЦИЯ',
      language: 'ЯЗЫК',
      on: 'ВКЛ',
      off: 'ВЫКЛ',
      close: 'ЗАКРЫТЬ',
      soon: 'скоро',

      tips: [
        'Опаснее стен — попытка проскочить, когда уже поздно',
        'Торможение тратит энергию. Энергия кончается быстрее, чем кажется',
        'Красный глаз в стене — значит угорь уже прицелился',
        'Щупальца смыкаются медленно, а расходятся быстро',
        'В косяке бритв всегда есть дыра. Ищите её заранее',
      ],
    },

    en: {
      m: 'm',
      best: 'best',
      energy: 'ENERGY',
      shield: 'SHIELD',
      fire: 'FIRE',
      faster: 'FASTER',
      brake: 'BRAKE',
      cap_energy: 'E',
      cap_shield: 'S',
      cap_weapon: 'W',

      crushed: 'CRUSHED',
      eaten: 'EATEN',

      loading: 'LOADING…',
      paused: 'PAUSED',
      paused_hint: 'tap to continue',
      no_record: 'FIRST DIVE',
      new_record: 'NEW!',

      settings: 'SETTINGS',
      music: 'MUSIC',
      sounds: 'SOUNDS',
      vibration: 'VIBRATION',
      language: 'LANGUAGE',
      on: 'ON',
      off: 'OFF',
      close: 'CLOSE',
      soon: 'soon',

      tips: [
        'The walls are not the danger. Squeezing through too late is',
        'Braking burns energy, and energy runs out sooner than it looks',
        'A red eye in the rock means the eel has already aimed',
        'Tentacles close slowly and open fast',
        'Every razor shoal has a hole in it. Find it early',
      ],
    },
  };

  // Как язык площадки называется у нас. Всё, что не перечислено, —
  // английский: это и есть требование «русский или английский».
  const CYRILLIC = ['ru', 'uk', 'be', 'kk'];

  function _auto() {
    // Площадка. SDK ещё не подключён, поэтому проверяем осторожно: до
    // его появления эта ветка просто не срабатывает, а после начнёт
    // работать без правок здесь.
    try {
      const sdk = window.ysdk;
      const code = sdk && sdk.environment && sdk.environment.i18n
                 && sdk.environment.i18n.lang;
      if (code) return CYRILLIC.includes(String(code).slice(0, 2)) ? 'ru' : 'en';
    } catch (e) {}
    try {
      const nav = (navigator.language || navigator.userLanguage || 'en').slice(0, 2);
      return CYRILLIC.includes(nav) ? 'ru' : 'en';
    } catch (e) {}
    return 'ru';
  }

  let cur = _auto();
  let manual = false;
  try {
    const saved = localStorage.getItem('dd_lang');
    if (saved === 'ru' || saved === 'en') { cur = saved; manual = true; }
  } catch (e) {}

  const listeners = [];

  function get() { return cur; }
  function isManual() { return manual; }

  function set(code) {
    if (code !== 'ru' && code !== 'en') return cur;
    if (code === cur) return cur;
    cur = code; manual = true;
    try { localStorage.setItem('dd_lang', cur); } catch (e) {}
    for (const f of listeners) { try { f(cur); } catch (e) {} }
    return cur;
  }

  function toggle() { return set(cur === 'ru' ? 'en' : 'ru'); }
  function onChange(f) { listeners.push(f); }

  // Название языка пишем НА НЁМ САМОМ. «Английский» по-английски игрок,
  // не знающий русского, не прочтёт, и наоборот.
  function name(code) { return (code || cur) === 'ru' ? 'РУССКИЙ' : 'ENGLISH'; }

  // Строка по ключу. Если ключа нет в выбранном языке — берём русский,
  // а не пустоту: пропуск должен быть видно, но игра из-за него не ломается.
  function t(key) {
    const d = DICT[cur] || DICT.ru;
    const v = d[key];
    if (v !== undefined) return v;
    const r = DICT.ru[key];
    return r !== undefined ? r : key;
  }

  function tips() { return t('tips'); }

  // Путь к заставке на текущем языке. Английских файлов пока меньше, чем
  // русских, поэтому отсутствующие перечислены явно: лучше честный список
  // в одном месте, чем молчаливая подстановка где-то в загрузке.
  const NO_EN = ['howto_screen.webp'];

  function uiPath(file) {
    if (cur === 'en' && !NO_EN.includes(file)) return 'assets/ui_designs/en/' + file;
    return 'assets/ui_designs/' + file;
  }

  return { get, set, toggle, onChange, t, tips, name, uiPath, isManual };

})();
