const test = require('node:test');
const assert = require('node:assert');
const { focusRect } = require('./box-focus.js');

const bounds = { left: 0, top: 100, right: 1000, bottom: 700 };

test('가운데 근처 박스는 중심 그대로 커진다', () => {
  const r = focusRect({ box: { x: 500, y: 400 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.deepStrictEqual({ left: r.left, top: r.top, width: r.width, height: r.height }, { left: 400, top: 350, width: 200, height: 100 });
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
  assert.deepStrictEqual({ left: r.left, top: r.top, width: r.width, height: r.height }, { left: 0, top: 100, width: 200, height: 100 });
});

test('보이는 영역보다 크면 영역 안으로 줄인다', () => {
  const r = focusRect({ box: { x: 500, y: 400 }, size: { w: 5000, h: 5000 }, bounds, margin: 10 });
  assert.deepStrictEqual({ left: r.left, top: r.top, width: r.width, height: r.height }, { left: 10, top: 110, width: 980, height: 580 });
});

test('어떤 위치에서도 결과가 영역 안에 있다', () => {
  for (let x = -50; x <= 1050; x += 50) for (let y = 0; y <= 800; y += 50) {
    const r = focusRect({ box: { x, y }, size: { w: 260, h: 220 }, bounds, margin: 12 });
    assert.ok(r.left >= 12 && r.left + r.width <= 988, `x=${x}`);
    assert.ok(r.top >= 112 && r.top + r.height <= 688, `y=${y}`);
  }
});

// ---- 원래 박스 자리를 덮기(cover) ----
const inside = (r, b, m) => r.left >= b.left + m && r.left + r.width <= b.right - m && r.top >= b.top + m && r.top + r.height <= b.bottom - m;
const covers = (r, box, c) => r.left <= box.x - c.w / 2 && r.left + r.width >= box.x + c.w / 2 && r.top <= box.y - c.h / 2 && r.top + r.height >= box.y + c.h / 2;

test('cover가 없으면 바탕과 내용 자리가 같다', () => {
  const r = focusRect({ box: { x: 30, y: 400 }, size: { w: 200, h: 100 }, bounds, margin: 10 });
  assert.strictEqual(r.left, 10);
  assert.deepStrictEqual(r.content, { left: r.left, top: r.top, width: r.width, height: r.height });
});

test('가장자리로 밀려도 내용이 원래 박스를 덮고, 바탕도 내용과 같다', () => {
  const box = { x: 70, y: 400 }, cover = { w: 100, h: 140 };
  const r = focusRect({ box, size: { w: 250, h: 160 }, bounds, margin: 12, cover });
  assert.ok(covers(r.content, box, cover), JSON.stringify(r));
  assert.ok(inside(r.content, bounds, 12));
  assert.deepStrictEqual({ left: r.left, top: r.top, width: r.width, height: r.height }, r.content);
});

test('원래 박스가 원하는 크기보다 크면 바탕이 그만큼 커진다(내용은 그대로)', () => {
  const r = focusRect({ box: { x: 500, y: 400 }, size: { w: 250, h: 100 }, bounds, margin: 10, cover: { w: 300, h: 200 } });
  assert.strictEqual(r.width, 300);
  assert.strictEqual(r.height, 200);
  assert.strictEqual(r.content.width, 250);
  assert.strictEqual(r.content.height, 100);
});

test('영역 안의 모든 위치에서 내용은 영역 안, 바탕은 원래 박스를 덮는다', () => {
  const cover = { w: 110, h: 90 };
  for (let x = 70; x <= 930; x += 40) for (let y = 160; y <= 640; y += 40) {
    const box = { x, y }, r = focusRect({ box, size: { w: 250, h: 150 }, bounds, margin: 12, cover });
    assert.ok(inside(r.content, bounds, 12), `inside ${x},${y}`);
    assert.ok(covers(r, box, cover), `cover ${x},${y}`);
  }
});

test('원래 박스가 영역 밖(아래)으로 길게 내려가 있어도 내용은 영역 안, 바탕은 원래 박스까지 덮는다', () => {
  const box = { x: 300, y: 640 }, cover = { w: 110, h: 240 }; // 원래 박스 세로 520~760, 영역 아래는 700
  const r = focusRect({ box, size: { w: 250, h: 150 }, bounds, margin: 12, cover });
  assert.ok(inside(r.content, bounds, 12), JSON.stringify(r));
  assert.ok(covers(r, box, cover), JSON.stringify(r));
  assert.ok(r.top + r.height >= 760);
});

test('원래 박스가 위로 영역 밖(헤더 밑)에 걸쳐도 같다', () => {
  const box = { x: 500, y: 90 }, cover = { w: 100, h: 100 };
  const r = focusRect({ box, size: { w: 250, h: 100 }, bounds, margin: 10, cover });
  assert.ok(inside(r.content, bounds, 10));
  assert.ok(covers(r, box, cover));
});
