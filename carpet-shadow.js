// 새 카펫 그림자 계산: 카펫 곡선의 높이를 가로로 촘촘히 재고, 곡선에서 아래로 옅어지는 정도를 돌려준다. 순수 함수. DOM, 현재 시각을 직접 읽지 않는다.
// 그림자는 가로 한 칸마다 '곡선 바로 아래에서 시작해 아래로 옅어지는 세로 그라데이션'을 한 줄씩 그려 만든다(화면 쪽 코드가 캔버스에 한 번만 그린다).
// 곡선을 따라가므로 처진 정도와 상관없이 곡선 바로 아래가 가장 진하고, 그라데이션이 부드러워 띠(계단)가 생기지 않는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarpetShadow = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * 카펫 곡선(Carpet.carpetShape의 linePath: M, C, L 명령만 쓴다)을 가로 x에서 잰 높이 y를 step 간격으로 돌려준다.
   * 곡선은 왼쪽에서 오른쪽으로만 가는 경로(S자 곡선의 제어점 x가 순서대로 늘어난다)라서 x마다 y가 하나다.
   * @param {object} input
   * @param {string} input.linePath M x y 로 시작하고 C x1 y1 x2 y2 x y 와 L x y 로 이어지는 경로
   * @param {number} input.width 재는 가로 범위 0~width
   * @param {number} input.step 재는 간격(x)
   * @returns {number[]} i번째 값은 x = min(i*step, width)에서의 곡선 높이. 길이는 ceil(width/step) + 1
   */
  function curveYs({ linePath, width, step }) {
    const poly = []; // 곡선을 짧은 직선으로 잘게 편 점들
    let cur = null;
    for (const m of linePath.matchAll(/([MCL])\s*([-\d.eE+\s]+)/g)) {
      const n = m[2].trim().split(/\s+/).map(Number);
      if (m[1] === 'M') { cur = [n[0], n[1]]; poly.push(cur); }
      else if (m[1] === 'L') { cur = [n[0], n[1]]; poly.push(cur); }
      else {
        const [x0, y0] = cur;
        const [x1, y1, x2, y2, x3, y3] = n;
        const pieces = 24;
        for (let k = 1; k <= pieces; k++) { // 세 제어점으로 이어진 3차 곡선 위의 점
          const t = k / pieces, u = 1 - t;
          poly.push([
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          ]);
        }
        cur = [x3, y3];
      }
    }
    const count = Math.ceil(width / step) + 1;
    const ys = new Array(count);
    let j = 0;
    for (let i = 0; i < count; i++) {
      const x = Math.min(i * step, width);
      while (j < poly.length - 2 && poly[j + 1][0] < x) j++; // x가 들어 있는 직선 조각을 찾는다(x가 늘어나기만 하므로 앞에서부터 이어서)
      const [ax, ay] = poly[j], [bx, by] = poly[j + 1];
      ys[i] = bx === ax ? ay : ay + ((by - ay) * (x - ax)) / (bx - ax);
    }
    return ys;
  }

  /**
   * 곡선에서 아래로 갈수록 옅어지는 정도(그라데이션 정지점). 위쪽이 진하고 아래로 갈수록 천천히 사라지는 부드러운 곡선
   * @param {number} alpha 곡선 바로 아래의 불투명도 0~1
   * @returns {Array<[number, number]>} [곡선에서 아래로 간 비율 0~1, 그 자리의 불투명도]. 비율 0에서 alpha, 비율 1에서 0
   */
  function falloffStops(alpha) {
    const a = Math.min(1, Math.max(0, alpha));
    const shape = [[0, 1], [0.12, 0.74], [0.3, 0.45], [0.55, 0.19], [0.8, 0.05], [1, 0]]; // 위에서 빠르게 옅어졌다가 끝에서 천천히 사라진다
    return shape.map(([t, f]) => [t, Math.round(a * f * 1000) / 1000]);
  }

  return { curveYs, falloffStops };
});
