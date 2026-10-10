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
//  [x] 눈금: 가로 눈금, 예산선, 안전선, 날짜 구분선, 오늘 칸 배경. 예산선 아래에는 아무것도 없다
//  [x] 날짜 숫자: 카펫 선 위쪽 여백 안, 칸마다 왼쪽 정렬. 폰트 파일 없이 숫자 윤곽선(barista-digits.js)으로 그린다(눈금 숫자와 요일 글자는 아직 안 넣음)
//  [x] 헤더의 월 표시: Red Carpet ∙ 10월
//  [x] 박스(일정·완료·남은 단계) 낙하: 위에서 떨어져 부딪히고 쌓이며 카펫이 무게만큼 눌렸다 정착한다. 첫 입장 때 한 번(carpet-physics.js)
//  [ ] 박스 위 글자, 박스 누르기(단계 메뉴), 끌어 놓으면 다시 낙하
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
  // 예산 깊이(예산선이 카펫 선에서 내려가는 깊이)는 값으로 두지 않는다. 맨 아래 가로선(예산선)이 아래쪽 '할 일' 메모지의
  // 왼쪽 위 꼭짓점보다 budgetBelowCorner만큼 아래에 오도록 화면에서 계산한다. 그 선 밑으로는 세로선도 오늘 칸도 없다
  budgetBelowCorner: 24,       // 예산선이 메모지 왼쪽 위 꼭짓점보다 얼마나 아래에 걸치는지(px)
  minSag: 120,                 // 화면이 아주 낮을 때 예산 깊이가 이보다 줄지 않게 하는 최소값(px)
  rollTuckRatio: 0.4,          // 처음 롤 윗부분이 헤더 뒤로 들어가는 정도(롤 지름의 비율). 클수록 위쪽 여백이 줄어든다. 위쪽 여백 ≈ 롤 지름 × (1 − 이 값)
  gridMaxLines: 5,             // 가로 눈금선 최대 개수
  gridColor: '#e6e1da',        // 눈금선 색
  gridWidth: 2,                // 눈금선 두께(px)
  budgetColor: '#b9b2a8',      // 예산선(맨 아래 눈금) 색
  dividerColor: '#d6cfc4',     // 날짜 구분 점선 색(모양은 스티치). 안전선은 스티치 색(주황)을 그대로 쓴다
  todayFill: 'rgba(184,32,58,0.08)', // 오늘 칸 배경. 마지막 숫자를 올리면 진해진다
  // --- 날짜 숫자: 헤더 아랫단과 카펫 선 사이(위쪽 여백)에 칸마다 왼쪽 정렬. 숫자 모양은 barista-digits.js의 윤곽선 ---
  dateColor: '#d6cfc4',        // 숫자 색. 날짜 구분 점선과 같은 흐린 색
  dateHeightRatio: 0.5,        // 숫자 높이 / 위쪽 여백. 숫자는 위쪽 여백의 세로 가운데에 놓인다(클수록 크고 위아래 패딩이 줄어든다)
  datePadXRatio: 0.08,         // 칸 왼쪽에서 숫자까지 띄우는 거리 / 칸 폭
  // --- 박스: 일정·완료·남은 단계. 높이 = 부하 × (예산 깊이 / 예산) 이라 부하 1이 눈금 한 칸이고, 날짜의 더미 높이가 곧 카펫이 처지는 깊이다 ---
  // 색과 스티치는 style.css의 --box-* 값
  boxWidthMin: 0.6,            // 박스 폭 / 칸 폭의 최소. 박스마다 이 사이에서 정해진다
  boxWidthMax: 0.86,           // 최대
  boxTiltDeg: 1.4,             // 박스마다 살짝 기운 각도의 최대(±도). 쌓인 모양이 손으로 놓은 듯하게
  boxStaggerMs: 70,            // 박스가 하나씩 떨어지는 간격(ms). 날짜 칸들이 돌아가며 떨어진다
  boxSpawnVx: 120,             // 떨어질 때 옆으로 흔들리는 속도의 최대(px/s)
  carpetFlatRatio: 0.75,       // 카펫이 처졌을 때 칸 폭 중 평평한 바닥 비율. 키우면 바닥이 넓고 날짜 사이 경사가 가팔라진다(박스 폭보다 작으면 박스 끝이 경사 위로 살짝 나온다)
  physics: {},                 // carpet-physics.js의 DEFAULTS를 덮어쓰는 값. 예: { gravity: 3000, restitution: 0.4 } (튕김·출렁임 조절)
};

(function () {
  if (new URLSearchParams(location.search).get('carpet') !== 'next') return;

  document.documentElement.classList.add('carpet-next-on'); // 옛 카펫을 숨기고 새 카펫 자리를 연다
  const stage = document.getElementById('carpet-next');
  stage.hidden = false;
  stage.innerHTML = '<svg class="carpet-intro" aria-hidden="true">'
    + '<defs><clipPath id="carpet-reveal"><rect class="reveal"/></clipPath>'
    + '<filter id="cn-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.2"/></filter></defs>'
    + '<g class="grid" clip-path="url(#carpet-reveal)"></g><path class="laid"/><g class="boxes"></g><path class="roll"/></svg>';
  const svg = stage.querySelector('svg');
  const laidPath = svg.querySelector('.laid');
  const rollPath = svg.querySelector('.roll');
  const gridG = svg.querySelector('.grid');
  const boxesG = svg.querySelector('.boxes');
  const revealRect = svg.querySelector('.reveal');
  const S = INTRO_STYLE;
  const G = STAGE_STYLE;
  [laidPath, rollPath].forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', S.lineColor);
    p.setAttribute('stroke-width', S.lineWidth);
  });
  rollPath.setAttribute('stroke-linejoin', 'round');

  // 오늘이 든 주의 7일(YYYY-MM-DD)
  function thisWeekDates() {
    const start = Placement.weekStart(todayStr());
    return Placement.dateRange(start, Placement.addDays(start, 6));
  }

  // 헤더의 월 표시("Red Carpet ∙ 12월"): 그 주의 목요일이 든 달. 주가 두 달에 걸치면 날이 더 많은 쪽이다
  const monthEl = document.getElementById('header-month');
  const monthNum = Number(thisWeekDates()[3].slice(5, 7));
  monthEl.setAttribute('aria-label', `${monthNum}월`);
  monthEl.querySelector('.num').innerHTML = monthNumberSvg(monthNum, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-month-num-size')));
  monthEl.hidden = false;

  // 눈금: 7칸을 화면 너비로 똑같이 나눠 그린다. 오늘 칸은 배경을 깐다. 폭이나 높이가 바뀔 때만 다시 만든다
  let gridKey = '';
  function drawGrid(width, groundY, height, sag, topSpace) {
    const key = [width, groundY, height, sag, topSpace].join();
    if (key === gridKey) return;
    gridKey = key;
    const cs = getComputedStyle(document.documentElement);
    const dash = cs.getPropertyValue('--stitch-dash').trim(), gap = cs.getPropertyValue('--stitch-gap').trim();
    const stitchW = cs.getPropertyValue('--stitch-width').trim(), yarn = cs.getPropertyValue('--stitch-color').trim();
    const stitch = `stroke-dasharray="${dash} ${gap}" stroke-width="${stitchW}" stroke-linecap="round"`;
    const st = state.settings;
    const today = todayStr();
    const dates = thisWeekDates();
    const colW = width / 7;
    const columns = dates.map((_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const shape = Carpet.carpetShape({
      loads: dates.map(() => 0), capacity: st.capacity, safeRatio: st.safeRatio, columns, width,
      baseY: groundY, maxSag: sag, gridMaxLines: G.gridMaxLines,
    });
    const todayIdx = dates.indexOf(today);
    gridG.innerHTML =
      (todayIdx >= 0 ? `<rect x="${columns[todayIdx].left}" y="${groundY}" width="${colW}" height="${sag}" fill="${G.todayFill}"/>` : '')
      + shape.gridLines.map(g => `<line x1="0" y1="${g.y}" x2="${width}" y2="${g.y}" stroke="${g.isBudget ? G.budgetColor : G.gridColor}" stroke-width="${G.gridWidth}"/>`).join('')
      + (shape.safeLine ? `<line x1="0" y1="${shape.safeLine.y}" x2="${width}" y2="${shape.safeLine.y}" stroke="${yarn}" ${stitch}/>` : '')
      + shape.dividers.map(x => `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${groundY + sag}" stroke="${G.dividerColor}" ${stitch}/>`).join('')
      + dateNumbers(columns, dates, colW, groundY, topSpace);
  }

  // 아래쪽 '할 일' 메모지의 왼쪽 위 꼭짓점의 화면 높이. 메모지는 가운데를 기준으로 기울어 있어서 기울기(변환 행렬)를 반영해 계산한다
  function noteCornerY() {
    const el = document.querySelector('.dock-note');
    if (!el) return null;
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const r = el.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    return r.top + r.height / 2 + m.b * (-w / 2) + m.d * (-h / 2);
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
    // 위 여백 줄이기: 그림은 그대로 두고 통째로 위로 끌어올려, 처음 롤 윗부분이 지름의 rollTuckRatio만큼 헤더 뒤로 들어가게 한다
    const diameter = groundY - S.topMargin;
    const lift = Math.max(0, stageTop + S.topMargin - headerBottom + G.rollTuckRatio * diameter);
    svg.style.marginTop = `${-lift}px`;
    const svgTop = stageTop - lift;
    const lineY = svgTop + groundY;                // 카펫 선의 화면 높이
    const topSpace = lineY - headerBottom;         // 위쪽 여백: 헤더 아랫단 ~ 카펫 선
    // 예산선(맨 아래 가로선): 아래쪽 '할 일' 메모지의 왼쪽 위 꼭짓점보다 조금 아래. 메모지를 못 찾으면 위쪽 여백과 같은 아래 여백
    const corner = noteCornerY();
    const budgetY = corner === null ? window.innerHeight - topSpace : corner + G.budgetBelowCorner;
    const sag = Math.max(G.minSag, budgetY - lineY);
    const height = Math.ceil(groundY + sag + 2);   // 그림 높이는 예산선까지(선 두께 여유 2px)
    L = { P, startMargin, groundY, lift, sag, height, topSpace, svgTop };
    return L;
  }

  // 숫자 문자열을 윤곽선 글리프 <g>로 만든다. x: 왼쪽 시작, baseline: 기준선의 y, fontSize: 글자 크기(px)
  function digitsSvg(text, x, baseline, fontSize, fill) {
    const B = BaristaDigits;
    const sc = (fontSize / B.unitsPerEm).toFixed(5);
    return `<g transform="translate(${x.toFixed(2)} ${baseline.toFixed(2)}) scale(${sc} -${sc})" fill="${fill}">`
      + B.layout(text).glyphs.map(g => `<path transform="translate(${g.x} 0)" d="${B.glyphs[g.ch].d}"/>`).join('') + '</g>';
  }

  // 날짜 숫자: 헤더 아랫단~카펫 선 사이의 세로 가운데에, 칸 왼쪽에서 padX만큼 띄워 왼쪽 정렬
  function dateNumbers(columns, dates, colW, groundY, topSpace) {
    const digitH = topSpace * G.dateHeightRatio;
    const fontSize = digitH / (BaristaDigits.digitHeight / BaristaDigits.unitsPerEm);
    const baseline = groundY - topSpace / 2 + digitH / 2; // 위쪽 여백 가운데에 숫자 높이를 맞춘다(숫자는 기준선 위로 자란다)
    const padX = colW * G.datePadXRatio;
    return dates.map((d, i) => digitsSvg(String(Number(d.slice(8))), columns[i].left + padX, baseline, fontSize, G.dateColor)).join('');
  }

  // 헤더의 월 숫자: 같은 윤곽선으로 그린 작은 그림. 숫자 기준선이 옆의 '월' 글자 기준선에 놓이게 아래로 내려 붙인다
  function monthNumberSvg(month, sizePx) {
    const B = BaristaDigits;
    const lay = B.layout(String(month));
    const sc = sizePx / B.unitsPerEm;
    const h = B.digitHeight + B.digitDepth;
    return `<svg width="${(lay.right * sc).toFixed(2)}" height="${(h * sc).toFixed(2)}" viewBox="0 ${-B.digitHeight} ${lay.right} ${h}" style="margin-bottom:${(-B.digitDepth * sc).toFixed(2)}px" aria-hidden="true">`
      + '<g transform="scale(1 -1)" fill="currentColor">'
      + lay.glyphs.map(g => `<path transform="translate(${g.x} 0)" d="${B.glyphs[g.ch].d}"/>`).join('') + '</g></svg>';
  }

  // 롤 그리기. eased는 0~1(곡선을 입힌 진행도)
  function draw(eased) {
    const width = svg.clientWidth || stage.clientWidth + 32;
    const { P, startMargin, groundY, sag, height, topSpace } = layout(width);
    const pose = CarpetRoll.rollPose({ progress: eased, width, ...P, groundY, startMargin });
    svg.setAttribute('height', height);
    drawGrid(width, groundY, height, sag, topSpace);
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

  // ---- 박스: 날짜별 일정(fixed)·완료한 단계(done)·남은 단계(todo)가 위에서 떨어져 쌓이고, 카펫이 무게만큼 눌린다 ----

  // 문자열에서 0~1 값을 결정적으로 뽑는다. 같은 박스는 늘 같은 크기·자리·기울기다(새로고침·창 크기 변경에도)
  function hash01(text, salt) {
    let h = 2166136261;
    const s = text + '#' + salt;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  }

  // 이번 주 항목을 박스 목록으로. 한 날짜 안에서는 일정 -> 완료 -> 남은 단계 순(먼저 떨어진 것이 아래에 깔린다)
  function boxItems() {
    const items = [];
    (work.weekStats || []).forEach((st, col) => { // 계산 단계가 실패했으면 박스 없이 간다
      st.events.forEach(ev => items.push({ id: `ev:${ev.id}:${st.date}`, col, load: ev.load, kind: 'fixed' }));
      st.doneSteps.forEach(s => items.push({ id: `done:${s.id}`, col, load: s.load, kind: 'done' }));
      st.steps.forEach(({ step }) => items.push({ id: `step:${step.id}`, col, load: step.load, kind: 'todo' }));
    });
    return items.filter(it => it.load > 0);
  }

  let sim = null; // { world, pending, els, raf, start, last, width }
  stage.carpetSim = () => sim; // 확인용(개발자 도구에서 stage.carpetSim()으로 지금 세계를 볼 수 있다)

  function cssNum(name) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); }

  // 박스 하나를 SVG로: 몸통(둥근 사각형) + 안쪽 털실 점선. 색은 style.css의 .cn-box 규칙
  function makeBoxEl(box, kind) {
    const radius = cssNum('--box-radius'), inset = cssNum('--box-stitch-inset');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `cn-box ${kind}`);
    g.setAttribute('filter', 'url(#cn-shadow)');
    g.innerHTML = `<rect class="body" x="${-box.w / 2}" y="${-box.h / 2}" width="${box.w}" height="${box.h}" rx="${radius}"/>`
      + `<rect class="stitch" x="${-box.w / 2 + inset}" y="${-box.h / 2 + inset}" width="${box.w - inset * 2}" height="${box.h - inset * 2}" rx="${Math.max(0, radius - inset)}"/>`;
    boxesG.appendChild(g);
    return g;
  }

  // 지금 세계 상태를 화면에 반영: 카펫 선(처짐)과 박스 위치
  function renderSim() {
    const { world, els, width } = sim;
    const Lr = layout(width);
    const shape = Carpet.carpetShape({
      loads: world.sag.map(s => (s / Lr.sag) * world.capacity), capacity: world.capacity, safeRatio: state.settings.safeRatio,
      columns: world.columns, width, baseY: Lr.groundY, maxSag: Lr.sag, flatRatio: G.carpetFlatRatio, curve: 0.5,
    });
    laidPath.setAttribute('d', shape.linePath);
    world.boxes.forEach(b => {
      const el = els.get(b.id);
      if (el) el.setAttribute('transform', `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) rotate(${b.tilt.toFixed(2)})`);
    });
  }

  // 박스를 세계에 넣는다. 같은 열에서 방금 떨어진 박스와 겹치지 않게, 그 위쪽에서 시작한다
  function spawn(item) {
    const { world, width, unit, colW } = sim;
    const col = world.columns[item.col];
    const w = colW * (G.boxWidthMin + (G.boxWidthMax - G.boxWidthMin) * hash01(item.id, 'w'));
    const h = item.load * unit;
    const x = (col.left + col.right) / 2 + (hash01(item.id, 'x') - 0.5) * (colW - w) * 0.85;
    let bottom = -layout(width).svgTop - 24; // 화면 맨 위 바로 위(헤더 뒤)에서 시작
    world.boxes.forEach(b => { if (b.col === item.col) bottom = Math.min(bottom, b.y - b.h / 2 - 8); });
    const box = CarpetPhysics.addBox(world, {
      id: item.id, col: item.col, x, y: bottom - h / 2, w, h, load: item.load,
      vx: (hash01(item.id, 'v') - 0.5) * 2 * G.boxSpawnVx,
    });
    box.tilt = (hash01(item.id, 't') - 0.5) * 2 * G.boxTiltDeg;
    sim.els.set(item.id, makeBoxEl(box, item.kind === 'todo' ? 'todo' : 'paper'));
  }

  // 날짜 칸들이 돌아가며 하나씩 떨어지도록 순서를 짠다(열마다 k번째 박스를 한 바퀴씩)
  function releaseOrder(items) {
    const byCol = [];
    items.forEach(it => { (byCol[it.col] = byCol[it.col] || []).push(it); });
    const order = [];
    for (let k = 0; ; k++) {
      let any = false;
      byCol.forEach(list => { if (list && list[k]) { order.push(list[k]); any = true; } });
      if (!any) break;
    }
    return order;
  }

  function stopSim() { if (sim && sim.raf) cancelAnimationFrame(sim.raf); }

  // animate=true: 하나씩 떨어지는 연출. false: 보이지 않게 끝까지 계산해 정착한 모습만 보여 준다(창 크기가 바뀐 때, 모션 줄이기)
  function startBoxes(animate) {
    stopSim();
    boxesG.innerHTML = '';
    const width = svg.clientWidth || stage.clientWidth + 32;
    const Lr = layout(width);
    const capacity = state.settings.capacity;
    const colW = width / 7;
    const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const world = CarpetPhysics.createWorld({
      columns, capacity, maxSag: Lr.sag, baseY: Lr.groundY - S.lineWidth / 2, // 박스는 카펫 선의 윗면에 얹힌다
      params: G.physics,
    });
    sim = { world, width, colW, unit: Lr.sag / capacity, els: new Map(), pending: releaseOrder(boxItems()), raf: 0, start: 0, last: 0, released: 0 };
    stage.dataset.boxes = String(sim.pending.length);
    if (!animate) {
      sim.pending.forEach(spawn);
      sim.pending = [];
      CarpetPhysics.settle(world, 15);
      renderSim();
      stage.dataset.boxState = 'settled';
      return;
    }
    stage.dataset.boxState = 'falling';
    function frame(now) {
      if (!sim.start) { sim.start = now; sim.last = now; }
      const due = Math.floor((now - sim.start) / G.boxStaggerMs) + 1; // 지금까지 떨어뜨렸어야 할 박스 수
      while (sim.released < due && sim.pending.length) { spawn(sim.pending.shift()); sim.released++; }
      CarpetPhysics.advance(world, Math.min(50, now - sim.last));
      sim.last = now;
      renderSim();
      if (sim.pending.length || !world.settled) sim.raf = requestAnimationFrame(frame);
      else { sim.raf = 0; stage.dataset.boxState = 'settled'; }
    }
    sim.raf = requestAnimationFrame(frame);
  }

  function finish() {
    draw(1);
    gridG.removeAttribute('clip-path'); // 다 펼쳐졌으니 눈금을 가리던 틀을 걷는다
    stage.classList.add('intro-done');
    startBoxes(!window.matchMedia('(prefers-reduced-motion: reduce)').matches); // 첫 입장 때만 떨어지는 연출
    window.addEventListener('resize', () => { // 폭·높이가 바뀌면 선과 박스를 새 크기로 다시 놓는다(연출 없이)
      draw(1);
      startBoxes(false);
    });
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
