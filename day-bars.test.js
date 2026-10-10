const test = require('node:test');
const assert = require('node:assert');
const { barsTop, fillRatio } = require('./day-bars.js');

const o = { budgetY: 500, gap: 16, clear: 56 };

test('카펫이 예산선 위에 있으면 막대는 예산선 밑 gap에 놓인다', () => {
  assert.strictEqual(barsTop({ ...o, carpetY: 100 }), 516);
  assert.strictEqual(barsTop({ ...o, carpetY: 400 }), 516);
});

test('카펫이 가까워져 그림자와 여백이 예산선 밑 자리를 넘으면 그때부터 따라 내려온다', () => {
  assert.strictEqual(barsTop({ ...o, carpetY: 444 }), 516); // 444 + 56 + 16 = 516: 딱 맞는 지점
  assert.ok(barsTop({ ...o, carpetY: 460 }) > 516);
});

test('따라 내려올 때 카펫과 막대 사이 간격은 카펫이 얼마나 처졌든 늘 같다(clear + gap)', () => {
  for (const y of [460, 500, 540, 700, 900, 1400]) assert.strictEqual(barsTop({ ...o, carpetY: y }) - y, 56 + 16, `y=${y}`);
});

test('카펫 높이에 따라 끊기지 않고 줄어들지 않으며 카펫보다 빨리 내려가지 않는다', () => {
  let prev = barsTop({ ...o, carpetY: 0 });
  for (let y = 1; y <= 1500; y++) {
    const t = barsTop({ ...o, carpetY: y });
    assert.ok(t >= prev, `y=${y}`);
    assert.ok(t - prev <= 1 + 1e-9, `y=${y} 한 번에 ${t - prev}만큼 뜀`);
    prev = t;
  }
});

test('막대는 언제나 카펫 선보다 아래에 있다', () => {
  for (let y = 0; y <= 1500; y += 10) assert.ok(barsTop({ ...o, carpetY: y }) > y, `y=${y}`);
});

test('fillRatio: 0~1로 자르고, 전체가 0 이하면 가득 찬다', () => {
  assert.strictEqual(fillRatio(5, 10), 0.5);
  assert.strictEqual(fillRatio(15, 10), 1);
  assert.strictEqual(fillRatio(-3, 10), 0);
  assert.strictEqual(fillRatio(0, 0), 1);
  assert.strictEqual(fillRatio(3, -1), 1);
});
