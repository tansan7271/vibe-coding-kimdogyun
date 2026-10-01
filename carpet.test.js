const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carpetShape } = require('./carpet.js');

// 폭 700, 7칸, 칸 사이 간격 10 (칸 폭 90)
const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * 100, right: i * 100 + 90 }));
const base = { capacity: 10, columns, width: 690, baseY: 10, maxSag: 60 };

test('부하가 전부 0이면 카펫은 평평하다 (첫 사용)', () => {
  const s = carpetShape({ ...base, loads: [0, 0, 0, 0, 0, 0, 0] });
  assert.ok(s.points.every(p => p.y === 10));
  assert.ok(s.sags.every(v => v === 0));
});

test('양 끝은 처지지 않는 높이에 묶이고, 날짜 점은 칸 가운데에 온다', () => {
  const s = carpetShape({ ...base, loads: [10, 10, 10, 10, 10, 10, 10] });
  assert.deepEqual(s.points[0], { x: 0, y: 10 });
  assert.deepEqual(s.points[8], { x: 690, y: 10 });
  assert.equal(s.points[1].x, 45);
  assert.equal(s.points[7].x, 645);
});

test('부하가 클수록 더 아래로 처진다 (y가 커진다)', () => {
  const s = carpetShape({ ...base, loads: [0, 2, 5, 8, 10, 3, 0] });
  const ys = s.points.slice(1, 8).map(p => p.y);
  assert.equal(ys[0], 10);
  assert.equal(ys[1], 10 + 0.2 * 60);
  assert.equal(ys[2], 10 + 0.5 * 60);
  assert.ok(ys[1] < ys[2] && ys[2] < ys[3] && ys[3] < ys[4]);
});

test('예산을 넘어도 처짐은 예산에서 멈춘다', () => {
  const s = carpetShape({ ...base, loads: [10, 12, 30, 0, 0, 0, 0] });
  assert.equal(s.points[1].y, 70);
  assert.equal(s.points[2].y, 70);
  assert.equal(s.points[3].y, 70);
});

test('예산이 0 이하여도 깨지지 않고 평평하다', () => {
  const s = carpetShape({ ...base, capacity: 0, loads: [3, 3, 3, 3, 3, 3, 3] });
  assert.ok(s.points.every(p => p.y === 10));
});

test('날짜마다 카드 가운데 기준 평평한 바닥이 있고 높이는 부하를 따른다', () => {
  const s = carpetShape({ ...base, loads: [0, 5, 10, 0, 0, 0, 0] });
  // 칸 폭 90, 비율 0.6 -> 바닥 폭 54, 칸 가운데 45 -> 18 ~ 72
  assert.equal(s.floors[1].x1, 118);
  assert.equal(s.floors[1].x2, 172);
  assert.equal(s.floors[0].y, 10);
  assert.equal(s.floors[1].y, 40);
  assert.equal(s.floors[2].y, 70);
  assert.ok(s.linePath.includes('L 172 40'));
});

test('바닥 사이는 곡선이고 수평 접선이라 두 바닥 높이 밖으로 넘치지 않는다', () => {
  const s = carpetShape({ ...base, loads: [0, 10, 0, 10, 0, 10, 0] });
  const ys = s.linePath.split(/[MCL]/).join(' ').trim().split(/\s+/).map(Number).filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...ys) >= 10 - 1e-9);
  assert.ok(Math.max(...ys) <= 70 + 1e-9);
  assert.ok(s.linePath.includes('C'));
  assert.ok(!s.linePath.includes('Z'));
});

test('구분선은 칸 사이 가운데, 경로 숫자가 유한하다', () => {
  const s = carpetShape({ ...base, loads: [1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual(s.dividers, [95, 195, 295, 395, 495, 595]);
  assert.ok(s.linePath.startsWith('M 0 10'));
  assert.ok(!/NaN|Infinity/.test(s.linePath));
});

test('격자: 눈금 높이는 카펫 바닥 높이와 같은 식이고 예산선이 맨 아래다', () => {
  const s = carpetShape({ ...base, loads: [5, 0, 0, 0, 0, 0, 0], safeRatio: 0.8 });
  assert.equal(s.gridLines.length, 11); // 0..10
  assert.equal(s.gridLines[0].y, 10);
  const five = s.gridLines.find(g => g.value === 5);
  assert.equal(five.y, s.floors[0].y); // 부하 5인 날의 바닥과 눈금 5가 일치
  const last = s.gridLines[s.gridLines.length - 1];
  assert.equal(last.value, 10);
  assert.equal(last.isBudget, true);
  assert.equal(last.y, 70);
  assert.deepEqual(s.gridLines.filter(g => g.label).map(g => g.value), [0, 5, 10]);
  assert.equal(s.safeLine.value, 8);
  assert.equal(s.safeLine.y, 10 + 0.8 * 60);
});

test('격자: 예산이 작거나 크거나 0이어도 깨지지 않는다', () => {
  const small = carpetShape({ ...base, capacity: 7, loads: [0, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(small.gridLines.map(g => g.value), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(small.gridLines.filter(g => g.label).map(g => g.value), [0, 5, 7]);
  const big = carpetShape({ ...base, capacity: 20, loads: [0, 0, 0, 0, 0, 0, 0] });
  assert.equal(big.gridLines[1].value, 2);
  const zero = carpetShape({ ...base, capacity: 0, loads: [0, 0, 0, 0, 0, 0, 0] });
  assert.deepEqual(zero.gridLines, []);
  assert.equal(zero.safeLine, null);
  assert.equal(carpetShape({ ...base, loads: [0, 0, 0, 0, 0, 0, 0] }).safeLine, null); // safeRatio 없음
});

test('곡선·격자 인자를 안 주면 기본 모양이 그대로다', () => {
  const loads = [0, 5, 10, 3, 0, 0, 0];
  const a = carpetShape({ ...base, loads });
  const b = carpetShape({ ...base, loads, curve: 0.5, flatRatio: 0.6, gridMaxLines: 10, gridLabelEvery: 5 });
  assert.deepEqual(a, b);
});

test('curve가 0이면 제어점이 끝점에 붙어 직선이 되고, 격자 인자가 간격을 바꾼다', () => {
  const s = carpetShape({ ...base, loads: [0, 10, 0, 0, 0, 0, 0], curve: 0 });
  assert.match(s.linePath, /C 0 10 /);
  const g = carpetShape({ ...base, capacity: 20, loads: [0, 0, 0, 0, 0, 0, 0], gridMaxLines: 5 });
  assert.equal(g.gridLines.length, 6); // 0,4,...,16 + 예산선
});

test('매듭: 안전선 이하는 기본 간격, 넘으면 벌어지고 예산에서 최대, 예산 초과만 흔들린다', () => {
  const s = carpetShape({ ...base, safeRatio: 0.8, knotSpacing: 10, knotStretch: 3, loads: [0, 8, 9, 10, 12, 0, 0] });
  const gap = seg => seg.knots[1] - seg.knots[0];
  assert.deepEqual(s.segments.map(x => x.stretch), [0, 0, 0.5, 1, 1, 0, 0]);
  assert.deepEqual(s.segments.map(x => x.overBudget), [false, false, false, false, true, false, false]);
  assert.equal(gap(s.segments[1]), 10); // 안전선과 같으면 아직 초과 아님
  assert.equal(gap(s.segments[2]), 20);
  assert.equal(s.segments[3].knots.length, 2); // 예산: 간격 30, 바닥 폭 54
  assert.equal(s.segments[3].knots[1] - s.segments[3].knots[0], 30);
  assert.equal(s.segments[4].knots[1] - s.segments[4].knots[0], 30); // 예산을 넘어도 더 벌어지지 않는다
});

test('매듭: 칸 가운데 기준 대칭, 안전선·예산 정보가 없으면 벌어지지 않는다 (첫 사용)', () => {
  const s = carpetShape({ ...base, loads: [0, 0, 0, 0, 0, 0, 0] });
  s.segments.forEach((seg, i) => {
    assert.equal(seg.stretch, 0);
    assert.equal(seg.knots[0] + seg.knots.at(-1), 2 * (i * 100 + 45));
  });
  const z = carpetShape({ ...base, capacity: 0, loads: [5, 5, 5, 5, 5, 5, 5] });
  assert.ok(z.segments.every(x => !x.overBudget && x.stretch === 0));
});

test('구간 경로는 날짜 수만큼이고 꼬리 경로가 오른쪽 끝에 닿는다', () => {
  const s = carpetShape({ ...base, loads: [1, 2, 3, 4, 5, 6, 7] });
  assert.equal(s.segments.length, 7);
  assert.match(s.segments[0].path, /^M 0 10 C /);
  assert.match(s.tailPath, / 690 10$/);
});
