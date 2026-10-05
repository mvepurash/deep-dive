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

---

## Пауза — правка уже отрисованного, оба языка

Экран пришёл почти готовым: фон прозрачный, окно на месте, поле под
число пустое, «m» латинская. Брак один, но видимый без линейки —
**золотая кнопка выше и шире трёх синих** (78 против 63 по высоте).

Поэтому промт ниже — НЕ перерисовка. Генератору сказано сохранить рамку,
свечение, цвета и композицию и тронуть только геометрию кнопок. Просить
перерисовать целиком тут нельзя: хорошее потеряется вместе с плохим,
а рамка удалась.

Про числа честно: генератор не умеет попадать в пиксель — он не смог
даже заменить одну букву с третьей попытки. Размеры в промте стоят как
ориентир, а не как приёмка. Технически точные значения и не нужны:
прямоугольники кнопок программа снимает с готовой картинки (см.
`js/screens.js`). Единый размер нужен для опрятности — игрок переходит
с экрана на экран и видит одну и ту же кнопку.

Магенты здесь нет намеренно. У тварей фон магентовый, потому что
генераторы запекают шахматку в цвет. Но у окна светящаяся рамка с
мягким ореолом, а мягкое свечение из магенты вычитается грязно.
Прозрачный PNG художник уже отдал — значит, умеет.

```
EDIT the existing image, do NOT redraw it.

Keep everything as it is: the ornate blue metal frame, the glow, the
title plate, the colours, the composition, the texture. Change only the
geometry of the buttons.

THE ONE FIX — ALL FOUR BUTTONS MUST BE THE SAME SIZE AND SHAPE.
Right now the gold RESUME button is taller and wider than the three blue
ones. Every button must be the identical rectangle: same width, same
height, same corner cuts, same border thickness. The gold button differs
from the blue ones ONLY in colour. Never in size.

SIZES. Canvas 480 x 854, portrait 9:16. Draw larger if you like, keep
the proportion exactly.
- window: 392 px wide, centred, 44 px of empty space on each side
- every button: 280 x 75
- gap between neighbouring buttons: 24 px, equal everywhere
- close cross: 44 x 44, perfectly square

BACKGROUND: fully transparent PNG. No scene, no canyon, no creatures
behind the window. The game is drawn underneath by the program. Only the
window itself, nothing else.

LEAVE EMPTY: the field to the right of DEPTH. The program writes the
number into it. Do not draw any digits there.

TEXT, exact:
  title:   PAUSE
  row:     DEPTH   [empty field]   m
  buttons, top to bottom:
           RESUME   (gold)
           SETTINGS
           HOW TO PLAY
           EXIT TO MENU

DO NOT: make the main button larger than the others; add a background
scene; put digits in the depth field; add icons or ornaments to the
buttons; change the frame or the title plate.
```

Для русской версии — тот же промт, заменить только блок текста:

```
TEXT, exact:
  title:   ПАУЗА
  row:     ГЛУБИНА   [empty field]   м
  buttons, top to bottom:
           ПРОДОЛЖИТЬ   (gold)
           НАСТРОЙКИ
           КАК ИГРАТЬ
           ВЫЙТИ В МЕНЮ
```

**Геометрия обеих версий обязана совпасть пиксель в пиксель.** Проще
всего взять готовый английский файл подложкой и заменить только надписи.
Если геометрия разъедется, прямоугольники кнопок придётся задавать
дважды, и любая будущая правка окна тоже будет делаться дважды.

Сдавать полным файлом, не скриншотом.

---

## Настройки — правка уже отрисованного, оба языка

Экран пришёл в некоторых местах лучше моего ТЗ: громкость ползунком
полезнее немого «вкл/выкл», одна кнопка честнее двух. ТЗ переписал под
него, а не наоборот.

Ошибка одна, зато ровно та, о которой ТЗ предупреждало отдельным
разделом: **нарисовано всё, что обязана рисовать программа** — кружки
ползунков, залитая часть дорожки, «70%», «80%» и «ВКЛ» у вибрации.
Положение кружка и есть настройка; нарисованный кружок будет
просвечивать из-под настоящего, и переключатель станет выглядеть
сломанным.

Вторая правка не про рисунок, а про обещание: строка **УПРАВЛЕНИЕ** с
выбором «сенсор / геймпад». Геймпада игра не поддерживает. Обещать в
настройках то, чего нет, нельзя — меняем её на **ЯЗЫК**.

```
EDIT the existing image, do NOT redraw it.

Keep everything as it is: the ornate blue metal frame, the glow, the
title plate, the colours, the row plates, the composition. Change only
what is listed below.

FIX 1 — EMPTY THE CONTROLS. The program draws the live values on top of
this picture, so the picture must show empty controls:
- MUSIC row: keep the groove, but EMPTY. No filled part, no round knob,
  no "70%". Just a dark groove with a thin cyan outline, full width.
- SOUNDS row: the same. No fill, no knob, no "80%".
- VIBRATION row: keep the capsule, but EMPTY. No white circle inside it,
  no "ON" text.
Leave clear empty space to the right of each groove where the percentage
will be written.

FIX 2 — REPLACE THE "CONTROL" ROW. Remove the row with the touch and
gamepad icons entirely. In its place put a row in the same style:
the word LANGUAGE on the left and an empty field on the right. Nothing
inside the field.

FIX 3 — SIZES. Canvas 480 x 854, portrait 9:16. Draw larger if you like,
keep the proportion exactly.
- window: 392 px wide, centred, 44 px of empty space on each side
  (the same width as the pause window)
- the SAVE button: 280 x 75, the same as every other button in the game
- close cross: 44 x 44, perfectly square

BACKGROUND: fully transparent PNG. No scene, no canyon, no creatures
behind the window. The game is drawn underneath by the program.

TEXT, exact:
  title:   SETTINGS
  rows:    MUSIC      [empty groove]
           SOUNDS     [empty groove]
           VIBRATION  [empty capsule]
           LANGUAGE   [empty field]
  button:  SAVE   (gold)

DO NOT: draw any knob, dot or handle inside a groove or capsule; draw
any percentage or ON/OFF text; put anything in the language field; add a
background scene; change the frame or the title plate.
```

Для русской версии — тот же промт, заменить только блок текста:

```
TEXT, exact:
  title:   НАСТРОЙКИ
  rows:    МУЗЫКА     [empty groove]
           ЗВУКИ      [empty groove]
           ВИБРАЦИЯ   [empty capsule]
           ЯЗЫК       [empty field]
  button:  СОХРАНИТЬ   (gold)
```

**Геометрия обеих версий обязана совпасть пиксель в пиксель**, и ширина
окна обязана совпасть с паузой и концом погружения. Проще всего взять
готовый файл подложкой и заменить только надписи.

Сдавать полным файлом, не скриншотом.

---

## Конец погружения — сборка с файла паузы

Экран новый, но рисовать его с нуля не надо. Рамка у паузы и настроек
наконец совпала — это образец семьи, и третье окно обязано быть из неё
же. Поэтому промт начинается с «возьми файл паузы и замени начинку»:
так рамка и кнопки сойдутся сами, без линейки.

Пустых зон здесь пять — больше, чем на любом другом экране. Всё, что
меняется от захода к заходу, рисует программа, и всё нарисованное
«для примера» останется под настоящим и будет видно.

Единиц «м» и «m» в этом промте нет намеренно. Нарисованная «м» на
английском экране уже один раз осталась кириллической, и выбивать её
пришлось вручную. Чего нет на картинке, то не придётся выбивать: число
и единицу программа пишет вместе.

```
Use the PAUSE screen file as the base. Keep its window frame, its glow,
its title plate, its button shape and its button size exactly. Replace
only the contents.

This is the game over window. Top to bottom:

1. TITLE: CONNECTION LOST

2. CAUSE STRIP: a framed strip with a small warning triangle on the LEFT
   and EMPTY space to the right of it. The program writes the cause of
   death into that empty space. Do not write any text there yourself.
   Make the empty space wide enough to fit OUT OF POWER in full - that
   is the longest line that will go there.

3. ILLUSTRATION, small: the silhouette of a small submersible drone
   sinking away into darkness, its lights fading out. Seen from behind
   and slightly above. No wreckage, no broken hull, no creature, no
   explosion - just a shape being swallowed by the dark. Keep it small:
   a frozen frame of the real game shows behind this window, and a large
   drawn scene would fight with it.

4. RESULTS: two slots side by side, labels drawn, values EMPTY.
   left slot  - the label DEPTH REACHED, empty space under it
   right slot - the label CAPSULES, empty space under it
   Do NOT draw any digits. Do NOT draw any unit letter anywhere - no "m",
   no "M". The program writes the number and the unit together.

5. PERSONAL BEST: the label on the left, an EMPTY field on the right.
   Make this field WIDER than the result slots: the program writes
   "9999 m NEW!" into it when the record is beaten.

6. THREE BUTTONS in a column, all three the SAME size and shape, taken
   from the pause screen, gap between them equal:
     CONTINUE FOR AD   (with a small video / play icon, gold)
     DIVE AGAIN
     MAIN MENU
   The icon must sit inside the button rectangle, not stick out.

7. TIP AREA at the bottom: an EMPTY area two text lines tall. Draw
   nothing in it. The program writes a random tip there.

BACKGROUND: fully transparent PNG, real alpha. Crop tight around the
window including its glow. No canvas around it, no scene behind it.

DO NOT: write any digits, any unit letter, any cause of death, or any
tip text; draw a creature or wreckage; make the illustration large; make
the buttons a different size from the pause screen buttons; put a white
or coloured background behind the window.
```

Для русской версии — тот же промт, заменить только текст:

```
1. TITLE: СВЯЗЬ ПОТЕРЯНА
2. CAUSE STRIP: empty space wide enough for ЭНЕРГИЯ КОНЧИЛАСЬ
4. RESULTS: ДОСТИГНУТАЯ ГЛУБИНА  /  СОБРАНО КАПСУЛ
5. PERSONAL BEST: ЛИЧНЫЙ РЕКОРД, field fits "9999 м  НОВЫЙ!"
6. BUTTONS: ПРОДОЛЖИТЬ ЗА РЕКЛАМУ / ПОГРУЗИТЬСЯ СНОВА / В ГЛАВНОЕ МЕНЮ
```

**Вторую версию делать с первой подложкой, меняя только надписи.**
Геометрия двух языков обязана совпасть пиксель в пиксель — иначе кнопки
придётся задавать дважды, и каждая будущая правка окна тоже.

Сдавать полным файлом, не скриншотом.

---

## Титул — перерисовать целиком

Единственный экран, который надо рисовать заново, а не править. Нынешний
титул не годится по содержанию: на нём **черви из «Тайны астероида»** —
другой игры, другого мира. Это заметит любой, кто играл в обе.

Промт этот я давал в переписке и не записал сюда — и он потерялся.
Записываю.

Титул — **не окно, а полноэкранная картинка**: фон залит, прозрачность не
нужна, магента не нужна. Это единственный экран интерфейса, где так.

Про тварей ниже написано подробно и с запретами, потому что генератор по
слову «глубоководный» уверенно рисует змей и червей — именно так и
появились чужие твари на нынешнем титуле.

```
A title screen for a vertical mobile game. Canvas 480 x 854, portrait
9:16, drawn larger is fine, keep the proportion exactly. Fully opaque,
no transparency.

THE SCENE: looking down a deep ocean canyon. Two rock walls going down
into darkness, a narrow gap of lighter water between them. A small
submersible drone descending into it, seen from behind and above, its
lights cutting a cone through the dark water. Bioluminescent cyan glow,
cold blue-green palette, a sense of pressure and of something enormous
just out of frame.

THE CREATURES, in silhouette and half-lit, small, at the edges - they
set the mood, they are not the subject:
- a shoal of small flat blade-shaped fish, like thrown knives
- spiky hard corals growing out of the canyon walls
- a cluster of pale translucent tentacles, like a sea anemone, reaching
  out of one wall
- a long-jawed eel looking out of a round hole in the rock

DO NOT DRAW, this matters: no serpents, no snakes, no worms, no
segmented tube creatures, no sandworms, no tentacled space monsters, no
asteroids, no stars, no spacecraft. This is an ocean, not space. The
creatures listed above are the only ones in this game.

THE INTERFACE, over the scene:
- the game title at the top: DEEP DIVE
- below it, the label BEST DEPTH and an EMPTY field beside it. Draw no
  digits - the program writes the number there.
- three buttons in a column, all three the SAME size and shape, gap
  between them equal:
    START   (gold, the main one)
    HOW TO PLAY
    SETTINGS
  Same button shape as the pause screen: take it from that file.
- a small sound on/off icon in a top corner, drawn as a speaker.

DO NOT: draw any digits in the best depth field; make the main button a
different size from the other two; let the creatures dominate the
picture; add a background scene behind the buttons that makes the text
hard to read.
```

Для русской версии — заменить текст:

```
  title:  ГЛУБОКОЕ ПОГРУЖЕНИЕ
  label:  ЛУЧШАЯ ГЛУБИНА  + пустое поле
  buttons: НАЧАТЬ (gold) / КАК ИГРАТЬ / НАСТРОЙКИ
```

Сдавать полным файлом, не скриншотом. Старый титул уйдёт в `_src` сразу,
как придёт новый.
