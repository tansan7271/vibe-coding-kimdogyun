const test = require('node:test');
const assert = require('node:assert');
const { focusRect } = require('./box-focus.js');

const bounds = { left: 0, top: 100, right: 1000, bottom: 700 };

test('가운데 근처 박스는 중심 그대로 커진다', () => {
  const r = focusRect({ box: { x: 500, y: 400 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.deepStrictEqual(r, { left: 400, top: 350, width: 200, height: 100 });
});

test('왼쪽 가장자리에 붙은 박스는 오른쪽으로 밀려 margin만큼 띄운다', () => {
  const r = focusRect({ box: { x: 30, y: 400 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.strictEqual(r.left, 10);
  assert.strictEqual(r.top, 350);
});

test('오른쪽 가장자리에 붙은 박스는 왼쪽으로 밀린다', () => {
  const r = focusRect({ box: { x: 990, y: 400 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.strictEqual(r.left + r.width, 990);
});

test('위쪽(헤더 아래)에 붙은 박스는 아래로, 아래쪽에 붙은 박스는 위로 밀린다', () => {
  const up = focusRect({ box: { x: 500, y: 100 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.strictEqual(up.top, 110);
  const down = focusRect({ box: { x: 500, y: 700 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.strictEqual(down.top + down.height, 690);
});

test('모서리 박스는 두 방향으로 모두 밀린다', () => {
  const r = focusRect({ box: { x: 0, y: 100 }, size: { w: 200, h: 100 }, bounds, margin: 0 });
  assert.deepStrictEqual(r, { left: 0, top: 100, width: 200, height: 100 });
});

test('보이는 영역보다 크면 영역 안으로 줄인다', () => {
  const r = focusRect({ box: { x: 500, y: 400 }, size: { w: 5000, h: 5000 }, bounds, margin: 10 });
  assert.deepStrictEqual(r, { left: 10, top: 110, width: 980, height: 580 });
});

test('어떤 위치에서도 결과가 영역 안에 있다', () => {
  for (let x = -50; x <= 1050; x += 50) for (let y = 0; y <= 800; y += 50) {
    const r = focusRect({ box: { x, y }, size: { w: 260, h: 220 }, bounds, margin: 12 });
    assert.ok(r.left >= 12 && r.left + r.width <= 988, `x=${x}`);
    assert.ok(r.top >= 112 && r.top + r.height <= 688, `y=${y}`);
  }
});
