// ===== sprites.js =====
// ============================================================
// Загрузка картинок. До этого момента вся игра рисовалась фигурами,
// и это было правильно: форму нельзя обсуждать, пока она не работает.
// Теперь формы утверждены, и им нужны настоящие спрайты.
//
// ГЛАВНОЕ ПРАВИЛО: игра обязана идти, даже если ни одна картинка не
// загрузилась. Сеть у игрока может отвалиться на любом файле, а падать
// из-за украшения — непозволительно. Поэтому каждая отрисовка через
// спрайт имеет откат на прежнюю фигуру, а не на пустоту.
//
// Второе: картинки не ждут. Погружение начинается сразу, спрайты
// подменяют фигуры по мере готовности. Ждать загрузки перед стартом —
// значит подарить игроку чёрный экран ради того, чтобы первый коралл
// был красивым.
//
// Третье, и это не украшательство, а исправление настоящего брака.
// Спрайты лежат в 4× от игрового размера — так они переживут экраны с
// высокой плотностью. Но если отдать браузеру уменьшение 104 px до 20
// одним drawImage, он возьмёт два тексела из пяти и выбросит остальные.
// На шипастом коралле это видно сразу: вместо нароста сыпется крошка из
// отдельных ярких точек. Поэтому уменьшаем половинками до целевого
// размера и кэшируем результат. Готовится один раз, дальше бесплатно.
// ============================================================

const Sprites = (() => {

  const LIST = {
    coral_01:  'assets/creatures/coral_01.png',
    coral_02:  'assets/creatures/coral_02.png',
    coral_03:  'assets/creatures/coral_03.png',
    coral_04:  'assets/creatures/coral_04.png',
    razor_01:  'assets/creatures/razor_01.png',
    nest_base:     'assets/creatures/nest_base.webp',
    nest_tentacle: 'assets/creatures/nest_tentacle.webp',
    eel_head:      'assets/creatures/eel_head.webp',
    eel_body:      'assets/creatures/eel_body.webp',
    // Нора уже тонирована кривой стены при сборке, а не в игре: она одна,
    // и держать ради неё ещё один проход по пикселям в загрузке незачем.
    eel_burrow:    'assets/creatures/eel_burrow.webp',
    wall_rock: 'assets/env/wall_rock.webp',
  };

  const imgs = {};
  const cache = {};
  let loaded = 0, failed = 0;

  // prewarm — список размеров, в которых спрайт реально нужен игре.
  // Без него первая же уменьшенная копия строится внутри кадра, и этот
  // кадр занимает 67 мс вместо 17. Один рывок ровно в тот момент, когда
  // на экране появляется первый коралл, — худшее место для рывка.
  function load(prewarm) {
    for (const name in LIST) {
      const im = new Image();
      im.onload = () => {
        imgs[name] = im; loaded++;
        if (!prewarm) return;
        for (const p of prewarm) {
          if (p.name !== name) continue;
          const w = p.w || p.h * im.width / im.height;
          if (p.tint)      tinted(name, p.tint);
          else if (p.swim) { at(name, w, p.h, false); at(name, w, p.h, true); mid(name, w, p.h); }
          else             at(name, w, p.h, !!p.flip);
        }
      };
      im.onerror = () => { failed++; };   // молча: откат сделает своё дело
      im.src = LIST[name];
    }
  }

  function raw(name) { return imgs[name] || null; }

  // Копия спрайта нужного размера, при необходимости зеркальная.
  // Возвращает null, пока картинка не доехала — это не ошибка, а сигнал
  // рисовать фигуру.
  function at(name, w, h, flip) {
    const im = imgs[name];
    if (!im) return null;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const key = name + '|' + w + 'x' + h + (flip ? '|m' : '');
    if (cache[key]) return cache[key];

    let src = im, sw = im.width, sh = im.height;
    while (sw >= w * 2 && sh >= h * 2) {          // честные половинки
      const nw = Math.max(w, sw >> 1), nh = Math.max(h, sh >> 1);
      const c = document.createElement('canvas');
      c.width = nw; c.height = nh;
      c.getContext('2d').drawImage(src, 0, 0, nw, nh);
      src = c; sw = nw; sh = nh;
    }

    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const g = out.getContext('2d');
    if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(src, 0, 0, w, h);
    cache[key] = out;
    return out;
  }

  // Ровная поза: попиксельное среднее между спрайтом и его зеркалом.
  //
  // Нужна для плавания. Если просто чередовать картинку и зеркало, тварь
  // перекидывает из крена в крен рывком — это мигание, а не движение.
  // Среднее даёт промежуточный кадр, и цикл становится четырёхтактным:
  // крен влево, ровно, крен вправо, ровно.
  //
  // Усреднять надо в ПРЕМУЛЬТИПЛИЦИРОВАННОМ виде. Если брать среднее от
  // обычного цвета, там где один кадр прозрачен, а другой нет, в
  // результат подмешается цвет пустоты и по краям пойдёт грязь.
  function mid(name, w, h) {
    const a = at(name, w, h, false), b = at(name, w, h, true);
    if (!a || !b) return null;
    const key = name + '|' + a.width + 'x' + a.height + '|mid';
    if (cache[key]) return cache[key];

    try {
      const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
      const db = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
      const c = document.createElement('canvas');
      c.width = a.width; c.height = a.height;
      const g = c.getContext('2d');
      const out = g.createImageData(a.width, a.height);
      for (let i = 0; i < da.length; i += 4) {
        const aa = da[i + 3] / 255, ab = db[i + 3] / 255;
        const A = (aa + ab) / 2;
        out.data[i + 3] = Math.round(A * 255);
        for (let k = 0; k < 3; k++) {
          const pm = (da[i + k] * aa + db[i + k] * ab) / 2;
          out.data[i + k] = A > 0 ? Math.min(255, Math.round(pm / A)) : 0;
        }
      }
      g.putImageData(out, 0, 0);
      cache[key] = c;
      return c;
    } catch (e) {
      return a;            // холст закрыт для чтения — плаваем без ровной позы
    }
  }

  // Тонированная копия серой текстуры.
  //
  // Порода приходит серой намеренно: тонировать её кодом дешевле, чем
  // просить вторую картинку на каждую глубину. Средняя яркость исходника
  // 66 из 255 — для стены на глубине это светло, тварь на таком фоне
  // потеряется. Степень 1.25 гасит блики сильнее теней, дальше линейно
  // разводим по холодному синему.
  //
  // Считается один раз при загрузке: 512x1024 — это полмиллиона пикселей,
  // в кадре такое делать нельзя.
  function tinted(name, scale) {
    const im = imgs[name];
    if (!im) return null;
    const key = name + '|tint' + scale;
    if (cache[key]) return cache[key];

    const w = Math.max(1, Math.round(im.width * scale));
    const h = Math.max(1, Math.round(im.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w, h);
    try {
      const d = g.getImageData(0, 0, w, h);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const v = 255 * Math.pow(p[i] / 255, 1.25);
        p[i]     = Math.max(0, Math.min(255, 16 + (v - 72) / 255 * 62));
        p[i + 1] = Math.max(0, Math.min(255, 30 + (v - 72) / 255 * 70));
        p[i + 2] = Math.max(0, Math.min(255, 40 + (v - 72) / 255 * 78));
      }
      g.putImageData(d, 0, 0);
    } catch (e) { /* холст закрыт для чтения — останется серой */ }
    cache[key] = c;
    return c;
  }

  function stats() { return { loaded, failed, total: Object.keys(LIST).length, mips: Object.keys(cache).length }; }

  return { load, raw, at, mid, tinted, stats };

})();
