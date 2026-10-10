const test = require('node:test');
const assert = require('node:assert');
const { diffBoxes } = require('./box-diff.js');

const box = (id, col, load, extra = {}) => ({ id, col, load, kind: 'todo', title: id, goal: '', minutes: 60, push: 0, ...extra });

test('같은 목록이면 바뀌지 않았고 떨어뜨릴 것도 없다', () => {
  const a = [box('a', 0, 2), box('b', 1, 3)];
  assert.deepStrictEqual(diffBoxes(a, a.map(b => ({ ...b }))), { changed: false, drop: [], removed: [], edited: [] });
});

test('빈 목록끼리도 바뀌지 않았다', () => {
  assert.deepStrictEqual(diffBoxes([], []), { changed: false, drop: [], removed: [], edited: [] });
});

test('새 박스는 떨어뜨린다', () => {
  const r = diffBoxes([box('a', 0, 2)], [box('a', 0, 2), box('b', 1, 3)]);
  assert.deepStrictEqual(r, { changed: true, drop: ['b'], removed: [], edited: [] });
});

test('없어진 박스만 있으면 바뀌었지만 떨어뜨릴 것은 없다', () => {
  const r = diffBoxes([box('a', 0, 2), box('b', 1, 3)], [box('a', 0, 2)]);
  assert.deepStrictEqual(r, { changed: true, drop: [], removed: ['b'], edited: [] });
});

test('다른 날로 옮긴 박스와 크기가 바뀐 박스는 떨어뜨린다', () => {
  const r = diffBoxes([box('a', 0, 2), box('b', 1, 3), box('c', 2, 1)], [box('a', 4, 2), box('b', 1, 5), box('c', 2, 1)]);
  assert.deepStrictEqual(r, { changed: true, drop: ['a', 'b'], removed: [], edited: [] });
});

test('제목·시간·밀림만 바뀌면 바뀌었지만 떨어뜨리지 않는다', () => {
  assert.deepStrictEqual(diffBoxes([box('a', 0, 2)], [box('a', 0, 2, { title: '새 제목' })]), { changed: true, drop: [], removed: [], edited: ['a'] });
  assert.deepStrictEqual(diffBoxes([box('a', 0, 2)], [box('a', 0, 2, { minutes: 90 })]), { changed: true, drop: [], removed: [], edited: ['a'] });
  assert.deepStrictEqual(diffBoxes([box('a', 0, 2)], [box('a', 0, 2, { push: 1 })]), { changed: true, drop: [], removed: [], edited: ['a'] });
});

test('떨어뜨리는 시각(at)만 다르면 바뀐 것으로 보지 않는다', () => {
  assert.deepStrictEqual(diffBoxes([box('a', 0, 2, { at: 10 })], [box('a', 0, 2)]), { changed: false, drop: [], removed: [], edited: [] });
});

test('목록 순서가 달라도 내용이 같으면 바뀌지 않았다', () => {
  assert.deepStrictEqual(diffBoxes([box('a', 0, 2), box('b', 1, 3)], [box('b', 1, 3), box('a', 0, 2)]), { changed: false, drop: [], removed: [], edited: [] });
});

test('옮겨지거나 크기가 바뀐 박스는 edited가 아니라 drop에만 들어간다', () => {
  const r = diffBoxes([box('a', 0, 2, { title: 'x' })], [box('a', 3, 2, { title: 'y' })]);
  assert.deepStrictEqual(r, { changed: true, drop: ['a'], removed: [], edited: [] });
});

test('없어진 박스와 새 박스가 함께 있으면 둘 다 알려 준다', () => {
  const r = diffBoxes([box('a', 0, 2), box('b', 1, 3)], [box('b', 1, 3), box('c', 2, 1)]);
  assert.deepStrictEqual(r, { changed: true, drop: ['c'], removed: ['a'], edited: [] });
});
