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
   * @param {number} [input.safeRatio] 안전선 비율. 있으면 safeLine을 돌려준다
   * @param {number} [input.flatRatio] 카드 폭 중 평평한 바닥이 차지하는 비율 (기본 0.6, 카드 가운데 기준)
   * @param {number} [input.curve] 바닥 사이 곡선의 제어점 위치 (간격 대비 0~0.5, 기본 0.5. 0이면 직선, 0.5면 S자)
   * @param {boolean[]} [input.timeOver] 날짜별 시간 초과 여부. true인 날만 짐 상자가 칸 폭 밖으로 삐져나온다
   * @param {number} [input.overflowBoxWidth] 짐 상자 폭 / 칸 폭 (기본 1.3)
   * @param {number} [input.overflowBoxHeight] 짐 상자 높이 (기본 14)
   * @param {number} [input.gridMaxLines] 가로 격자 선 최대 개수 (기본 10)
   * @param {number} [input.gridLabelEvery] 격자 몇 줄마다 숫자를 적을지 (기본 5)
   * @returns {{overflowBoxes:Array<{x:number,y:number,width:number,height:number}|null>, points:Array<{x:number,y:number}>, floors:Array<{x1:number,x2:number,y:number}>, gridLines:Array<{value:number,y:number,isBudget:boolean,label:boolean}>, safeLine:{value:number,y:number}|null, sags:number[], linePath:string, dividers:number[]}}
   * 날짜마다 평평한 바닥, 바닥 사이는 S자 곡선으로 잇는다. 양 끝은 baseY에 묶인다.
   * 처짐은 예산에서 멈춘다 (카펫은 잘 늘어나지 않는다).
   */
  function carpetShape({ loads, capacity, columns, width, baseY, maxSag, safeRatio, flatRatio = 0.6, timeOver = [], overflowBoxWidth = 1.3, overflowBoxHeight = 14, curve = 0.5, gridMaxLines = 10, gridLabelEvery = 5 }) {
    const sags = loads.map(load => {
      if (!(capacity > 0)) return 0;
      return Math.min(1, Math.max(0, load / capacity));
    });
    const points = [{ x: 0, y: baseY }];
    const floors = columns.map((col, i) => {
      const mid = (col.left + col.right) / 2;
      const half = ((col.right - col.left) * flatRatio) / 2;
      const y = baseY + sags[i] * maxSag;
      points.push({ x: mid, y });
      return { x1: mid - half, x2: mid + half, y };
    });
    points.push({ x: width, y: baseY });

    // 시작(왼쪽 끝) -> 첫 바닥 -> ... -> 마지막 바닥 -> 끝(오른쪽 끝)
    const nodes = [{ x1: 0, x2: 0, y: baseY }, ...floors, { x1: width, x2: width, y: baseY }];
    const parts = [`M ${round(nodes[0].x2)} ${round(nodes[0].y)}`];
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const cur = nodes[i];
      const handle = (cur.x1 - prev.x2) * Math.min(0.5, Math.max(0, curve));
      // 양 끝 접선이 수평인 S자 곡선
      parts.push(`C ${round(prev.x2 + handle)} ${round(prev.y)} ${round(cur.x1 - handle)} ${round(cur.y)} ${round(cur.x1)} ${round(cur.y)}`);
      if (cur.x2 > cur.x1) parts.push(`L ${round(cur.x2)} ${round(cur.y)}`);
    }
    const linePath = parts.join(' ');

    // 시간 초과: 짐 상자가 칸 폭보다 넓어 양옆으로 삐져나온다 (부하 초과와 다른 표시)
    const overflowBoxes = floors.map((f, i) => {
      if (!timeOver[i]) return null;
      const col = columns[i];
      const w = (col.right - col.left) * overflowBoxWidth;
      return { x: round((col.left + col.right) / 2 - w / 2), y: round(f.y - overflowBoxHeight), width: round(w), height: overflowBoxHeight };
    });

    const dividers = [];
    for (let i = 1; i < columns.length; i++) {
      dividers.push((columns[i - 1].right + columns[i].left) / 2);
    }

    // 가로 격자: 부하 눈금. 카펫 바닥과 같은 식(baseY + 부하/예산 * maxSag)으로 높이를 잡는다
    const gridLines = [];
    let safeLine = null;
    if (capacity > 0) {
      const yOf = value => baseY + (value / capacity) * maxSag;
      const step = Math.max(1, Math.ceil(capacity / Math.max(1, gridMaxLines))); // 예산이 크면 선이 촘촘해지지 않게 간격을 벌린다
      for (let v = 0; v < capacity; v += step) {
        gridLines.push({ value: v, y: yOf(v), isBudget: false, label: v % (Math.max(1, gridLabelEvery) * step) === 0 && capacity - v >= step });
      }
      gridLines.push({ value: capacity, y: yOf(capacity), isBudget: true, label: true });
      if (safeRatio > 0 && safeRatio < 1) {
        safeLine = { value: capacity * safeRatio, y: yOf(capacity * safeRatio) };
      }
    }

    return { overflowBoxes, points, floors, gridLines, safeLine, sags, linePath, dividers };
  }

  return { carpetShape };
});
