// 카펫 위에 박스가 떨어져 쌓이는 물리 계산. 순수 함수. DOM, localStorage, 현재 시각, 난수를 직접 읽지 않는다.
// 같은 입력이면 항상 같은 결과가 나오도록 고정 간격(dt)으로만 진행한다.
//
// 좌표는 화면과 같다: x는 오른쪽, y는 아래로 늘어난다(속도 단위 px/s). 박스는 축에 정렬된 사각형(회전 없음)이고 x, y는 중심이다.
// - 날짜(열)마다 벽이 있어 박스는 자기 열을 벗어나지 않는다. 열끼리는 서로 닿지 않는다
// - 카펫 바닥은 열마다 용수철이다. 바닥 높이 = baseY + sag[열]. 쌓인 박스(landed)의 부하 합 / 예산 × maxSag 만큼 처지려 하고,
//   충격을 받으면 출렁인다(약간 튕기고 정착)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CarpetPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULTS = {
    gravity: 2600,          // 중력(px/s²)
    restitution: 0.28,      // 박스끼리·바닥에 부딪힐 때 튕기는 정도(0~1)
    wallRestitution: 0.3,   // 벽에 부딪힐 때
    restSpeed: 60,          // 부딪히는 상대 속도가 이보다 작으면 튕기지 않고 그냥 얹힌다(px/s)
    friction: 7,            // 바닥·다른 박스 위에 있을 때 가로 속도가 줄어드는 정도(1/s)
    slideAccel: 1100,       // 받침이 모자란 박스가 옆으로 미끄러지는 가속(px/s²)
    slideSupportRatio: 0.5, // 박스 폭 중 받침과 겹친 비율이 이보다 작으면 미끄러진다
    iterations: 6,          // 한 프레임에 겹침을 푸는 반복 횟수
    springK: 190,           // 카펫 용수철 세기(1/s²). 클수록 빨리 출렁인다
    springC: 8.5,           // 카펫 용수철 감쇠(1/s). 작을수록 오래 출렁인다
    impactKick: 0.9,        // 박스가 떨어진 충격이 카펫을 얼마나 흔드는지(클수록 더 깊이 출렁)
    settleSpeed: 10,        // 이 속도(px/s)보다 느리면 가만히 있는 것으로 본다
    settleSeconds: 0.35,    // 위 상태가 이만큼 이어지면 정착(settled)으로 본다
    dt: 1 / 120,            // 고정 계산 간격(초)
  };

  /**
   * @param {object} input
   * @param {Array<{left:number,right:number}>} input.columns 날짜별 가로 범위
   * @param {number} input.capacity 하루 예산(부하)
   * @param {number} input.maxSag 예산만큼 찼을 때 카펫이 처지는 깊이(px)
   * @param {number} input.baseY 처지지 않았을 때 카펫 높이(y)
   * @param {object} [input.params] DEFAULTS를 덮어쓰는 값
   */
  function createWorld({ columns, capacity, maxSag, baseY, params = {} }) {
    return {
      columns, capacity, maxSag, baseY,
      p: { ...DEFAULTS, ...params },
      boxes: [],
      sag: columns.map(() => 0),     // 카펫이 처진 깊이(px)
      sagVel: columns.map(() => 0),  // 처지는 속도(px/s, 아래가 +)
      kick: columns.map(() => 0),    // 이번 프레임에 쌓인 충격
      time: 0, acc: 0, quiet: 0, settled: false,
    };
  }

  // 박스를 넣는다. col: 열 번호, x·y: 중심, w·h: 크기, load: 부하(카펫을 누르는 무게)
  function addBox(world, { id, col, x, y, w, h, load, vx = 0, vy = 0, data = null }) {
    const c = world.columns[col];
    const half = w / 2;
    const box = {
      id, col, w, h, load, data,
      x: Math.min(c.right - half, Math.max(c.left + half, x)), y, vx, vy,
      mass: w * h, landed: false, onFloor: false, supported: false,
    };
    world.boxes.push(box);
    world.settled = false; world.quiet = 0;
    return box;
  }

  function floorY(world, col) {
    return world.baseY + world.sag[col];
  }

  // 열마다 쌓인(landed) 박스의 부하 합
  function weights(world) {
    const w = world.columns.map(() => 0);
    world.boxes.forEach(b => { if (b.landed) w[b.col] += b.load; });
    return w;
  }

  function step(world, dt) {
    const p = world.p;
    const boxes = world.boxes;
    world.kick.fill(0);

    // 1. 이동
    boxes.forEach(b => {
      b.vy += p.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.onFloor = false;
      b.supported = false;
    });

    // 2. 겹침 풀기(벽, 바닥, 박스끼리). 여러 번 반복해 쌓인 더미가 눌려 들어가지 않게 한다
    for (let it = 0; it < p.iterations; it++) {
      const last = it === p.iterations - 1;
      boxes.forEach(b => {
        const c = world.columns[b.col];
        const half = b.w / 2;
        if (b.x < c.left + half) { b.x = c.left + half; if (b.vx < 0) b.vx = Math.abs(b.vx) > p.restSpeed ? -b.vx * p.wallRestitution : 0; }
        if (b.x > c.right - half) { b.x = c.right - half; if (b.vx > 0) b.vx = Math.abs(b.vx) > p.restSpeed ? -b.vx * p.wallRestitution : 0; }
        const floor = floorY(world, b.col);
        if (b.y + b.h / 2 > floor) {
          b.y = floor - b.h / 2;
          const fv = world.sagVel[b.col];
          const rel = b.vy - fv;
          if (rel > 0) {
            if (rel > p.restSpeed) {
              b.vy = fv - rel * p.restitution;
              if (last) world.kick[b.col] += rel * (b.load / world.capacity) * p.impactKick;
            } else {
              b.vy = fv;
            }
          } else if (fv < b.vy) {
            b.vy = fv; // 카펫이 올라오며 박스를 밀어 올린다
          }
          b.onFloor = true; b.landed = true;
        }
      });

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.col !== b.col) continue;
          const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
          const oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          if (oy <= ox) {
            // 위아래로 겹침: 위 박스를 올리고 아래 박스를 내린다(질량에 반비례). 아래 박스가 바닥에 닿아 있으면 다음 반복에서 다시 올라온다
            const lower = a.y > b.y ? a : b, upper = lower === a ? b : a;
            const tm = lower.mass + upper.mass;
            upper.y -= oy * (lower.mass / tm);
            lower.y += oy * (upper.mass / tm);
            upper.supported = true;
            if (lower.landed) upper.landed = true;
            const rn = upper.vy - lower.vy; // 위 박스가 아래 박스에 다가가는 속도
            if (rn > 0) {
              const e = rn > p.restSpeed ? p.restitution : 0;
              const jv = (1 + e) * rn / (1 / upper.mass + 1 / lower.mass);
              upper.vy -= jv / upper.mass;
              lower.vy += jv / lower.mass;
              if (last && rn > p.restSpeed) world.kick[upper.col] += rn * (upper.load / world.capacity) * p.impactKick * 0.5;
            }
            // 받침이 모자라면 옆으로 미끄러진다(한 프레임에 한 번만 가속한다)
            if (last && ox / upper.w < p.slideSupportRatio) {
              const dir = upper.x >= lower.x ? 1 : -1;
              upper.vx += dir * p.slideAccel * dt;
            }
          } else {
            // 옆으로 겹침: 가로로 밀어낸다
            const left = a.x < b.x ? a : b, right = left === a ? b : a;
            const tm = left.mass + right.mass;
            left.x -= ox * (right.mass / tm);
            right.x += ox * (left.mass / tm);
            const rv = left.vx - right.vx;
            if (rv > 0) {
              const e = rv > p.restSpeed ? p.restitution : 0;
              const jv = (1 + e) * rv / (1 / left.mass + 1 / right.mass);
              left.vx -= jv / left.mass;
              right.vx += jv / right.mass;
            }
          }
        }
      }
    }

    // 3. 얹혀 있는 박스는 받침의 속도를 따라간다. 아래부터 차례로 맞춘다. 높은 더미에서 중력 가속이 위로 쌓여 떨리는 것을 막는다
    const order = boxes.slice().sort((a, b) => (b.y + b.h / 2) - (a.y + a.h / 2));
    order.forEach(b => {
      const bottom = b.y + b.h / 2;
      const fv = world.sagVel[b.col];
      if (bottom >= floorY(world, b.col) - 0.5) {
        if (b.vy > fv) b.vy = fv;
        return;
      }
      for (const a of order) {
        if (a === b || a.col !== b.col || a.y <= b.y) continue;
        const overlapX = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
        if (overlapX > 0 && Math.abs(bottom - (a.y - a.h / 2)) < 1) {
          if (b.vy > a.vy) b.vy = a.vy;
          break;
        }
      }
    });

    // 3-2. 바닥·다른 박스 위에 있으면 가로 속도가 줄어든다
    boxes.forEach(b => {
      if (b.onFloor || b.supported) b.vx *= Math.max(0, 1 - p.friction * dt);
    });

    // 4. 카펫 용수철: 쌓인 무게만큼 처지려 하고, 충격을 받으면 출렁인다
    const wts = weights(world);
    for (let c = 0; c < world.columns.length; c++) {
      const target = Math.min(world.maxSag, (wts[c] / world.capacity) * world.maxSag);
      world.sagVel[c] += world.kick[c];
      const acc = p.springK * (target - world.sag[c]) - p.springC * world.sagVel[c];
      world.sagVel[c] += acc * dt;
      world.sag[c] += world.sagVel[c] * dt;
    }

    // 5. 정착 판정
    let calm = true;
    boxes.forEach(b => { if (Math.abs(b.vx) > p.settleSpeed || Math.abs(b.vy) > p.settleSpeed || !b.landed) calm = false; });
    for (let c = 0; c < world.columns.length; c++) {
      const target = Math.min(world.maxSag, (wts[c] / world.capacity) * world.maxSag);
      if (Math.abs(world.sagVel[c]) > p.settleSpeed || Math.abs(target - world.sag[c]) > 0.5) calm = false;
    }
    world.quiet = calm ? world.quiet + dt : 0;
    world.settled = world.quiet >= p.settleSeconds;
    world.time += dt;
  }

  // ms만큼 진행한다(고정 간격으로 쪼개서). 정착했으면 아무것도 하지 않는다. 남은 시간은 다음 호출로 넘긴다
  function advance(world, ms) {
    world.acc += ms / 1000;
    let steps = 0;
    while (world.acc >= world.p.dt && steps < 600) {
      if (world.settled) { world.acc = 0; break; }
      step(world, world.p.dt);
      world.acc -= world.p.dt;
      steps++;
    }
    if (steps >= 600) world.acc = 0; // 탭이 오래 멈췄다 돌아온 경우: 밀린 시간은 버린다
    return steps;
  }

  // 정착할 때까지 한꺼번에 진행(창 크기가 바뀌어 다시 놓을 때). maxSeconds를 넘기면 멈춘다
  function settle(world, maxSeconds = 12) {
    let t = 0;
    while (!world.settled && t < maxSeconds) { step(world, world.p.dt); t += world.p.dt; }
    return world.settled;
  }

  return { DEFAULTS, createWorld, addBox, floorY, weights, step, advance, settle };
});
