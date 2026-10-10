# Промты для Suno — музыка «Глубокого погружения»

Музыки в игре нет вовсе: ни одного аудиофайла. В окне настроек строки
«МУЗЫКА» и «ЗВУКИ» поэтому помечены словом «скоро».

Генерировать это нужно **на платном тарифе Suno** — по той же причине, по
которой перегенерируем музыку «Тайны Астероида»: бесплатный тариф
запрещает коммерческое использование, а Яндекс.Игры с рекламой — это
коммерческое использование. Раз уж месяц всё равно оплачивается, делаем в
него обе игры сразу.

---

## Главное правило этого файла

**Ничего общего с «Тайной Астероида».** Это прямое указание владельца про
мир игры, и музыка — такая же часть мира, как твари и стены. Поэтому
палитры разведены нарочно, и разведены не словами, а приёмами:

| | Тайна Астероида | Глубокое погружение |
|---|---|---|
| среда | вакуум, сухо | вода, всё отзывается |
| движение | стоишь, бегаешь между платформами | падаешь, и всё быстрее |
| источник страха | то, что вылезет из норы | то, что внизу, и давление |
| звук | тонкий металл, пыль, электроника | гидрофон, низкие струны, сонар |
| динамика | ровная, 8 дБ | нарастающая от пояса к поясу |

Если новый трек можно без вопросов поставить в другую игру — он написан
неправильно.

---

## 1. Что нужно

| роль | длина петли | когда звучит |
|---|---|---|
| титул | 1:00–1:30 | заставка, «Как играть», настройки |
| погружение, пояс 1 «Шельф» | 2:00 | начало спуска |
| погружение, пояс 2 «Террасы» | 2:00 | примерно с 2000 м |
| погружение, пояс 3 «Труба» | 2:00 | примерно с 4000 м |
| гибель | 0:30–0:45 | экран «связь потеряна» |

Пояса — это то самое «уровень один, уровень два», про что был разговор;
разбор в `tz_levels_ru.md`. Даже если поясов пока нет в коде, три трека
стоит сгенерировать сразу: они из одного оплаченного месяца и из одного
настроения, а поодиночке потом не сойдутся.

Если нужно сократить — порядок важности: **погружение 1 → гибель →
титул → пояса 2 и 3**.

Во всех промтах — **Custom / Instrumental**, галочка «Instrumental»
обязательна.

---

## Как раскладывать текст по полям

Поправка к первой редакции: отрицания (`no drums`, `no fade out`) в поле
**Styles** писать не надо. Это поле — перечень того, что в треке ЕСТЬ,
и Suno подхватывает названные слова: «no drums» вполне может обернуться
барабанами. Для отрицаний есть отдельное поле.

- **Styles** — только то, что должно быть: жанр, темп, тональность,
  инструменты, фактура, настроение.
- **Exclude Styles** — всё, чего быть не должно, включая `intro`, `outro`,
  `fade out`, `crescendo`, `build-up`, `drop`. Петля получается запретом
  на нарастания надёжнее, чем просьбой «сделай петлю».
- **Instrumental** — галочка обязательна во всех треках.
- **Ползунки**, если есть: *Style Influence* повыше, *Weirdness* пониже.
- **Title** — сразу наше имя файла, иначе в библиотеке не разобраться.

**Общий Exclude Styles для всех треков этой игры** (171 символ):

```
vocals, drums, percussion, melody lead, guitar, piano, orchestral swell, crescendo, build-up, drop, intro, outro, fade out, major key, uplifting, resolution, trailer braam
```

К каждому треку дан полный вариант строки стиля и **короткий, до 200
символов**, на случай если поле ограничено по длине.

---

## 2. Титул

**Title:** `dive_title` · **длина:** 1:00–1:30

```
underwater ambient, 56 BPM, slow deep pressure swell, warm low drone, single sonar ping with long wet reverb tail, hydrophone noise floor, faint whale-like moan far below, vast, patient, ominous, continuous loop
```

короткий (184):

```
underwater ambient, 56 BPM, slow deep pressure swell, warm low drone, lone sonar ping with long wet reverb, hydrophone noise, faint whale moan far below, vast, ominous, continuous loop
```

Титул — это обещание. Он должен звучать так, будто внизу что-то есть, но
не пугать: пугать будет игра.

---

## 3. Погружение, пояс 1 — «Шельф»

**Title:** `dive_belt_1` · **длина:** 2:00–3:00

```
underwater ambient with forward motion, 72 BPM, steady low descent pulse, sub-bass drone, C minor, hydrophone water noise, slow rising filter sweep, muffled hull pressure groans, sparse sonar blips, tense, open, continuous loop
```

короткий (183):

```
underwater ambient, forward motion, 72 BPM, steady low descent pulse, sub-bass drone, C minor, hydrophone water noise, rising filter sweep, muffled hull groans, tense, continuous loop
```

`forward motion` — ключевые слова всего файла. В «Тайне Астероида» музыка
стоит на месте, потому что астронавт стоит на месте. Здесь игрок
**падает**, и трек, который никуда не едет, будет спорить с картинкой.

---

## 4. Погружение, пояс 2 — «Террасы»

**Title:** `dive_belt_2` · **длина:** 2:00–3:00

```
underwater ambient, 84 BPM, insistent low pulse, dark sub-bass, detuned string drone, creaking pressure hull under load, irregular metallic knocks from outside, water rushing past, claustrophobic, pressure building, continuous loop
```

короткий (186):

```
underwater ambient, 84 BPM, insistent low pulse, dark sub-bass, detuned string drone, creaking pressure hull, metallic knocks outside, water rushing past, claustrophobic, continuous loop
```

---

## 5. Погружение, пояс 3 — «Труба»

**Title:** `dive_belt_3` · **длина:** 2:00–3:00

```
underwater ambient, 96 BPM, relentless driving low pulse, distorted sub-bass, dissonant low strings, deep groans of something alive and very large, hull stress cracks, suffocating, relentless, continuous loop
```

короткий (185):

```
underwater ambient, 96 BPM, relentless driving low pulse, distorted sub-bass, dissonant low strings, groans of something alive and huge, hull stress cracks, suffocating, continuous loop
```

`something alive and very large` — на этой глубине живут угри и гнёзда,
и самое неприятное в них то, что они больше тебя.

---

## 6. Гибель

**Title:** `dive_gameover` · **длина:** 1:00, подрежу до 30–45 секунд

```
underwater ambient, very slow, heavy muffled sub-bass impact with long wet reverb tail, sinking low cello note, bubbles rising away, everything going quiet and far, pressure silence, low-passed, resigned, sparse
```

короткий (173):

```
underwater ambient, very slow, muffled sub-bass impact with long wet reverb tail, sinking low cello note, bubbles rising away, pressure silence, low-passed, resigned, sparse
```

Не траурно. Игрок услышит это десятки раз за вечер: тихо и глухо
переносится, траур — нет.

---

## 7. Как отбирать

Те же три проверки, что и для «Тайны Астероида» (см. её файл с промтами):
слушать **с середины**, а не с начала; включить и заняться делом на пять
минут; проверить, не затихает ли конец.

И одна проверка, которая нужна только здесь: **включите трек и посмотрите
на игру**. Если музыка стоит, а картинка едет — трек не тот, каким бы
красивым он ни был.

Присылайте WAV. Петлю подрежу по долям такта и проверю шов замером,
громкость между треками выровняю, сожму в то же 64 кбит/с моно, что и в
другой игре, и подключу к переключателю «МУЗЫКА», который уже стоит в
настройках и ждёт только файлов.
