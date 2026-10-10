const { test } = require('node:test');
const assert = require('node:assert/strict');
const B = require('./barista-digits.js');

test('숫자 0~9 윤곽선이 모두 있다', () => {
  for (const ch of '0123456789') {
    const g = B.glyphs[ch];
    assert.ok(g, ch);
    assert.match(g.d, /^M/);
    assert.ok(g.d.length > 50);
    assert.ok(g.advance > 0);
    assert.ok(g.xMax > g.xMin);
  }
});

test('글자 크기 기준값이 폰트와 맞다', () => {
  assert.equal(B.unitsPerEm, 1000);
  assert.ok(B.digitHeight > 780 && B.digitHeight < 830);
  assert.ok(B.digitDepth >= 0 && B.digitDepth < 60);
});

test('한 글자는 x가 0이고 너비는 advance다', () => {
  const l = B.layout('7');
  assert.deepEqual(l.glyphs, [{ ch: '7', x: 0 }]);
  assert.equal(l.width, B.glyphs['7'].advance);
});

test('두 글자는 앞 글자 advance에 커닝을 더한 자리에 놓인다', () => {
  const l = B.layout('12');
  assert.equal(l.glyphs[1].x, B.glyphs['1'].advance + B.kern['12']);
  assert.ok(B.kern['12'] < 0, '1 뒤 2는 당겨진다');
  // 마지막 글자 뒤에는 커닝이 없다
  assert.equal(l.width, l.glyphs[1].x + B.glyphs['2'].advance);
});

test('필기체라 글자 모양의 오른쪽 끝이 펜 너비보다 클 수 있다', () => {
  const l = B.layout('10');
  assert.ok(l.right >= l.glyphs[1].x + B.glyphs['0'].xMax - 1e-9);
  assert.ok(l.right > l.width - 1);
});

test('커닝 표는 숫자 쌍만 가지고 있다', () => {
  assert.ok(Object.keys(B.kern).length > 50);
  for (const k of Object.keys(B.kern)) assert.match(k, /^\d\d$/);
});

test('숫자가 아닌 글자는 던진다', () => {
  assert.throws(() => B.layout('1월'), /숫자가 아닌/);
});

test('날짜로 쓰는 1~31 전부 그릴 수 있다', () => {
  for (let d = 1; d <= 31; d++) {
    const l = B.layout(String(d));
    assert.ok(l.width > 0 && l.right > 0, String(d));
  }
});
