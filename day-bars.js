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

  // 막대 묶음의 위쪽 y. carpetY: 그 날 카펫 선의 높이, budgetY: 예산선 높이, gap: 위쪽 여백, clear: 카펫 아래 그림자가 차지하는 깊이.
  // 카펫이 예산선 위에 있으면 예산선 밑 gap에 놓는다. 선 밑으로 over만큼 처지면 over의 두 배로 내려가다가(끊기지 않게),
  // over가 clear를 넘으면 카펫 선 + clear + gap(그림자 밑 같은 여백)을 따라간다
  function barsTop({ carpetY, budgetY, gap, clear }) {
    const over = Math.max(0, carpetY - budgetY);
    return budgetY + gap + over + Math.min(clear, over);
  }

  // 막대가 찬 비율(0~1). total이 0 이하면(쓸 수 있는 시간이 없는 날 등) 가득 찬 것으로 본다
  function fillRatio(used, total) {
    if (!(total > 0)) return 1;
    return Math.min(1, Math.max(0, used / total));
  }

  return { barsTop, fillRatio };
});
