const { test } = require('node:test');
const assert = require('node:assert/strict');
const B = require('./box-icons.js');

test('쓰는 아이콘 3개의 경로가 모두 있다', () => {
  for (const name of ['load', 'time', 'push']) {
    assert.ok(typeof B.paths[name] === 'string' && B.paths[name].length > 40, name);
    assert.match(B.paths[name], /^[Mm]/);
  }
});

test('도장 윤곽선은 닫힌 하나의 경로다', () => {
  const d = B.sealPath();
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
  assert.equal((d.match(/M/g) || []).length, 1);
  assert.equal(d.split('L').length, 360);
});

test('도장 반지름은 안쪽과 바깥 사이를 오가고, 가장자리가 lobes번 물결친다', () => {
  const outer = 48, depth = 0.12, lobes = 18;
  const d = B.sealPath(lobes, outer, depth, 720);
  const pts = d.slice(1, -1).split('L').map(p => p.split(' ').map(Number));
  const rs = pts.map(([x, y]) => Math.hypot(x, y));
  assert.ok(Math.max(...rs) <= outer + 0.1 && Math.min(...rs) >= outer * (1 - depth) - 0.1);
  // 반지름이 평균을 위로 가로지르는 횟수가 lobes다
  const mean = (Math.max(...rs) + Math.min(...rs)) / 2;
  let crossings = 0;
  for (let i = 0; i < rs.length; i++) if (rs[i] < mean && rs[(i + 1) % rs.length] >= mean) crossings++;
  assert.equal(crossings, lobes);
});

test('lobes를 바꾸면 모양이 달라진다', () => {
  assert.notEqual(B.sealPath(12), B.sealPath(20));
});
