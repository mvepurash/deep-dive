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

## 2. Титул

```
underwater ambient, 56 BPM, slow deep swell like distant ocean pressure, warm
low drone, single sonar ping every eight seconds with long wet reverb tail,
hydrophone noise floor, faint whale-like low moan far below, patient and vast,
inviting but ominous, no melody lead, continuous, seamless loop, no intro, no
outro, no fade
```

```
Exclude: vocals, drums, percussion, bright synths, orchestral swells, cinematic
trailer hits, uplifting, resolution, guitar
```

Титул — это обещание. Он должен звучать так, будто внизу что-то есть, но
не пугать: пугать будет игра.

---

## 3. Погружение, пояс 1 — «Шельф»

```
underwater ambient with forward motion, 72 BPM, steady low pulse like a descent
engine, sub-bass drone in C minor, hydrophone water noise, slow rising filter
sweep that never resolves, muffled metallic hull pressure groans, sparse
sonar blips, tense but open, no melody lead, no drum kit, continuous, seamless
loop, no intro, no outro, no fade
```

```
Exclude: vocals, drums, percussion fills, bright pads, major key, uplifting,
melody, trailer braam, resolution
```

«Forward motion» — ключевое слово всего файла. В «Тайне Астероида» музыка
стоит на месте, потому что астронавт стоит на месте. Здесь игрок **падает**,
и трек, который никуда не едет, будет спорить с картинкой.

---

## 4. Погружение, пояс 2 — «Террасы»

Тот же мир, но теснее и быстрее.

```
underwater ambient, 84 BPM, insistent low pulse, darker sub-bass, detuned
string drone, creaking pressure hull under load, irregular metallic knocks from
outside, water rushing past, claustrophobic, pressure building, no melody lead,
continuous, seamless loop, no intro, no outro, no fade
```

```
Exclude: vocals, drums, percussion, bright synths, major key, uplifting, melody,
resolution
```

---

## 5. Погружение, пояс 3 — «Труба»

```
underwater ambient, 96 BPM, relentless driving low pulse, distorted sub-bass,
dissonant low strings, deep groans of something alive and very large, hull
stress cracks, no air, suffocating, relentless, no melody lead, continuous,
seamless loop, no intro, no outro, no fade
```

```
Exclude: vocals, drums fills, bright synths, major key, hopeful, melody,
resolution, trailer braam
```

«Something alive and very large» — на этой глубине живут угри и гнёзда,
и самое неприятное в них то, что они больше тебя.

---

## 6. Гибель

```
underwater ambient, very slow, heavy muffled sub-bass impact with long wet
reverb tail, sinking low cello note, bubbles rising away, everything going
quiet and far, pressure silence, resigned, no high frequencies, sparse,
continuous, no intro, no outro, no fade out
```

```
Exclude: vocals, drums, percussion, bright synths, cymbals, strings crescendo,
hopeful, major key, trailer braam
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
