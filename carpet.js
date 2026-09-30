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

  /**
   * @param {object} input
   * @param {number[]} input.loads 날짜별 부하 합
   * @param {number} input.capacity 하루 예산
   * @param {Array<{left:number,right:number}>} input.columns 날짜별 가로 범위 (그림 좌표계)
   * @param {number} input.width 그림 전체 폭
   * @param {number} input.baseY 처지지 않았을 때 카펫 높이
   * @param {number} input.maxSag 예산만큼 찼을 때 처지는 깊이
   * @returns {{points:Array<{x:number,y:number}>, sags:number[], linePath:string, dividers:number[]}}
   * 날짜 지점끼리 직선으로 잇는다 (꺾은선). 양 끝은 baseY에 묶인다. 처짐은 예산에서 멈춘다 (카펫은 잘 늘어나지 않는다).
   */
  function carpetShape({ loads, capacity, columns, width, baseY, maxSag }) {
    const sags = loads.map(load => {
      if (!(capacity > 0)) return 0;
      return Math.min(1, Math.max(0, load / capacity));
    });
    const points = [{ x: 0, y: baseY }];
    columns.forEach((col, i) => {
      points.push({ x: (col.left + col.right) / 2, y: baseY + sags[i] * maxSag });
    });
    points.push({ x: width, y: baseY });

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`)
      .join(' ');

    const dividers = [];
    for (let i = 1; i < columns.length; i++) {
      dividers.push((columns[i - 1].right + columns[i].left) / 2);
    }

    return { points, sags, linePath, dividers };
  }

  return { carpetShape };
});
