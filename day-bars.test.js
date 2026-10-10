const test = require('node:test');
const assert = require('node:assert');
const { barsTop, fillRatio } = require('./day-bars.js');

const o = { budgetY: 500, gap: 16, clear: 160 };

test('카펫이 예산선 위에 있으면 막대는 예산선 밑 gap에 놓인다', () => {
  assert.strictEqual(barsTop({ ...o, carpetY: 100 }), 516);
  assert.strictEqual(barsTop({ ...o, carpetY: 500 }), 516);
});

test('카펫이 선 밑으로 처지면 막대가 따라 내려온다', () => {
  assert.ok(barsTop({ ...o, carpetY: 540 }) > 516);
});

test('카펫이 선 밑으로 clear 넘게 처지면 카펫 + clear + gap(그림자 밑 같은 여백)이다', () => {
  assert.strictEqual(barsTop({ ...o, carpetY: 700 }), 700 + 160 + 16);
  assert.strictEqual(barsTop({ ...o, carpetY: 900 }), 900 + 160 + 16);
});

test('카펫 높이에 따라 끊기지 않고 줄어들지 않는다', () => {
  let prev = barsTop({ ...o, carpetY: 0 });
  for (let y = 1; y <= 1000; y++) {
    const t = barsTop({ ...o, carpetY: y });
    assert.ok(t >= prev, `y=${y}`);
    assert.ok(t - prev <= 2 + 1e-9, `y=${y} 한 번에 ${t - prev}만큼 뜀`);
    prev = t;
  }
});

test('막대는 언제나 카펫 선보다 아래에 있다', () => {
  for (let y = 0; y <= 1000; y += 10) assert.ok(barsTop({ ...o, carpetY: y }) > y, `y=${y}`);
});

test('fillRatio: 0~1로 자르고, 전체가 0 이하면 가득 찬다', () => {
  assert.strictEqual(fillRatio(5, 10), 0.5);
  assert.strictEqual(fillRatio(15, 10), 1);
  assert.strictEqual(fillRatio(-3, 10), 0);
  assert.strictEqual(fillRatio(0, 0), 1);
  assert.strictEqual(fillRatio(3, -1), 1);
});
