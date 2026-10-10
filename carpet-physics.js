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
    kickMinSpeed: 300,      // 부딪히는 속도가 이보다 느리면 카펫을 흔들지 않는다(px/s). 카펫이 출렁이며 밀어 올린 박스가 다시 떨어질 때 또 카펫을 흔들어 끝없이 튀는 되먹임을 막는다. 이 속도를 넘은 만큼만 센다
    impactKick: 0.00215,    // 박스가 떨어진 충격이 카펫을 얼마나 흔드는지(클수록 더 깊이 출렁). 박스가 카펫을 누르는 깊이(부하 × 부하 1당 높이)에 비례한다 — 예산 설정이 달라도 같은 박스는 같게 흔든다
    settleSpeed: 10,        // 이 속도(px/s)보다 느리면 가만히 있는 것으로 본다
    settleSeconds: 0.35,    // 위 상태가 이만큼 이어지면 정착(settled)으로 본다
    liftK: 100,             // 박스를 뺀 열의 카펫이 올라올 때의 용수철 세기(1/s²). 출렁이지 않게 임계 감쇠(2√liftK)로 쓴다. 작을수록 천천히 올라오지만 그 사이 위의 박스가 더 떨어진다. 이보다 크면(특히 springK처럼 출렁이면) 올라오던 카펫이 멈출 때 위의 박스를 던져 올린다
    capSag: true,           // true: 카펫은 예산(maxSag)에서 더 처지지 않는다. false: 부하만큼 계속 처진다(예산을 넘으면 예산선 밑으로 쭉 내려간다)
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
    const merged = { ...DEFAULTS, ...params };
    if (!(merged.dt > 0)) merged.dt = DEFAULTS.dt; // dt가 0이면 settle이 끝나지 않는다
    return {
      columns, capacity: Math.max(capacity, 1), maxSag, baseY, // 예산이 0이면 목표 처짐이 0/0(NaN)이 되고 충격량도 무한대가 된다(예산은 부하 단위라 1보다 작을 일이 없다)
      p: merged,
      boxes: [],
      sag: columns.map(() => 0),     // 카펫이 처진 깊이(px)
      lift: columns.map(() => false), // 박스를 빼서 카펫이 부드럽게 올라오는 중인 열(removeBox가 켜고, 목표에 닿거나 박스가 새로 들어오면 꺼진다)
      sagVel: columns.map(() => 0),  // 처지는 속도(px/s, 아래가 +)
      kick: columns.map(() => 0),    // 이번 프레임에 쌓인 충격
      time: 0, acc: 0, quiet: 0, settled: false,
    };
  }

  // 박스를 넣는다. col: 열 번호, x·y: 중심, w·h: 크기, load: 부하(카펫을 누르는 무게)
  // lockX: 가로로는 움직이지 않는다(맨 아래 박스를 카펫 가운데에 붙들어 두는 용도). 위아래로는 다른 박스처럼 떨어지고 눌린다
  function addBox(world, { id, col, x, y, w, h, load, vx = 0, vy = 0, lockX = false, data = null }) {
    const c = world.columns[col];
    w = Math.min(w, c.right - c.left); // 열보다 넓으면 양쪽 벽이 서로 반대로 밀어 정착하지 못한다
    const half = w / 2;
    const box = {
      id, col, w, h, load, data, lockX,
      x: Math.min(c.right - half, Math.max(c.left + half, x)), y, vx: lockX ? 0 : vx, vy,
      mass: w * h, landed: false, onFloor: false, supported: false,
    };
    world.boxes.push(box);
    world.lift[col] = false;
    world.settled = false; world.quiet = 0;
    return box;
  }

  // 박스를 뺀다(없어진 박스). 아래가 빈 박스는 떨어지고 카펫은 줄어든 무게만큼 올라오도록 정착 상태를 푼다. 없는 id면 false
  function removeBox(world, id) {
    const i = world.boxes.findIndex(b => b.id === id);
    if (i < 0) return false;
    const col = world.boxes[i].col;
    world.boxes.splice(i, 1);
    world.lift[col] = true;
    world.settled = false; world.quiet = 0;
    return true;
  }

  // 카펫이 처지려는 목표 깊이: 쌓인 부하 / 예산 × maxSag(= 부하 1당 maxSag/예산 px). capSag면 maxSag에서 멈춘다
  function targetSag(world, weight) {
    const t = (weight / world.capacity) * world.maxSag;
    return world.p.capSag ? Math.min(world.maxSag, t) : t;
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
      if (b.lockX) b.vx = 0;
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
              // 부딪힌 반복에서 속도가 줄어드니(튕김) 이 충격은 한 번만 세어진다. 마지막 반복에서만 세면 이미 튕긴 뒤라 한 번도 안 센다
              world.kick[b.col] += Math.max(0, rel - p.kickMinSpeed) * (b.load * world.maxSag / world.capacity) * p.impactKick;
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
              if (rn > p.restSpeed) world.kick[upper.col] += Math.max(0, rn - p.kickMinSpeed) * (upper.load * world.maxSag / world.capacity) * p.impactKick * 0.5;
            }
            // 받침이 모자라면 옆으로 미끄러진다(한 프레임에 한 번만 가속한다)
            if (last && ox / upper.w < p.slideSupportRatio) {
              const dir = upper.x >= lower.x ? 1 : -1;
              upper.vx += dir * p.slideAccel * dt;
            }
          } else {
            // 옆으로 겹침: 가로로 밀어낸다
            const left = a.x < b.x ? a : b, right = left === a ? b : a;
            if (left.lockX && right.lockX) continue;
            // 가로로 잠긴 박스는 움직이지 않는 벽처럼 다룬다(질량을 사실상 무한대로)
            const lm = left.lockX ? 1e12 : left.mass, rm = right.lockX ? 1e12 : right.mass;
            const tm = lm + rm;
            left.x -= ox * (rm / tm);
            right.x += ox * (lm / tm);
            const rv = left.vx - right.vx;
            if (rv > 0) {
              const e = rv > p.restSpeed ? p.restitution : 0;
              const jv = (1 + e) * rv / (1 / lm + 1 / rm);
              left.vx -= jv / lm;
              right.vx += jv / rm;
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
      const target = targetSag(world, wts[c]);
      world.sagVel[c] += world.kick[c];
      const lifting = world.lift[c]; // 박스를 뺀 열: 출렁이지 않는 부드러운 용수철로 올라온다
      const acc = (lifting ? p.liftK : p.springK) * (target - world.sag[c]) - (lifting ? 2 * Math.sqrt(p.liftK) : p.springC) * world.sagVel[c];
      world.sagVel[c] += acc * dt;
      world.sag[c] += world.sagVel[c] * dt;
      if (lifting && Math.abs(target - world.sag[c]) < 0.5 && Math.abs(world.sagVel[c]) < p.settleSpeed) world.lift[c] = false;
    }

    // 5. 정착 판정
    let calm = true;
    boxes.forEach(b => { if (Math.abs(b.vx) > p.settleSpeed || Math.abs(b.vy) > p.settleSpeed || !b.landed) calm = false; });
    for (let c = 0; c < world.columns.length; c++) {
      const target = targetSag(world, wts[c]);
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

  return { DEFAULTS, createWorld, addBox, removeBox, floorY, weights, targetSag, step, advance, settle };
});
