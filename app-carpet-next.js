// 새 카펫 화면(작업 중). 주소 끝에 ?carpet=next 를 붙여 열 때만 켜진다. 평소 주소에서는 아무 일도 하지 않는다.
// 옛 카펫(app-carpet.js)은 그대로 돌고 같은 state·placement.js를 함께 쓴다. 이 파일이 옛것의 동작을 다 채우면
// 한 커밋으로 (1) 이 파일을 기본으로 바꾸고 (2) 옛 카펫 코드와 CARPET_STYLE을 지운다. 그때 이 파일 이름도 app-carpet.js로 돌려놓는다.
//
// 이관 체크리스트: 옛 카펫이 하는 일. 새 카펫이 다 채워야 교체한다. 채우면 [x]로 바꾼다
//  [ ] 주 이동(이전·다음·이번 주)과 날짜 범위 표시. 버튼은 헤더의 week-patch가 가지고 있다
//  [ ] 날짜 7칸: 일정, 그날의 단계, 부하/예산, 여유, 남은 시간, 오늘 표시
//  [ ] 초과 표시 3종: 안전선 초과, 예산 초과, 시간 초과
//  [ ] 단계를 누르면 메뉴: 완료 / 이 날 안 함(밀림) / 다른 날에 고정
//  [ ] 단계 드래그로 다른 날에 고정(마우스, 터치는 길게 눌러 시작, 안내 토스트)
//  [ ] 지남 박스(마감이 지나 깔리지 않은 단계)
//  [ ] 지난 주 요약(총 부하, 초과한 날 수, 밀린 횟수)
//  [ ] 카펫 선: 부하만큼 처짐, 시간 초과 짐 상자
//  [x] 눈금: 가로 눈금, 예산선, 안전선, 날짜 구분선, 오늘 칸 배경(눈금 숫자와 날짜 글자는 아직 안 넣음)
//  [ ] 좁은 화면(가로 스크롤)
//  숨은 부작용(빠뜨리기 쉬움)
//  [ ] 그릴 때마다 마지막 배치 결과(placedDate)를 저장한다. 다음에 앱을 열 때 자동 밀림 판정에 쓴다
//  [ ] 다른 화면(팝업 닫기, 할 일·일정·설정 변경)이 전역 renderCarpet()을 불러 다시 그리게 한다
//  [ ] 오늘 날짜는 todayStr()로만 읽는다(UTC 쓰지 않기, 자정 전후·오전 9시 이전 확인)
//
// 새 연출 체크리스트
//  [x] 첫 입장 롤 펼침: 페이지를 열 때마다 한 번. 주 이동이나 수정으로 다시 그릴 때는 없다. 모션 줄이기 설정이면 건너뛴다
//  [ ] 주 넘기기 슬라이드(버튼·스와이프)  [ ] 박스 낙하·충돌·카펫 눌림  [ ] 끌어 놓으면 낙하  [ ] 전체 보기

// 첫 입장 롤 펼침 모양 값. 숫자나 색을 바꾸고 새로고침하면 바로 보인다
const INTRO_STYLE = {
  minMs: 1600,          // 롤이 다 펼쳐지기까지 최소 시간(ms). 일이 빨리 끝나도 이만큼은 걸린다. 일이 느리면 더 걸린다
  speedLimit: 2.5,      // 일이 갑자기 끝났을 때 롤이 따라잡는 최대 속도(정상 속도의 몇 배). 키우면 더 빨리 따라잡는다
  lineWidth: 8,         // 카펫 선 두께(px). 옛 카펫 선(CARPET_STYLE.lineWidth)과 같게 둔다
  lineColor: '#b8203a', // 카펫 색
  spacing: 11,          // 롤 바퀴 사이 간격(px). lineWidth보다 커야 바퀴 사이 틈이 보인다. 키우면 롤이 커진다
  coreRadius: 7,        // 롤 가운데 심 반지름(px)
  topMargin: 20,        // 롤 위쪽 여백(px)
  entryGap: 6,          // 시작할 때 롤이 화면 왼쪽 가장자리에서 떨어져 있는 거리(px). 클수록 화면 밖에서 더 늦게 들어온다
};

// 눈금(카펫 아래 격자) 모양 값. 점선 모양(길이·간격·두께·둥근 끝)은 공용 스티치 값(style.css의 --stitch-*)을 쓴다
const STAGE_STYLE = {
  // 예산 깊이(예산선이 카펫 선에서 내려가는 깊이)는 값으로 두지 않는다. 카펫 선 위쪽 여백(헤더 아랫단~카펫 선)과
  // 예산선 아래쪽 여백(예산선~화면 바닥)이 같아지도록 화면 높이에서 계산한다
  minSag: 120,                 // 화면이 아주 낮을 때 예산 깊이가 이보다 줄지 않게 하는 최소값(px)
  topSpaceRatio: 0.375,        // 롤 크기로 정해지는 처음 위쪽 여백을 이 비율로 줄인다(1이면 그대로). 롤이 헤더 밑으로 파고들지 않는 선까지만 줄어든다
  rollHeaderGap: 4,            // 롤 맨 위와 헤더 아랫단 사이에 남기는 최소 간격(px)
  gridMaxLines: 5,             // 가로 눈금선 최대 개수
  gridColor: '#e6e1da',        // 눈금선 색
  gridWidth: 2,                // 눈금선 두께(px)
  budgetColor: '#b9b2a8',      // 예산선(맨 아래 눈금) 색
  dividerColor: '#d6cfc4',     // 날짜 구분 점선 색(모양은 스티치). 안전선은 스티치 색(주황)을 그대로 쓴다
  todayFill: 'rgba(184,32,58,0.08)', // 오늘 칸 배경. 마지막 숫자를 올리면 진해진다
};

(function () {
  if (new URLSearchParams(location.search).get('carpet') !== 'next') return;

  document.documentElement.classList.add('carpet-next-on'); // 옛 카펫을 숨기고 새 카펫 자리를 연다
  const stage = document.getElementById('carpet-next');
  stage.hidden = false;
  stage.innerHTML = '<svg class="carpet-intro" aria-hidden="true">'
    + '<clipPath id="carpet-reveal"><rect class="reveal"/></clipPath>'
    + '<g class="grid" clip-path="url(#carpet-reveal)"></g><path class="laid"/><path class="roll"/></svg>';
  const svg = stage.querySelector('svg');
  const laidPath = svg.querySelector('.laid');
  const rollPath = svg.querySelector('.roll');
  const gridG = svg.querySelector('.grid');
  const revealRect = svg.querySelector('.reveal');
  const S = INTRO_STYLE;
  const G = STAGE_STYLE;
  [laidPath, rollPath].forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', S.lineColor);
    p.setAttribute('stroke-width', S.lineWidth);
  });
  rollPath.setAttribute('stroke-linejoin', 'round');

  // 눈금: 7칸을 화면 너비로 똑같이 나눠 그린다. 오늘 칸은 배경을 깐다. 폭이나 높이가 바뀔 때만 다시 만든다
  let gridKey = '';
  function drawGrid(width, groundY, height, sag) {
    const key = [width, groundY, height, sag].join();
    if (key === gridKey) return;
    gridKey = key;
    const cs = getComputedStyle(document.documentElement);
    const dash = cs.getPropertyValue('--stitch-dash').trim(), gap = cs.getPropertyValue('--stitch-gap').trim();
    const stitchW = cs.getPropertyValue('--stitch-width').trim(), yarn = cs.getPropertyValue('--stitch-color').trim();
    const stitch = `stroke-dasharray="${dash} ${gap}" stroke-width="${stitchW}" stroke-linecap="round"`;
    const st = state.settings;
    const today = todayStr();
    const dates = Placement.dateRange(Placement.weekStart(today), Placement.addDays(Placement.weekStart(today), 6));
    const colW = width / 7;
    const columns = dates.map((_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const shape = Carpet.carpetShape({
      loads: dates.map(() => 0), capacity: st.capacity, safeRatio: st.safeRatio, columns, width,
      baseY: groundY, maxSag: sag, gridMaxLines: G.gridMaxLines,
    });
    const todayIdx = dates.indexOf(today);
    gridG.innerHTML =
      (todayIdx >= 0 ? `<rect x="${columns[todayIdx].left}" y="${groundY}" width="${colW}" height="${height - groundY}" fill="${G.todayFill}"/>` : '')
      + shape.gridLines.map(g => `<line x1="0" y1="${g.y}" x2="${width}" y2="${g.y}" stroke="${g.isBudget ? G.budgetColor : G.gridColor}" stroke-width="${G.gridWidth}"/>`).join('')
      + (shape.safeLine ? `<line x1="0" y1="${shape.safeLine.y}" x2="${width}" y2="${shape.safeLine.y}" stroke="${yarn}" ${stitch}/>` : '')
      + shape.dividers.map(x => `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${height}" stroke="${G.dividerColor}" ${stitch}/>`).join('');
  }

  // 세로 배치. 화면 폭과 높이가 바뀔 때만 다시 잰다
  let layoutKey = '', L = null;
  function layout(width) {
    const key = `${width},${window.innerHeight}`;
    if (key === layoutKey) return L;
    layoutKey = key;
    const P = { spacing: S.spacing, coreRadius: S.coreRadius };
    const startMargin = S.entryGap + S.lineWidth / 2;
    const groundY = S.topMargin + 2 * CarpetRoll.rollPose({ progress: 0, width, ...P, groundY: 0, startMargin }).radius; // svg 안에서 땅 높이: 롤 지름 + 위 여백
    const headerBottom = parseFloat(getComputedStyle(document.body).paddingTop) || 0; // 헤더 아랫단 높이(화면 위에서)
    svg.style.marginTop = '0px';
    const stageTop = svg.getBoundingClientRect().top + window.scrollY;
    // 위 여백 줄이기: 그림은 그대로 두고 통째로 위로 끌어올린다. 롤 맨 위가 헤더 아랫단을 넘지 않는 만큼까지만
    const lift = Math.max(0, Math.min((1 - G.topSpaceRatio) * groundY, stageTop + S.topMargin - headerBottom - G.rollHeaderGap));
    svg.style.marginTop = `${-lift}px`;
    const svgTop = stageTop - lift;
    const lineY = svgTop + groundY;                // 카펫 선의 화면 높이
    const topSpace = lineY - headerBottom;         // 위쪽 여백: 헤더 아랫단 ~ 카펫 선
    const sag = Math.max(G.minSag, window.innerHeight - topSpace - lineY); // 아래쪽 여백(예산선 ~ 화면 바닥)을 위쪽 여백과 같게
    const height = Math.floor(window.innerHeight - svgTop); // 구분 점선과 오늘 칸은 화면 바닥까지
    L = { P, startMargin, groundY, lift, sag, height, topSpace };
    return L;
  }

  // 롤 그리기. eased는 0~1(곡선을 입힌 진행도)
  function draw(eased) {
    const width = svg.clientWidth || stage.clientWidth + 32;
    const { P, startMargin, groundY, sag, height } = layout(width);
    const pose = CarpetRoll.rollPose({ progress: eased, width, ...P, groundY, startMargin });
    svg.setAttribute('height', height);
    drawGrid(width, groundY, height, sag);
    // 눈금은 롤이 깔고 지나간 자리까지만 드러난다
    revealRect.setAttribute('x', -50);
    revealRect.setAttribute('y', 0);
    revealRect.setAttribute('width', Math.max(0, pose.contactX + 50));
    revealRect.setAttribute('height', height);
    laidPath.setAttribute('d', `M${pose.startX.toFixed(2)} ${groundY} H${pose.contactX.toFixed(2)}`);
    const pts = pose.theta > 0.001 ? CarpetRoll.spiralPoints(pose, P) : [];
    rollPath.setAttribute('d', pts.length > 1 ? 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') : '');
  }

  // 로딩 단계. 옛 카펫이 처음 그릴 때 하는 계산을 읽기만 한다(저장은 하지 않는다). 단계마다 따로 실행해 그 사이에 화면이 그려지게 한다
  const work = {};
  const phases = [
    () => { // 1. 읽기
      work.today = todayStr();
      work.activeSteps = state.steps.filter(st => !st.done);
      work.doneSteps = state.steps.filter(st => st.done && st.doneDate);
    },
    () => { // 2. 배치 계산
      const s = state.settings;
      work.params = {
        steps: work.activeSteps, doneSteps: work.doneSteps, goals: state.goals, events: state.events, today: work.today,
        capacity: s.capacity, safeRatio: s.safeRatio, sleepHours: s.sleepHours, lifeHours: s.lifeHours, placeMode: s.placeMode,
      };
      work.placements = Placement.placeSteps(work.params);
    },
    () => { // 3. 이번 주 7일 구성
      const start = Placement.weekStart(work.today);
      work.dates = Placement.dateRange(start, Placement.addDays(start, 6));
      work.weekStats = work.dates.map(date => Placement.dayStats({ ...work.params, date, placements: work.placements }));
    },
    () => {}, // 4. 그리기 준비. 이후 단계(박스·카펫 그리기)가 여기를 채운다
  ];
  let workDone = 0;
  const nextTask = () => new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));

  function finish() {
    draw(1);
    gridG.removeAttribute('clip-path'); // 다 펼쳐졌으니 눈금을 가리던 틀을 걷는다
    stage.classList.add('intro-done');
    window.addEventListener('resize', () => draw(1)); // 다 펼쳐진 선은 화면 너비를 따라간다
  }

  async function runWork() {
    for (const fn of phases) {
      await nextTask();
      try { fn(); } catch (e) { console.error('카펫 로딩 단계 실패', e); }
      workDone++;
    }
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    phases.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    finish();
    return;
  }

  let t0 = null, last = 0, progress = 0;
  function frame(now) {
    if (t0 === null) { t0 = now; last = now; }
    progress = CarpetRoll.introProgress({
      elapsedMs: now - t0, minMs: S.minMs, workDone, workTotal: phases.length,
      prev: progress, dtMs: now - last, speedLimit: S.speedLimit,
    });
    last = now;
    draw(CarpetRoll.easeInOutSine(progress));
    if (progress < 1) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
  runWork();
})();
