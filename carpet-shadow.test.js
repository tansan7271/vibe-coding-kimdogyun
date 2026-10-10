const { test } = require('node:test');
const assert = require('node:assert/strict');
const Carpet = require('./carpet.js');
const { curveYs, falloffStops } = require('./carpet-shadow.js');

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('직선 조각은 그 구간의 높이를 그대로 돌려준다', () => {
  const ys = curveYs({ linePath: 'M 0 10 L 20 10', width: 20, step: 5 });
  assert.deepEqual(ys, [10, 10, 10, 10, 10]);
});

test('S자 곡선은 양 끝 높이에서 시작해 끝나고 가운데는 중간 높이다', () => {
  const ys = curveYs({ linePath: 'M 0 10 C 5 10 5 20 10 20', width: 10, step: 5 });
  near(ys[0], 10);
  near(ys[1], 15); // 대칭이라 정확히 가운데
  near(ys[2], 20);
});

test('S자 곡선 뒤에 이어진 직선(평평한 바닥)도 이어서 잰다', () => {
  const ys = curveYs({ linePath: 'M 0 10 C 5 10 5 20 10 20 L 20 20', width: 20, step: 5 });
  near(ys[0], 10); near(ys[1], 15); near(ys[2], 20); near(ys[3], 20); near(ys[4], 20);
});

test('실제 카펫 곡선: 양 끝은 baseY, 부하 0인 날은 baseY, 예산만큼 찬 날 바닥은 baseY+maxSag', () => {
  const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * 100, right: (i + 1) * 100 }));
  const s = Carpet.carpetShape({ loads: [0, 15, 0, 15, 0, 7.5, 0], capacity: 15, columns, width: 700, baseY: 40, maxSag: 300 });
  const ys = curveYs({ linePath: s.linePath, width: 700, step: 2 });
  assert.equal(ys.length, 351);
  near(ys[0], 40); near(ys[350], 40);
  near(ys[Math.round(150 / 2)], 340);   // 둘째 칸 가운데(예산만큼 참)
  near(ys[Math.round(50 / 2)], 40);     // 첫째 칸 가운데(부하 0)
  near(ys[Math.round(550 / 2)], 190);   // 여섯째 칸 가운데(절반)
  for (const y of ys) assert.ok(y >= 39.99 && y <= 340.01); // 곡선 밖으로 튀지 않는다
});

test('가로 범위가 간격으로 나누어떨어지지 않아도 마지막은 오른쪽 끝에서 잰다', () => {
  const ys = curveYs({ linePath: 'M 0 0 L 10 10', width: 10, step: 4 });
  assert.equal(ys.length, 4); // x = 0, 4, 8, 10
  near(ys[3], 10);
});

test('감쇠 곡선: 맨 위가 alpha, 맨 아래가 0이고 아래로 갈수록 줄기만 한다', () => {
  const st = falloffStops(0.22);
  assert.deepEqual(st[0], [0, 0.22]);
  assert.deepEqual(st[st.length - 1], [1, 0]);
  for (let i = 1; i < st.length; i++) { assert.ok(st[i][0] > st[i - 1][0]); assert.ok(st[i][1] <= st[i - 1][1]); }
});

test('감쇠 곡선의 불투명도는 0~1로 자른다', () => {
  assert.equal(falloffStops(3)[0][1], 1);
  assert.equal(falloffStops(-1)[0][1], 0);
});
