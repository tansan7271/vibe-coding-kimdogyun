// 카펫 모양 계산 (SPEC 7장 카펫 연출). 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Carpet = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  // 지나가는 점들을 잇는 부드러운 곡선 (Catmull-Rom -> 3차 베지어). 첫 점 다음부터의 "C ..." 조각들
  function curveSegments(pts, minY, maxY) {
    const parts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      // 곡선이 묶인 높이 위로 솟거나 최대 처짐 아래로 넘치지 않게 제어점 높이를 가둔다
      const clamp = y => Math.min(maxY, Math.max(minY, y));
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };
      parts.push(`C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p2.x)} ${round(p2.y)}`);
    }
    return parts.join(' ');
  }

  /**
   * @param {object} input
   * @param {number[]} input.loads 날짜별 부하 합
   * @param {number} input.capacity 하루 예산
   * @param {Array<{left:number,right:number}>} input.columns 날짜별 가로 범위 (그림 좌표계)
   * @param {number} input.width 그림 전체 폭
   * @param {number} input.baseY 처지지 않았을 때 카펫 윗면 높이
   * @param {number} input.maxSag 예산만큼 찼을 때 처지는 깊이
   * @param {number} input.thickness 카펫 두께
   * @returns {{points:Array<{x:number,y:number}>, sags:number[], ribbonPath:string, dividers:number[]}}
   * 양 끝은 baseY에 묶인다. 처짐은 예산에서 멈춘다 (카펫은 잘 늘어나지 않는다).
   */
  function carpetShape({ loads, capacity, columns, width, baseY, maxSag, thickness }) {
    const sags = loads.map(load => {
      if (!(capacity > 0)) return 0;
      return Math.min(1, Math.max(0, load / capacity));
    });
    const points = [{ x: 0, y: baseY }];
    columns.forEach((col, i) => {
      points.push({ x: (col.left + col.right) / 2, y: baseY + sags[i] * maxSag });
    });
    points.push({ x: width, y: baseY });

    const bottom = points.map(p => ({ x: p.x, y: p.y + thickness })).reverse();
    const ribbonPath = [
      `M ${round(points[0].x)} ${round(points[0].y)}`,
      curveSegments(points, baseY, baseY + maxSag),
      `L ${round(bottom[0].x)} ${round(bottom[0].y)}`,
      curveSegments(bottom, baseY + thickness, baseY + maxSag + thickness),
      'Z',
    ].join(' ');

    const dividers = [];
    for (let i = 1; i < columns.length; i++) {
      dividers.push((columns[i - 1].right + columns[i].left) / 2);
    }

    return { points, sags, ribbonPath, dividers };
  }

  return { carpetShape };
});
