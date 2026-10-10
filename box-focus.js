// 눌린 박스가 제자리에서 커질 때 놓일 자리 계산. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 좌표는 전부 같은 좌표계(페이지 안 px)다. 박스 중심에서 커지되, 보이는 영역(bounds)에서 margin만큼 안쪽을 벗어나면 벗어나지 않는 곳까지만 밀어 놓는다.
// 보이는 영역보다 크면 영역 안에 들어가도록 크기를 줄인다(안쪽 내용이 스크롤된다).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BoxFocus = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // box: { x, y }  눌린 박스의 중심.  size: { w, h }  커진 뒤 원하는 크기.
  // bounds: { left, top, right, bottom }  보이는 영역.  margin: 영역 가장자리에서 띄울 거리
  // 반환: { left, top, width, height }
  function focusRect({ box, size, bounds, margin = 0 }) {
    const maxW = Math.max(0, bounds.right - bounds.left - 2 * margin);
    const maxH = Math.max(0, bounds.bottom - bounds.top - 2 * margin);
    const width = Math.min(size.w, maxW);
    const height = Math.min(size.h, maxH);
    const minLeft = bounds.left + margin, maxLeft = bounds.right - margin - width;
    const minTop = bounds.top + margin, maxTop = bounds.bottom - margin - height;
    const left = Math.min(Math.max(box.x - width / 2, minLeft), maxLeft);
    const top = Math.min(Math.max(box.y - height / 2, minTop), maxTop);
    return { left, top, width, height };
  }

  return { focusRect };
});
