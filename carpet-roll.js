// 카펫 롤(돌돌 말린 카펫)이 굴러가며 펼쳐지는 계산. 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
//
// 모양: 카펫은 폭 spacing(바퀴 사이 간격)으로 감긴 아르키메데스 나선이다. 반지름 r(θ) = coreRadius + spacing·θ/(2π).
// 아직 말려 있는 길이(remaining)가 정해지면 나선의 끝 각도 Θ가 정해진다(나선 길이 = coreRadius·Θ + spacing·Θ²/(4π)).
// 롤은 땅(groundY)에 닿는 맨 아래 점에서 펼쳐진 카펫과 이어지고, 미끄러지지 않는다.
// 그래서 롤 중심이 dx 움직이면 롤은 dx / (바깥 반지름) 만큼 돈다. 펼쳐질수록 반지름이 작아져 점점 빨리 돈다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarpetRoll = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // 말린 길이 remaining일 때 나선의 끝 각도(rad)와 바깥 반지름
  function spiralEnd({ remaining, spacing, coreRadius }) {
    if (remaining <= 0) return { theta: 0, radius: coreRadius };
    const a = spacing / (4 * Math.PI);
    const theta = (-coreRadius + Math.sqrt(coreRadius * coreRadius + 4 * a * remaining)) / (2 * a);
    return { theta, radius: coreRadius + (spacing * theta) / (2 * Math.PI) };
  }

  // progress 0~1(0: 막 시작, 1: 다 펼쳐짐)일 때 롤의 자세.
  // width: 화면 너비. 롤은 화면 왼쪽 밖에 통째로 있는 상태에서 시작해 굴러 들어온다(startMargin: 가장자리에서 더 띄우는 거리).
  // 카펫 전체 길이는 롤이 땅에 처음 닿은 점(startX, 화면 밖)에서 오른쪽 끝(width)까지다
  function rollPose({ progress, width, spacing, coreRadius, groundY, startMargin = 0 }) {
    const p = Math.min(1, Math.max(0, progress));
    let startX = 0;
    for (let i = 0; i < 16; i++) { // 롤 크기는 전체 길이에, 전체 길이는 롤 위치에 달려 있어서 반복해 맞춘다
      startX = -(spiralEnd({ remaining: width - startX, spacing, coreRadius }).radius + startMargin);
    }
    const contactX = startX + p * (width - startX);
    const remaining = width - contactX;
    const { theta, radius } = spiralEnd({ remaining, spacing, coreRadius });
    return {
      contactX, remaining, theta, radius,
      cx: contactX, cy: groundY - radius,
      alpha0: Math.PI / 2 - theta, // θ=0(중심 쪽 끝)의 방향. 끝 각도 Θ가 정확히 아래(π/2)를 보도록 정한다
      startX,
    };
  }

  // 나선 위의 점들(중심 쪽 끝부터 바깥 끝까지). 바깥 끝은 (contactX, groundY)에서 펼쳐진 카펫과 이어진다
  function spiralPoints(pose, { spacing, coreRadius, stepRad = 0.12 }) {
    const pts = [];
    const n = Math.max(1, Math.ceil(pose.theta / stepRad));
    for (let i = 0; i <= n; i++) {
      const th = (pose.theta * i) / n;
      const r = coreRadius + (spacing * th) / (2 * Math.PI);
      const a = pose.alpha0 + th;
      pts.push([pose.cx + r * Math.cos(a), pose.cy + r * Math.sin(a)]);
    }
    return pts;
  }

  // 천천히 시작해 천천히 끝나는 곡선
  function easeInOutSine(t) {
    const x = Math.min(1, Math.max(0, t));
    return (1 - Math.cos(Math.PI * x)) / 2;
  }

  // 펼침 진행도. 최소 시간과 실제 일의 진행 중 더 느린 쪽을 따른다.
  // 일이 단계 단위로 갑자기 끝나도 롤이 튀지 않게, 한 번에 올라가는 속도에 상한(speedLimit × 최소 시간 기준 속도)을 둔다
  function introProgress({ elapsedMs, minMs, workDone, workTotal, prev, dtMs, speedLimit = 2.5 }) {
    const timeP = Math.min(1, Math.max(0, elapsedMs / minMs));
    const workP = workTotal > 0 ? Math.min(1, workDone / workTotal) : 1;
    const target = Math.min(timeP, workP);
    const maxStep = (speedLimit / minMs) * Math.max(0, dtMs);
    const next = Math.min(target, prev + maxStep);
    return Math.max(prev, next);
  }

  return { spiralEnd, rollPose, spiralPoints, easeInOutSine, introProgress };
});
