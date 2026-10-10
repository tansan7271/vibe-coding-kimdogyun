const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spiralEnd, rollPose, spiralPoints, easeInOutSine, introProgress } = require('./carpet-roll.js');

const S = { spacing: 10, coreRadius: 7 };
const W = 1400;
const base = { width: W, groundY: 100, ...S };

test('나선 길이가 말린 길이와 같다 (끝 각도 계산)', () => {
  for (const remaining of [1, 50, 700, 1400]) {
    const { theta } = spiralEnd({ remaining, ...S });
    // 호 길이 = ∫ r(θ) dθ 를 잘게 쪼개 더한다
    let len = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const th = ((i + 0.5) / n) * theta;
      len += (S.coreRadius + (S.spacing * th) / (2 * Math.PI)) * (theta / n);
    }
    assert.ok(Math.abs(len - remaining) / remaining < 0.001, `remaining ${remaining}: ${len}`);
  }
});

test('다 펼쳐지면 롤은 심지만 남고 카펫은 화면 너비 전체다', () => {
  const p = rollPose({ ...base, progress: 1 });
  assert.equal(p.theta, 0);
  assert.equal(p.radius, S.coreRadius);
  assert.ok(Math.abs(p.contactX - W) < 1e-9);
  assert.equal(p.remaining, 0);
});

test('시작할 때 롤이 화면 왼쪽 밖에 통째로 있다', () => {
  const p = rollPose({ ...base, progress: 0 });
  assert.ok(p.cx + p.radius <= 1e-6, `롤 오른쪽 끝 ${p.cx + p.radius}`);
  assert.ok(p.startX < 0);
  const q = rollPose({ ...base, progress: 0, startMargin: 4 });
  assert.ok(q.cx + q.radius <= -4 + 1e-6, `여유를 두면 더 멀리 ${q.cx + q.radius}`);
});

test('롤이 굴러 들어와 화면 안으로 들어온다', () => {
  const p = rollPose({ ...base, progress: 0.2 });
  assert.ok(p.cx > 0 && p.cx - p.radius < 0 + p.radius * 3, `중심 ${p.cx}`);
  assert.ok(rollPose({ ...base, progress: 0.5 }).cx > p.cx);
});

test('롤은 펼칠수록 작아지고 오른쪽으로 간다', () => {
  let prevR = Infinity, prevX = -Infinity;
  for (let i = 0; i <= 100; i++) {
    const p = rollPose({ ...base, progress: i / 100 });
    assert.ok(p.radius <= prevR + 1e-9);
    assert.ok(p.contactX >= prevX - 1e-9);
    prevR = p.radius; prevX = p.contactX;
  }
});

test('롤은 항상 땅에 닿아 있고, 나선 바깥 끝이 펼쳐진 카펫과 이어진다', () => {
  for (const progress of [0, 0.2, 0.5, 0.9, 1]) {
    const p = rollPose({ ...base, progress });
    assert.ok(Math.abs(p.cy + p.radius - base.groundY) < 1e-9);
    const pts = spiralPoints(p, S);
    const [x, y] = pts[pts.length - 1];
    assert.ok(Math.abs(x - p.contactX) < 1e-6, `x ${x} vs ${p.contactX}`);
    assert.ok(Math.abs(y - base.groundY) < 1e-6, `y ${y}`);
  }
});

test('미끄러지지 않는다: 중심이 dx 움직이면 dx / 반지름 만큼 돈다', () => {
  const n = 5000;
  let sum = 0;
  let prev = rollPose({ ...base, progress: 0.1 });
  const start = prev;
  for (let i = 1; i <= n; i++) {
    const p = rollPose({ ...base, progress: 0.1 + (0.8 * i) / n });
    const dx = p.contactX - prev.contactX;
    sum += dx / ((p.radius + prev.radius) / 2);
    prev = p;
  }
  const rotated = prev.alpha0 - start.alpha0; // 시계 방향(화면 y가 아래)으로 늘어나는 각도
  assert.ok(Math.abs(rotated - sum) / sum < 0.005, `${rotated} vs ${sum}`);
  assert.ok(rotated > 0);
});

test('나선 점들은 중심에서 바깥으로 갈수록 반지름이 커진다', () => {
  const p = rollPose({ ...base, progress: 0.3 });
  const pts = spiralPoints(p, S);
  let prevR = -1;
  for (const [x, y] of pts) {
    const r = Math.hypot(x - p.cx, y - p.cy);
    assert.ok(r >= prevR - 1e-9);
    prevR = r;
  }
  assert.ok(Math.abs(prevR - p.radius) < 1e-6);
});

test('easeInOutSine: 양 끝은 0과 1이고 가운데는 0.5', () => {
  assert.equal(easeInOutSine(0), 0);
  assert.equal(easeInOutSine(1), 1);
  assert.ok(Math.abs(easeInOutSine(0.5) - 0.5) < 1e-12);
  assert.equal(easeInOutSine(-3), 0);
  assert.equal(easeInOutSine(9), 1);
});

test('진행도: 일이 빨리 끝나도 최소 시간만큼 걸린다', () => {
  let prev = 0, elapsed = 0;
  const dt = 16;
  let reachedAt = null;
  while (elapsed < 5000 && reachedAt === null) {
    elapsed += dt;
    prev = introProgress({ elapsedMs: elapsed, minMs: 1600, workDone: 4, workTotal: 4, prev, dtMs: dt });
    if (prev >= 1) reachedAt = elapsed;
  }
  assert.ok(reachedAt >= 1600 && reachedAt <= 1600 + dt, `끝난 시각 ${reachedAt}`);
});

test('진행도: 일이 느리면 일이 끝나는 만큼만 가고, 끝나면 이어서 간다', () => {
  let prev = 0;
  // 시간은 충분히 지났는데 일이 2/4만 끝남
  for (let i = 0; i < 100; i++) prev = introProgress({ elapsedMs: 3000, minMs: 1600, workDone: 2, workTotal: 4, prev, dtMs: 16 });
  assert.ok(Math.abs(prev - 0.5) < 1e-9, `일 2/4: ${prev}`);
  for (let i = 0; i < 100; i++) prev = introProgress({ elapsedMs: 3000, minMs: 1600, workDone: 4, workTotal: 4, prev, dtMs: 16 });
  assert.equal(prev, 1);
});

test('진행도: 일이 한꺼번에 끝나도 한 프레임에 확 튀지 않고, 줄어들지도 않는다', () => {
  let prev = 0.25;
  const next = introProgress({ elapsedMs: 3000, minMs: 1600, workDone: 4, workTotal: 4, prev, dtMs: 16 });
  assert.ok(next > prev);
  assert.ok(next - prev <= (2.5 / 1600) * 16 + 1e-12);
  assert.equal(introProgress({ elapsedMs: 100, minMs: 1600, workDone: 0, workTotal: 4, prev: 0.4, dtMs: 16 }), 0.4);
});

test('진행도: 일 단계가 0개여도 시간만으로 끝난다', () => {
  assert.equal(introProgress({ elapsedMs: 1600, minMs: 1600, workDone: 0, workTotal: 0, prev: 0.999, dtMs: 100 }), 1);
});

test('간격이 0이거나 minMs가 0이어도 NaN이 나오지 않는다', () => {
  const e = spiralEnd({ remaining: 100, spacing: 0, coreRadius: 7 });
  assert.ok(Number.isFinite(e.theta) && Number.isFinite(e.radius));
  const p = introProgress({ elapsedMs: 0, minMs: 0, workDone: 2, workTotal: 4, prev: 0, dtMs: 16 });
  assert.ok(Number.isFinite(p), String(p));
  assert.ok(p <= 0.5 + 1e-9); // 일이 절반이면 절반까지만
});
