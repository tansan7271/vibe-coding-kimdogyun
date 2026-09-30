const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carpetShape } = require('./carpet.js');

// 폭 700, 7칸, 칸 사이 간격 10 (칸 폭 90)
const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * 100, right: i * 100 + 90 }));
const base = { capacity: 10, columns, width: 690, baseY: 10, maxSag: 60, thickness: 12 };

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

test('구분선은 칸 사이 가운데, 경로는 닫힌 도형이고 숫자가 유한하다', () => {
  const s = carpetShape({ ...base, loads: [1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual(s.dividers, [95, 195, 295, 395, 495, 595]);
  assert.ok(s.ribbonPath.startsWith('M 0 10'));
  assert.ok(s.ribbonPath.endsWith('Z'));
  assert.ok(!/NaN|Infinity/.test(s.ribbonPath));
});

test('곡선이 묶인 높이 위로 솟거나 최대 처짐 아래로 넘치지 않는다', () => {
  const s = carpetShape({ ...base, loads: [0, 10, 0, 10, 0, 10, 0] });
  const nums = s.ribbonPath.split('M')[1].split(/[CLZ]/).join(' ').trim().split(/\s+/).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1); // x y 쌍에서 y만
  assert.ok(Math.min(...ys) >= 10 - 1e-9);
  assert.ok(Math.max(...ys) <= 10 + 60 + 12 + 1e-9);
});
