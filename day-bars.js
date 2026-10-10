// 날짜별 막대(부하, 남은 시간)의 계산. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 막대는 눈금 맨 아래 가로선(예산선) 밑에 놓인다. 카펫이 그 선 밑으로 처지면 막대도 카펫(과 그 그림자) 밑으로 따라 내려온다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DayBars = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // 막대 묶음의 위쪽 y. carpetY: 그 날 카펫 선의 높이, budgetY: 예산선 높이, gap: 위쪽 여백, clear: 카펫 아래 그림자가 눈에 보이는 깊이.
  // 기본은 예산선 밑 gap이다. 카펫이 내려와 그림자(clear)와 여백(gap)을 합친 자리가 그보다 아래가 되면, 그때부터 카펫과 같은 속도로
  // 카펫 선 + clear + gap(그림자 밑 같은 여백)을 지키며 따라 내려온다. 두 값 중 큰 쪽이므로 끊기지 않고, 카펫이 얼마나 처졌든 간격은 늘 같다
  function barsTop({ carpetY, budgetY, gap, clear }) {
    return Math.max(budgetY + gap, carpetY + clear + gap);
  }

  // 막대가 찬 비율(0~1). total이 0 이하면(쓸 수 있는 시간이 없는 날 등) 가득 찬 것으로 본다
  function fillRatio(used, total) {
    if (!(total > 0)) return 1;
    return Math.min(1, Math.max(0, used / total));
  }

  return { barsTop, fillRatio };
});
