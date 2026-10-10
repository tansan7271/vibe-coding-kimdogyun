// 박스를 끌다가 놓을 자리(구역) 판정. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 구역은 우선순위가 있다: 위쪽(취소) > 왼쪽 끝(지난 주) > 오른쪽 끝(다음 주) > 날짜 세로칸. 좌표는 전부 화면(뷰포트) 기준 px이다.
// 날짜칸은 페이지 폭을 columns등분한 세로 줄 전체다(높이와 상관없다). 놓을 수 있는지(같은 날, 지난 날)는 placement.js의 canDropPin이 가린다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BoxDrag = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // x, y: 포인터.  width: 화면 폭.  edge: 왼쪽·오른쪽 끝 구역의 폭.  topHeight: 위쪽 취소 구역의 높이(화면 맨 위부터)
  // page: { left, width }  날짜칸 7개가 놓인 페이지의 화면 위치.  columns: 칸 수(기본 7)
  // 반환: { zone: 'cancel' | 'prev' | 'next' | 'col' | 'none', col }  col은 zone이 'col'일 때만 0부터, 아니면 -1
  function zoneAt({ x, y, width, edge, topHeight, page, columns = 7 }) {
    if (y < topHeight) return { zone: 'cancel', col: -1 };
    if (x < edge) return { zone: 'prev', col: -1 };
    if (x > width - edge) return { zone: 'next', col: -1 };
    if (x < page.left || x >= page.left + page.width || !(page.width > 0)) return { zone: 'none', col: -1 };
    const col = Math.min(columns - 1, Math.max(0, Math.floor((x - page.left) / (page.width / columns))));
    return { zone: 'col', col };
  }

  return { zoneAt };
});
