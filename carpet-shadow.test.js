const { test } = require('node:test');
const assert = require('node:assert/strict');
const Carpet = require('./carpet.js');
const { bandShape } = require('./carpet-shadow.js');

const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * 100, right: (i + 1) * 100 }));
const shapeOf = loads => Carpet.carpetShape({ loads, capacity: 15, columns, width: 700, baseY: 40, maxSag: 300 });
const make = (loads, extra = {}) => { const s = shapeOf(loads); return { s, b: bandShape({ points: s.points, linePath: s.linePath, width: 700, bottomY: 500, fadeLength: 160, alpha: 0.22, ...extra }) }; };

test('곡선 아래 영역은 곡선으로 시작해 오른쪽 아래, 왼쪽 아래를 지나 닫힌다', () => {
  const { s, b } = make([3, 8, 12, 5, 0, 15, 9]);
  assert.ok(b.clipD.startsWith(s.linePath));
  assert.ok(b.clipD.endsWith('L 700 500 L 0 500 Z'));
});

test('곡선 위쪽 영역은 곡선으로 시작해 가장 높은 곳보다 위에서 닫힌다', () => {
  const { s, b } = make([3, 8, 12, 5, 0, 15, 9]);
  assert.ok(b.aboveD.startsWith(s.linePath));
  assert.ok(b.aboveD.endsWith('L 700 30 L 0 30 Z')); // 가장 높은 곳(양 끝 baseY 40)보다 10 위
  assert.equal(b.top, 40);
});

test('사본은 곡선에서 fadeLength까지 고르게 아래로 옮긴다', () => {
  const { b } = make([5, 5, 5, 5, 5, 5, 5], { layers: 4 });
  assert.deepEqual(b.shifts, [40, 80, 120, 160]);
});

test('겹쳐 칠한 곡선 바로 아래의 불투명도가 alpha와 같다', () => {
  for (const layers of [1, 6, 18, 40]) {
    const { b } = make([5, 5, 5, 5, 5, 5, 5], { layers });
    const total = 1 - Math.pow(1 - b.layerAlpha, b.shifts.length); // 사본을 전부 겹친 불투명도
    assert.ok(Math.abs(total - 0.22) < 0.001, `layers ${layers}: ${total}`);
  }
});

test('깊이가 깊어질수록 겹치는 사본이 줄어 옅어진다', () => {
  const { b } = make([5, 5, 5, 5, 5, 5, 5], { layers: 10 });
  const coverAt = t => b.shifts.filter(sh => sh >= t).length; // 깊이 t에서 칠해지는 사본 수
  assert.ok(coverAt(1) > coverAt(80));
  assert.ok(coverAt(80) > coverAt(150));
  assert.equal(coverAt(161), 0); // fadeLength보다 깊으면 칠해지지 않는다
});

test('맨 아래가 가장 깊은 카펫보다 위면 그 깊이까지 늘린다', () => {
  const s = shapeOf([30, 30, 30, 30, 30, 30, 30]);
  const deepest = Math.max(...s.points.map(p => p.y));
  const b = bandShape({ points: s.points, linePath: s.linePath, width: 700, bottomY: 50, fadeLength: 160, alpha: 0.2 });
  assert.equal(b.bottom, deepest);
  assert.ok(b.clipD.endsWith(`L 700 ${deepest} L 0 ${deepest} Z`));
});

test('불투명도는 0~1로 자르고, fadeLength 0이면 모든 사본의 이동이 0이다', () => {
  const { b: hi } = make([5, 5, 5, 5, 5, 5, 5], { alpha: 3 });
  assert.ok(hi.layerAlpha > 0 && hi.layerAlpha <= 1);
  const { b: lo } = make([5, 5, 5, 5, 5, 5, 5], { alpha: -1 });
  assert.equal(lo.layerAlpha, 0);
  const { b: zero } = make([5, 5, 5, 5, 5, 5, 5], { fadeLength: 0, layers: 3 });
  assert.deepEqual(zero.shifts, [0, 0, 0]);
});
