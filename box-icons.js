// 박스에 쓰는 아이콘과 완료 도장 모양. 순수 함수·데이터. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 아이콘: Google의 Material Symbols(둥근 모양)에서 가져온 경로 데이터(24×24 좌표). Apache License 2.0.
//   저작권 Google LLC. 원본 https://github.com/google/material-design-icons  라이선스 https://www.apache.org/licenses/LICENSE-2.0
//   쓴 것: bolt(부하), schedule(시간), snooze(밀림). 모양을 바꾸지 않고 그대로 옮겼다.
// 이 파일의 paths는 위 아이콘을 내려받아 만든 생성물이다(손으로 고치지 않는다). sealPath는 우리가 만든 함수다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BoxIcons = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const paths = {
    load: "M9 15H5.9q-.6 0-.888-.537t.063-1.038l7.475-10.75q.25-.35.65-.487t.825.012t.625.525t.15.8L14 10h3.875q.65 0 .913.575t-.163 1.075L10.4 21.5q-.275.325-.675.425t-.775-.075t-.587-.537t-.163-.788z",
    time: "M13 11.6V8q0-.425-.288-.712T12 7t-.712.288T11 8v3.975q0 .2.075.388t.225.337l3.3 3.3q.275.275.7.275T16 16t.275-.7t-.275-.7zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22",
    push: "m11.7 14.15l2.675-3q.025-.025.125-.35v-.4q0-.325-.212-.537t-.538-.213h-3.5q-.325 0-.537.213T9.5 10.4t.213.538t.537.212h2.1L9.625 14.2q-.025.025-.125.35v.35q0 .325.213.538t.537.212h3.5q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213zm-3.212 7.138q-1.638-.713-2.85-1.925t-1.925-2.85T3 13t.713-3.512t1.924-2.85t2.85-1.925T12 4t3.513.713t2.85 1.925t1.925 2.85T21 13t-.712 3.513t-1.925 2.85t-2.85 1.925T12 22t-3.512-.712M2.05 7.3q-.275-.275-.275-.7t.275-.7L4.9 3.05q.275-.275.7-.275t.7.275t.275.7t-.275.7L3.45 7.3q-.275.275-.7.275t-.7-.275m19.9 0q-.275.275-.7.275t-.7-.275L17.7 4.45q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l2.85 2.85q.275.275.275.7t-.275.7",
  };

  // 완료 도장(닌텐도 품질 보증 마크 같은, 가장자리가 물결치는 둥근 별) 윤곽선.
  // 반지름이 바깥(outer)과 안쪽(outer × (1 − depth)) 사이를 lobes번 오가며 한 바퀴 돈다. 중심은 (0, 0)
  function sealPath(lobes = 18, outer = 48, depth = 0.12, steps = 360) {
    const mid = outer * (1 - depth / 2), amp = outer * depth / 2;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      const r = mid + amp * Math.cos(lobes * th);
      pts.push((r * Math.cos(th)).toFixed(1) + ' ' + (r * Math.sin(th)).toFixed(1));
    }
    return 'M' + pts.join('L') + 'Z';
  }

  // 설정 아이콘(톱니바퀴) 윤곽선: 우리가 만든 모양이다. 바깥 둘레(이빨 teeth개)와 가운데 구멍 둘, 두 윤곽을 evenodd로 채워 구멍을 낸다. 중심은 (0, 0)
  // outer: 이빨 끝 반지름, root: 이빨 사이 반지름, hole: 구멍 반지름. 이빨 끝은 한 이빨 각도(P)의 36%, 뿌리는 60% 폭이다
  function gearPath(teeth = 8, outer = 10, root = 7.6, hole = 3.4) {
    const P = (Math.PI * 2) / teeth;
    const pt = (r, th) => (r * Math.cos(th)).toFixed(2) + ' ' + (r * Math.sin(th)).toFixed(2);
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = i * P;
      pts.push(pt(root, a - 0.3 * P), pt(outer, a - 0.18 * P), pt(outer, a + 0.18 * P), pt(root, a + 0.3 * P));
    }
    const ring = [];
    for (let i = 0; i < 48; i++) ring.push(pt(hole, -(i / 48) * Math.PI * 2));
    return 'M' + pts.join('L') + 'ZM' + ring.join('L') + 'Z';
  }

  return { paths, sealPath, gearPath };
});
