// ===== growth.js =====
// ============================================================
// Наросты на стенах ущелья.
//
// Два правила, без которых игра становится несправедливой:
//
// 1. НЕ СКЛАДЫВАТЬ ИСПЫТАНИЯ. Горловина проверяет точность, наросты —
//    реакцию. Вместе они дают проход, который физически не пройти.
//    Поэтому в горловине наростов нет, основная плотность — на передышке.
//
// 2. СЧИТАТЬ ЭФФЕКТИВНЫЙ ПРОХОД. Нарост в 26px из стены превращает проход
//    120px в 94px. Ущелье обязано раздвигаться на съеденное место, иначе
//    заявленная ширина ничего не значит.
// ============================================================

const Growth = (() => {

  const G = CONFIG.GROWTH;

  // Детерминированный псевдослучайный шум: одна и та же глубина всегда даёт
  // один и тот же нарост. Иначе стены дёргались бы при каждом кадре.
  function _hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }

  // Плотность растёт с глубиной, но не превышает потолок фазы
  function _densityAt(depth, phase) {
    const base = G.DENSITY[phase] ?? 0;
    if (base === 0) return 0;
    const ramp = Math.min(1, depth / G.DEPTH_RAMP);
    return base * (0.35 + 0.65 * ramp);
  }

  // Есть ли нарост на этой глубине и насколько он торчит.
  // side: 'left' | 'right' — какую стену проверяем
  // pressing: какая стена давит в текущей волне (для правила фазы СЖАТИЕ)
  function reachAt(depth, phase, side, pressing) {
    const density = _densityAt(depth, phase);
    if (density <= 0) return 0;

    // На СЖАТИИ наросты только на стене, которая НЕ давит: игрок и так
    // прижат, добавлять угрозу с той же стороны — двойное испытание
    if (phase === 'squeeze') {
      if (pressing === 'both') return 0;
      if (side === pressing) return 0;
    }

    // Наросты стоят не подряд, а с шагом; фаза шага своя у каждой стены
    const slot = Math.floor(depth / G.SPACING) + (side === 'left' ? 0 : 7919);
    const r = _hash(slot);
    if (r > density) return 0;

    // Насколько торчит: плавно нарастает и спадает внутри своего слота
    const local = (depth % G.SPACING) / G.SPACING;
    const shape = Math.sin(local * Math.PI);          // 0 -> 1 -> 0
    const size = 0.45 + 0.55 * _hash(slot * 3.7);     // разные по величине
    return G.MAX_REACH * size * shape;
  }

  // Сколько места съедают наросты на этой глубине с обеих сторон.
  // Нужно ущелью, чтобы раздвинуться и сохранить обещанный проход.
  function totalReachAt(depth, phase, pressing) {
    return reachAt(depth, phase, 'left', pressing)
         + reachAt(depth, phase, 'right', pressing);
  }

  return { reachAt, totalReachAt };

})();
