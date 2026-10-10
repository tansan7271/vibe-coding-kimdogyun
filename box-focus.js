// 눌린 박스가 제자리에서 커질 때 놓일 자리 계산. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 좌표는 전부 같은 좌표계(페이지 안 px)다. 박스 중심에서 커지되, 보이는 영역(bounds)에서 margin만큼 안쪽을 벗어나면 벗어나지 않는 곳까지만 밀어 놓는다.
// 보이는 영역보다 크면 영역 안에 들어가도록 크기를 줄인다(안쪽 내용이 스크롤된다).
//
// 두 자리를 돌려준다. content: 글자와 버튼이 놓이는 자리(항상 영역 안). 바탕(left/top/width/height): content와 원래 박스 자리를 함께 덮는 종이.
// 원래 박스가 영역 안에 있으면 content가 원래 박스를 덮도록 밀어 놓아 둘이 같다. 원래 박스가 영역 밖에 걸려 있으면(아래 메모지 밑으로 내려간 긴 박스 등)
// 글자는 영역 안에 두고 종이만 원래 박스 쪽으로 더 늘려서, 원래 박스 자리의 빈 곳이 드러나지 않게 한다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BoxFocus = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // box: { x, y }  눌린 박스의 중심.  size: { w, h }  커진 뒤 원하는 내용 크기.
  // bounds: { left, top, right, bottom }  보이는 영역.  margin: 영역 가장자리에서 띄울 거리.  cover: { w, h }  덮어야 할 원래 박스 크기(선택)
  // 반환: { left, top, width, height, content: { left, top, width, height } }
  function focusRect({ box, size, bounds, margin = 0, cover = null }) {
    const maxW = Math.max(0, bounds.right - bounds.left - 2 * margin);
    const maxH = Math.max(0, bounds.bottom - bounds.top - 2 * margin);
    const width = Math.min(size.w, maxW);
    const height = Math.min(size.h, maxH);
    const content = {
      left: place(box.x, width, bounds.left + margin, bounds.right - margin, cover && cover.w),
      top: place(box.y, height, bounds.top + margin, bounds.bottom - margin, cover && cover.h),
      width, height,
    };
    if (!cover) return { ...content, content };
    // 종이: content와 원래 박스 자리를 함께 덮는 가장 작은 사각형
    const left = Math.min(content.left, box.x - cover.w / 2), top = Math.min(content.top, box.y - cover.h / 2);
    const right = Math.max(content.left + width, box.x + cover.w / 2), bottom = Math.max(content.top + height, box.y + cover.h / 2);
    return { left, top, width: right - left, height: bottom - top, content };
  }

  // 한 축에서 시작 위치: 중심(center)에 맞추되 [min, max] 안으로 밀고, 덮을 길이(cover)가 있으면 그 구간을 덮는 범위 안으로 좁힌다(둘을 함께 만족할 수 있을 때만)
  function place(center, length, min, max, cover) {
    let lo = min, hi = max - length;
    if (cover) {
      const covered = [center - cover / 2, center + cover / 2];
      const coverLo = Math.max(lo, covered[1] - length), coverHi = Math.min(hi, covered[0]);
      if (coverLo <= coverHi) { lo = coverLo; hi = coverHi; }
    }
    return Math.min(Math.max(center - length / 2, lo), hi);
  }

  return { focusRect };
});
