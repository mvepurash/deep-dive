# Промты для генерации ассетов

> «Глубокое погружение». Обновлено 30.09.2026.
> Здесь лежат **проверенные** промты — те, по которым пришли принятые
> ассеты. Черновики и отклонённые варианты сюда не попадают.

---

## Правила, общие для всех

Они выстраданы, каждое стоило переделки.

**Фон — плоская магента `#FF00FF`, а не прозрачность.** Генераторы
запекают шахматку прозрачности прямо в цвет, и выбить её потом нельзя.
Магента выбивается начисто. Альфу делаю я.

**Запрет на тонкие детали обязателен.** У бритвы каждая следующая версия
была хуже предыдущей (+29 → +18 → +14), потому что генератор добавлял
шипы и усики. На 14 пикселях они тоньше пикселя и просто исчезают,
забирая с собой контраст.

**Материал важнее цвета.** Первая бритва читалась как истребитель не
из-за раскраски, а из-за хрома и полированной брони. Абзац `NO metal...`
появился именно поэтому.

**Немного несимметрично — это требование, а не брак.** Тварь плавает за
счёт зеркала собственного спрайта: крен влево, ровно, крен вправо. У
идеально симметричного спрайта зеркалить нечего, и плавания не будет.
Мера — «зеркальность», доля пикселей, не совпавших с зеркалом:

| | Зеркальность | Вывод |
|---|---|---|
| Бритва-«истребитель» | 0,00 | не задвигалась бы |
| Отклонённая версия | 0,44 | читается как кривая картинка |
| **Принятая** | **0,29** | живая и не кривая |
| Коралл | 1,60 | для коралла это нормально |

**Присылать полный файл, не скриншот.** На скриншоте теряется
разрешение, появляется сжатие, а яркость завышена интерфейсом: по одной
бритве скриншот дал +99, а исходник +46,9.

---

## Стая бритв — принято

Файл: `swarm_razor_v4_raw.png` → `assets/creatures/razor_01.png`

```
A deep-sea creature seen head-on, like a manta ray or an arrow worm
rising through black water. Pale bone-white translucent flesh, wet
membrane, soft matte surface. Curved swept fins, every edge is a curve,
no straight lines anywhere. A long thin limp tail trailing behind.
One small amber bioluminescent lure near the head. Nose pointing UP.

SYMMETRY: almost symmetrical, with a subtle natural offset — one fin
slightly fuller than the other, the tail resting a little to one side.
The difference must be subtle enough that the creature does not look
crooked when seen alone. Flat orthographic front view, facing the
viewer straight on. No perspective, no three-quarter view.

Colours: bone white #EAF2F6, cold grey #8C98A4, one amber lure #FFC15E.
No red, no cyan, no blue glow, no green.

NO metal, NO chrome, NO polished armour, NO mechanical panels, NO
plating, NO cockpit, NO glowing core in the centre of the body, NO
gold trim.

CRITICAL: no long thin spines, no wispy tendrils, no filaments, no
delicate details, no ornamental spikes. Every element must be thick
enough to survive extreme downscaling. Fewer, bolder shapes.

Flat solid magenta #FF00FF background, nothing else in the frame.
--ar 4:5
```

Что сделано с файлом: выбита магента, **срезано 20 % снизу** — хвост там
уходит в прозрачность и на 14 px не виден, а высоту съедает. Спрайт
49 × 56 = 4× от игровых 12 × 14.

---

## Коралл — вариант 1 принят, ещё три в работе

Файлы: `coral_0N_raw.png` → `assets/creatures/coral_0N.png`

Абзац `SHAPE` — главный. Хитбокс нароста это синус: максимум вылета
строго на середине высоты, ноль на краях. Первый коралл лёг в него
случайно, и если следующий вырастет шипами у верхнего края, игрок будет
умирать от того, что видит, но чего нет в расчёте.

Общая часть у всех вариантов одинакова слово в слово — так они остаются
одним видом, а не тремя разными существами. Различается **только второй
абзац**.

```
A deep-sea coral growth clinging to a vertical rock wall, seen from the
side. The wall runs along the LEFT edge of the frame; the coral grows
sideways out of it, reaching to the RIGHT into open black water. Tall
and narrow overall.

<<< СЮДА ВСТАВИТЬ АБЗАЦ ВАРИАНТА >>>

SHAPE, CRITICAL: the growth reaches furthest out at the MIDDLE of its
height, and tapers smoothly to nothing at the top and at the bottom of
the frame. No part of it reaches far out near the top or bottom edge.

Colours: shadow #5B3B31, body #DB6C08, light #DFB79C, highlight #F5E3CC.
Warm amber and bone, wet and glistening. No red, no cyan, no blue, no
green, no purple.

Spines must be THICK at the base and taper only near the tip. No hair,
no filaments, no fuzz, no fine branching, no lace. Every element must
survive being shrunk to a quarter of an inch. Fewer, bolder shapes.

Flat solid magenta #FF00FF background. A narrow strip of grey rock
along the left edge is fine, nothing else in the frame.
--ar 2:5
```

**Вариант 2, коготь:**
```
Only five or six spines, each long, thick and curved downward like a
claw. Heavy and sparse rather than bushy.
```

**Вариант 3, нарост:**
```
A lumpy bulbous mass of fused knobs and blisters, with only short
stubby spines. Bulk rather than reach.
```

**Вариант 4, веер:**
```
A flat fan of thick blades all sweeping upward and outward from a
single base, like a sea whip pressed against the wall.
```

---

## Порода стен — принято

Файл: `wall_rock_raw.png` → `assets/env/wall_rock.webp`

```
Seamless vertically tileable rock texture, deep ocean canyon wall,
wet basalt and sediment layers, horizontal strata, cracks and pitting.
Greyscale only, no colour. Even lighting, no baked shadows, no
highlights from any particular direction. Top edge must match bottom
edge exactly for seamless vertical tiling.
--ar 1:2
```

Серый — намеренно: тонирую кодом, и порода сама холодеет и темнеет с
глубиной без второго файла.

Бесшовности в присланном файле не было — край расходился на 26,7 при
внутреннем разбросе 17,6. Сшил сам заворотом с перекрытием, по обеим
осям; после сшивки шов 15,1 при внутреннем 14,5, то есть неотличим от
любого другого перехода. **Просить бесшовность у генератора не стоит —
он её не делает, а сшивка занимает минуту.**

---

## По чему принимаю

Единое для всех тварей: уменьшить до игрового размера, положить на
`#0A1A26`, превышение средней яркости над фоном — **не меньше +25**.

| | Порог | Коралл 01 | Бритва v4 |
|---|---|---|---|
| Превышение яркости | ≥ +25 | +39,4 | +98,5 |
| Площадь вне хитбокса | ≤ 10 % | 6,9 % | 0 % |
| Зеркальность (только твари в движении) | 0,2–0,3 | — | 0,29 |

Для коралла дополнительно: средний вылет из стены 16,3 ± 3 px, максимум
вылета на середине высоты ± 15 %.

---

## Правила сборки, выстраданные на тварях

Три ошибки, которые я уже совершал. Каждая стоила переделки, и каждая
повторилась бы, если бы не была записана.

**1. Всё, что сидит на стене и выше тридцати пикселей, рисуется полосами.**
Стена виляет. Коралл в 69 px, посаженный одной картинкой, отклеивался от
породы; основание гнезда в 200 px отклеивалось втрое сильнее, и щупальца,
которые честно следовали за стеной, повисали отдельно в воде. Лекарство
одно: нарезать по 4 px и сажать каждую полосу на стену по её глубине.

**2. Форму задаёт картинка, а код её не повторяет.**
У коралла сужение шло и от синуса, и от спрайта — нарост превращался в
иглу. У щупальца то же самое дало плоские клинья. Правило: профиль формы
снимается со спрайта один раз и дальше используется ТОЛЬКО для хитбокса,
а рисуется картинка как есть.

**3. Точки крепления берутся со спрайта замером, а не назначаются.**
Корни щупалец я расставил равномерно — 10, 30, 50, 70, 90% высоты.
Отверстия на картинке оказались на 20, 35, 52, 66 и 80%, да ещё и вдвое
уже щупальца. Владелец увидел это сразу, замеры не ловили: «картинка
разъехалась» — не число. Перед сборкой составной твари надо измерить, где
на спрайте гнёзда, сочленения и крепления, и подогнать код под них.
