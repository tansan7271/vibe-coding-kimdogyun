const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('./carpet-physics.js');

const colW = 170;
const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * colW, right: (i + 1) * colW }));
const capacity = 10, maxSag = 400, baseY = 200;
const unit = maxSag / capacity; // 부하 1 = 눈금 한 칸

function world(extra = {}) {
  return P.createWorld({ columns, capacity, maxSag, baseY, ...extra });
}
function drop(w, id, col, load, { dx = 0, width = 120, y = -200 } = {}) {
  const c = columns[col];
  return P.addBox(w, { id, col, x: (c.left + c.right) / 2 + dx, y, w: width, h: load * unit, load });
}

test('떨어뜨린 박스는 한 번쯤 튕기고 카펫 위에 정착한다', () => {
  const w = world();
  const b = drop(w, 'a', 2, 2);
  let bounced = false, prevVy = 0;
  for (let i = 0; i < 12 * 120 && !w.settled; i++) {
    P.step(w, w.p.dt);
    if (prevVy > 100 && b.vy < 0) bounced = true;
    prevVy = b.vy;
  }
  assert.ok(w.settled, '정착해야 한다');
  assert.ok(bounced, '부딪힌 뒤 위로 튕겨야 한다');
  // 박스 바닥이 (처진) 카펫 바닥에 닿아 있다
  assert.ok(Math.abs(b.y + b.h / 2 - P.floorY(w, 2)) < 1, `바닥 ${b.y + b.h / 2} vs ${P.floorY(w, 2)}`);
});

test('카펫은 쌓인 부하 / 예산 × maxSag 만큼 처지고, 더미 꼭대기가 처음 카펫 선에 맞는다', () => {
  const w = world();
  drop(w, 'a', 3, 3);
  P.settle(w);
  assert.ok(w.settled);
  assert.ok(Math.abs(w.sag[3] - 3 * unit) < 1, `처짐 ${w.sag[3]}`);
  const b = w.boxes[0];
  assert.ok(Math.abs(b.y - b.h / 2 - baseY) < 1.5, `꼭대기 ${b.y - b.h / 2}`);
  // 다른 날짜 카펫은 그대로
  assert.ok(Math.abs(w.sag[0]) < 0.5);
});

test('박스끼리 쌓인다: 위 박스는 아래 박스 위에 얹히고 겹치지 않는다', () => {
  const w = world();
  const a = drop(w, 'a', 1, 2);
  const b = drop(w, 'b', 1, 1, { y: -600 });
  P.settle(w);
  assert.ok(w.settled);
  const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
  assert.ok(!(ox > 1 && oy > 1), `겹침 ${ox},${oy}`);
  const lower = a.y > b.y ? a : b, upper = lower === a ? b : a;
  assert.ok(Math.abs(upper.y + upper.h / 2 - (lower.y - lower.h / 2)) < 2, '위 박스 바닥이 아래 박스 윗면에 닿는다');
  assert.ok(Math.abs(w.sag[1] - 3 * unit) < 1.5);
});

test('예산을 넘으면 카펫은 maxSag에서 멈추고 더미가 처음 카펫 선 위로 솟는다', () => {
  const w = world();
  drop(w, 'a', 4, 6);
  drop(w, 'b', 4, 6, { y: -900 });
  P.settle(w);
  assert.ok(w.settled);
  assert.ok(Math.abs(w.sag[4] - maxSag) < 1.5, `처짐 ${w.sag[4]}`);
  const top = Math.min(...w.boxes.map(b => b.y - b.h / 2));
  // 부하 12, 예산 10: 더미 높이 480, 바닥은 baseY+maxSag(600) -> 꼭대기 120(처음 카펫 선 200보다 80 위)
  assert.ok(Math.abs(top - (baseY + maxSag - 12 * unit)) < 3 && top < baseY - 50, `꼭대기 ${top}`);
});

test('박스는 자기 날짜 칸을 벗어나지 않고, 열끼리는 서로 영향이 없다', () => {
  const w = world();
  const a = drop(w, 'a', 0, 1, { dx: -500, width: 150 }); // 칸 밖에서 시작해도 안으로 들어온다
  a.vx = -800;
  const b = drop(w, 'b', 5, 2);
  P.settle(w);
  assert.ok(a.x - a.w / 2 >= columns[0].left - 1e-6 && a.x + a.w / 2 <= columns[0].right + 1e-6);
  assert.ok(b.x - b.w / 2 >= columns[5].left - 1e-6 && b.x + b.w / 2 <= columns[5].right + 1e-6);
  assert.ok(Math.abs(w.sag[0] - 1 * unit) < 1.5 && Math.abs(w.sag[5] - 2 * unit) < 1.5);
});

test('lockX 박스는 옆에서 다른 박스가 부딪혀도 가로로 움직이지 않고, 위아래로는 똑같이 떨어져 눌린다', () => {
  const w = world();
  const mid = (columns[2].left + columns[2].right) / 2;
  const base = P.addBox(w, { id: 'base', col: 2, x: mid, y: -200, w: 100, h: 2 * unit, load: 2, lockX: true, vx: 500 });
  // 바닥 박스의 옆을 때리며 떨어지는 박스, 그 위에 떨어지는 박스
  P.addBox(w, { id: 'side', col: 2, x: mid + 70, y: -400, w: 110, h: unit, load: 1, vx: -300 });
  P.addBox(w, { id: 'top', col: 2, x: mid - 40, y: -900, w: 90, h: unit, load: 1 });
  P.settle(w, 20);
  assert.ok(w.settled);
  assert.equal(base.x, mid, '가로로 움직이지 않는다');
  assert.equal(base.vx, 0);
  assert.ok(Math.abs(base.y + base.h / 2 - P.floorY(w, 2)) < 1.5, '카펫 바닥에 닿아 있다');
  assert.ok(Math.abs(w.sag[2] - 4 * unit) < 1.5, '부하 합만큼 카펫이 처진다');
  const bs = w.boxes;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const ox = (bs[i].w + bs[j].w) / 2 - Math.abs(bs[i].x - bs[j].x), oy = (bs[i].h + bs[j].h) / 2 - Math.abs(bs[i].y - bs[j].y);
    assert.ok(!(ox > 2 && oy > 2), `${bs[i].id}와 ${bs[j].id} 겹침`);
  }
});

test('받침이 모자란 박스는 옆으로 미끄러져 내려와 바닥에 닿는다', () => {
  const w = world();
  const a = drop(w, 'a', 2, 1, { width: 90, dx: -30 });
  const b = drop(w, 'b', 2, 1, { width: 120, dx: 30, y: -700 });
  P.settle(w, 20);
  assert.ok(w.settled);
  // 둘 다 서로 겹치지 않고, 어느 쪽도 허공에 떠 있지 않다(정착했다)
  const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
  assert.ok(!(ox > 1 && oy > 1));
});

test('같은 입력은 항상 같은 결과다(결정적)', () => {
  const run = () => {
    const w = world();
    drop(w, 'a', 1, 2, { dx: -20 });
    drop(w, 'b', 1, 3, { dx: 25, y: -500 });
    drop(w, 'c', 3, 1);
    P.settle(w);
    return w.boxes.map(b => [b.x, b.y]).concat([w.sag]);
  };
  assert.deepEqual(run(), run());
});

test('카펫은 충격으로 목표보다 더 깊이 눌렸다가 돌아온다(바운스)', () => {
  const w = world();
  drop(w, 'a', 2, 4, { y: -600 });
  let maxSagSeen = 0;
  for (let i = 0; i < 6 * 120; i++) { P.step(w, w.p.dt); maxSagSeen = Math.max(maxSagSeen, w.sag[2]); }
  P.settle(w);
  assert.ok(maxSagSeen > 4 * unit + 3, `최대 ${maxSagSeen} vs 목표 ${4 * unit}`);
  assert.ok(Math.abs(w.sag[2] - 4 * unit) < 1.5);
});

test('박스가 떨어진 충격이 카펫을 흔든다(impactKick). 충격을 끄면 덜 눌린다', () => {
  const maxSagWith = kick => {
    const w = world({ params: { impactKick: kick } });
    drop(w, 'a', 2, 3, { y: -800 });
    let m = 0;
    for (let i = 0; i < 4 * 120; i++) { P.step(w, w.p.dt); m = Math.max(m, w.sag[2]); }
    return m;
  };
  assert.ok(maxSagWith(0.9) > maxSagWith(0) + 2, `충격 있음 ${maxSagWith(0.9)} vs 없음 ${maxSagWith(0)}`);
});

test('advance는 고정 간격으로 진행하고, 정착하면 멈춘다', () => {
  const w = world();
  drop(w, 'a', 0, 1);
  let total = 0;
  for (let i = 0; i < 1200 && !w.settled; i++) total += P.advance(w, 16.7);
  assert.ok(w.settled);
  assert.equal(P.advance(w, 1000), 0, '정착한 뒤에는 계산하지 않는다');
  assert.ok(total > 0);
});

test('아무것도 없으면 처음부터 정착 상태로 끝난다', () => {
  const w = world();
  assert.ok(P.settle(w, 2));
  assert.ok(w.sag.every(v => v === 0));
});

test('박스가 많아도(40개) 시간 안에 정착하고, 겹치거나 튀어나가지 않는다', () => {
  const w = world();
  // 결정적인 난수(고정 시드): 같은 값이 나온다
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const spawned = columns.map(() => 0);
  for (let i = 0; i < 40; i++) {
    const col = Math.floor(rnd() * 7);
    const load = 1 + Math.floor(rnd() * 3);
    const width = 90 + rnd() * 60;
    const dx = (rnd() - 0.5) * (colW - width);
    // 같은 열에서 먼저 떨어뜨린 박스 위쪽에서 시작해 처음부터 겹치지 않게 한다
    const y = -200 - spawned[col];
    spawned[col] += load * unit + 10;
    drop(w, 'b' + i, col, load, { dx, width, y });
  }
  const ok = P.settle(w, 30);
  assert.ok(ok, `30초 안에 정착하지 않음. 가장 빠른 박스 속도 ${Math.max(...w.boxes.map(b => Math.abs(b.vy)))}`);
  w.boxes.forEach(b => {
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    const c = columns[b.col];
    assert.ok(b.x - b.w / 2 >= c.left - 1e-6 && b.x + b.w / 2 <= c.right + 1e-6, '칸 안');
    assert.ok(b.y + b.h / 2 <= P.floorY(w, b.col) + 1.5, '카펫 아래로 빠지지 않음');
  });
  for (let i = 0; i < w.boxes.length; i++) {
    for (let j = i + 1; j < w.boxes.length; j++) {
      const a = w.boxes[i], b = w.boxes[j];
      if (a.col !== b.col) continue;
      const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
      assert.ok(!(ox > 2 && oy > 2), `${a.id}와 ${b.id}가 겹침 ${ox.toFixed(1)}, ${oy.toFixed(1)}`);
    }
  }
});
