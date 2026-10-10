const test = require('node:test');
const assert = require('node:assert');
const { zoneAt } = require('./box-drag.js');

const base = { width: 1400, edge: 72, topHeight: 92, page: { left: 0, width: 1400 } }; // 칸 폭 200

test('가운데 날짜칸은 칸 번호를 돌려준다', () => {
  assert.deepStrictEqual(zoneAt({ ...base, x: 50, y: 300 }), { zone: 'prev', col: -1 }); // 왼쪽 끝(72px)은 칸보다 우선
  assert.deepStrictEqual(zoneAt({ ...base, x: 100, y: 300 }), { zone: 'col', col: 0 });
  assert.deepStrictEqual(zoneAt({ ...base, x: 150 + 72, y: 300 }), { zone: 'col', col: 1 }); // 222px → 둘째 칸
  assert.deepStrictEqual(zoneAt({ ...base, x: 700, y: 300 }), { zone: 'col', col: 3 });
  assert.deepStrictEqual(zoneAt({ ...base, x: 1250, y: 300 }), { zone: 'col', col: 6 }); // 오른쪽 끝 구역은 1328px부터
});

test('첫째·마지막 칸은 가장자리 구역을 뺀 부분에서만 칸이다', () => {
  assert.strictEqual(zoneAt({ ...base, x: 71, y: 300 }).zone, 'prev');
  assert.deepStrictEqual(zoneAt({ ...base, x: 72, y: 300 }), { zone: 'col', col: 0 });
  assert.deepStrictEqual(zoneAt({ ...base, x: 1328, y: 300 }), { zone: 'col', col: 6 });
  assert.strictEqual(zoneAt({ ...base, x: 1329, y: 300 }).zone, 'next');
});

test('위쪽은 모서리까지 포함해 가장 우선이다(취소)', () => {
  assert.strictEqual(zoneAt({ ...base, x: 700, y: 10 }).zone, 'cancel');
  assert.strictEqual(zoneAt({ ...base, x: 5, y: 50 }).zone, 'cancel');
  assert.strictEqual(zoneAt({ ...base, x: 1395, y: 91 }).zone, 'cancel');
  assert.strictEqual(zoneAt({ ...base, x: 5, y: 92 }).zone, 'prev'); // 헤더 아래부터는 가장자리 구역
});

test('날짜칸의 세로 위치는 상관없다(아래로 멀리 내려가도 같은 칸)', () => {
  assert.deepStrictEqual(zoneAt({ ...base, x: 700, y: 120 }), { zone: 'col', col: 3 });
  assert.deepStrictEqual(zoneAt({ ...base, x: 700, y: 5000 }), { zone: 'col', col: 3 });
});

test('페이지가 화면 한쪽으로 밀려 있으면 그 위치를 기준으로 칸을 센다(슬라이드 중)', () => {
  const shifted = { ...base, page: { left: 400, width: 1400 } };
  assert.deepStrictEqual(zoneAt({ ...shifted, x: 500, y: 300 }), { zone: 'col', col: 0 });
  assert.deepStrictEqual(zoneAt({ ...shifted, x: 300, y: 300 }), { zone: 'none', col: -1 }); // 페이지 밖(칸 없음)
});

test('좁은 화면에서도 같은 규칙이다', () => {
  const narrow = { width: 390, edge: 72, topHeight: 92, page: { left: 0, width: 390 } }; // 칸 폭 약 55.7
  assert.strictEqual(zoneAt({ ...narrow, x: 100, y: 300 }).col, 1);
  assert.strictEqual(zoneAt({ ...narrow, x: 300, y: 300 }).col, 5);
});

test('모든 위치가 정확히 한 구역에 속한다', () => {
  for (let x = 0; x < 1400; x += 7) for (let y = 0; y < 400; y += 9) {
    const z = zoneAt({ ...base, x, y });
    assert.ok(['cancel', 'prev', 'next', 'col'].includes(z.zone), `${x},${y}`);
    if (z.zone === 'col') assert.ok(z.col >= 0 && z.col <= 6);
    else assert.strictEqual(z.col, -1);
  }
});
