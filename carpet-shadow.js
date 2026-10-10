// 새 카펫 그림자 모양 계산: 카펫 곡선 바로 아래가 가장 진하고 아래로 갈수록 곡선을 따라 옅어지는 그림자. 순수 함수. DOM, 현재 시각을 직접 읽지 않는다.
// 만드는 법: 곡선 위쪽을 채운 영역을 아래로 조금씩 옮긴 사본 여러 장을, '곡선 아래 영역'으로 잘라 겹친다.
// 사본 j는 곡선과 곡선+shift_j 사이의 띠를 칠하므로, 곡선에서 깊이 t만큼 내려간 곳은 shift_j >= t인 사본만큼만 칠해져 아래로 갈수록 옅어진다.
// 곡선이 처진 정도와 상관없이 그림자가 곡선을 따라가므로 부하가 큰 날도 곡선 바로 아래에 그림자가 생긴다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarpetShadow = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function round(n, digits = 2) {
    const k = Math.pow(10, digits);
    return Math.round(n * k) / k;
  }

  /**
   * @param {object} input
   * @param {Array<{x:number,y:number}>} input.points 카펫 곡선의 점(Carpet.carpetShape의 points). 가장 높은 곳과 가장 깊은 곳을 알려고 쓴다
   * @param {string} input.linePath 카펫 곡선(Carpet.carpetShape의 linePath). 왼쪽 끝(x=0)에서 시작해 오른쪽 끝(x=width)에서 끝난다
   * @param {number} input.width 그림 폭
   * @param {number} input.bottomY 그림자 영역의 맨 아래(화면 맨 아래). 가장 깊이 처진 카펫보다 위면 그 깊이까지 늘린다
   * @param {number} input.fadeLength 곡선에서 완전히 투명해지기까지의 깊이(px)
   * @param {number} input.alpha 곡선 바로 아래의 불투명도 0~1
   * @param {number} [input.layers] 겹치는 사본 수(기본 18). 많을수록 곱지만 그리는 도형이 늘어난다
   * @returns {{clipD:string, aboveD:string, shifts:number[], layerAlpha:number, top:number, bottom:number}}
   *   clipD: 곡선 아래 영역(맨 아래까지). 이 영역으로 자른다
   *   aboveD: 곡선 위쪽을 채우는 경로. shifts의 각 값만큼 아래로 옮겨 layerAlpha로 칠한다
   *   layerAlpha: 사본 한 장의 불투명도. 사본을 다 겹친 곡선 바로 아래가 alpha가 되게 맞춘 값
   */
  function bandShape({ points, linePath, width, bottomY, fadeLength, alpha, layers = 18 }) {
    const ys = points.map(p => p.y);
    const top = Math.min(...ys);
    const deepest = Math.max(...ys);
    const bottom = Math.max(bottomY, deepest);
    const n = Math.max(1, Math.floor(layers));
    const len = Math.max(0, fadeLength);
    const a = Math.min(1, Math.max(0, alpha));
    const shifts = Array.from({ length: n }, (_, i) => round((len * (i + 1)) / n));
    return {
      clipD: `${linePath} L ${round(width)} ${round(bottom)} L 0 ${round(bottom)} Z`,
      aboveD: `${linePath} L ${round(width)} ${round(top - 10)} L 0 ${round(top - 10)} Z`,
      shifts,
      layerAlpha: round(1 - Math.pow(1 - a, 1 / n), 5), // 겹쳐 칠한 곡선 바로 아래가 alpha가 되게: 1 - (1 - 한 장)^장 수 = alpha
      top: round(top),
      bottom: round(bottom),
    };
  }

  return { bandShape };
});
