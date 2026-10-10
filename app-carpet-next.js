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
//  [x] 박스 위 글자(제목)와 아이콘(부하·시간·밀림), 완료 도장. 박스 크기(부하)에 따라 배치가 달라진다
//  [ ] 박스 누르기(단계 메뉴 등 동작은 따로 정한다), 끌어 놓으면 다시 낙하
//  [ ] 좁은 화면(가로 스크롤)
//  숨은 부작용(빠뜨리기 쉬움)
//  [ ] 그릴 때마다 마지막 배치 결과(placedDate)를 저장한다. 다음에 앱을 열 때 자동 밀림 판정에 쓴다
//  [ ] 다른 화면(팝업 닫기, 할 일·일정·설정 변경)이 전역 renderCarpet()을 불러 다시 그리게 한다
//  [ ] 오늘 날짜는 todayStr()로만 읽는다(UTC 쓰지 않기, 자정 전후·오전 9시 이전 확인)
//
// 새 연출 체크리스트
//  [x] 첫 입장 롤 펼침: 페이지를 열 때마다 한 번. 주 이동이나 수정으로 다시 그릴 때는 없다. 모션 줄이기 설정이면 건너뛴다
//  [ ] 주 넘기기 슬라이드(버튼·스와이프)  [ ] 끌어 놓으면 낙하   (전체 보기는 기각, 밀린 단계 주름도 기각: 밀림은 박스의 알람 아이콘으로 한다)
//  [x] 세로축: 부하 1당 높이는 일정하고(예산 15일 때의 눈금 간격), 예산 설정에 따라 예산선 깊이가 늘고 줄어 아래로 스크롤이 생긴다
//  [x] 예산 초과: 카펫이 예산선 밑으로 부하만큼 계속 처지고, 그 날의 박스와 카펫이 아이폰 홈 화면 수정 모드처럼 떤다(예산 설정은 새로 읽어야 반영됨: 다시 그리기 연결은 아직)

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
  // 세로 눈금: 부하 1당 높이(unit)를 먼저 정하고, 예산선 깊이 = unit × 예산 이다.
  // unit은 기준 예산(refCapacity)일 때 맨 아래 가로선(예산선)이 아래쪽 '할 일' 메모지의 왼쪽 위 꼭짓점보다 budgetBelowCorner만큼 아래에 오도록 화면에서 계산한다.
  // 예산 설정을 바꾸면 unit은 그대로이고 예산선 깊이만 늘고 줄어, 화면보다 깊어지면 아래로 스크롤이 생긴다. 예산선 밑으로는 세로선도 오늘 칸도 없다
  refCapacity: 15,             // 기준 예산. 이 예산일 때가 지금의 눈금 간격이다
  budgetBelowCorner: 24,       // 기준 예산일 때 예산선이 메모지 왼쪽 위 꼭짓점보다 얼마나 아래에 걸치는지(px)
  minSag: 120,                 // 화면이 아주 낮을 때 기준 예산의 예산선 깊이가 이보다 줄지 않게 하는 최소값(px)
  scrollTail: 70,              // 가장 깊이 처진 카펫 아래에 남기는 여백(px). 출렁여도 잘리지 않게
  jiggleDeg: 1.8,              // 예산 초과인 날의 박스가 떠는 각도(±도). 아이폰 홈 화면 수정 모드처럼
  jiggleHz: 5.5,               // 박스가 떠는 빠르기(초당 왕복). 박스마다 ±10% 다르고 시작점도 제각각이다
  jiggleCarpetPx: 1.8,         // 예산 초과인 날의 카펫(과 그 위 박스)이 위아래로 떠는 크기(px). 이웃 날짜와 이어진 곡선이 따라서 자연스럽게 이어진다
  jiggleCarpetHz: 6.5,         // 카펫이 떠는 빠르기
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
  boxTiltDeg: 1.4,             // 박스마다 살짝 기운 각도의 최대(±도). 쌓인 모양이 손으로 놓은 듯하게. 맨 아래 박스는 기울지 않는다
  bottomBoxFit: 0.96,          // 맨 아래 박스는 칸 가운데에 놓이고 가로로 움직이지 않는다. 폭은 카펫 평평한 바닥(carpetFlatRatio)의 이 비율까지만
  boxStaggerMs: 130,           // 박스가 하나씩 떨어지는 기본 간격(ms). 날짜 칸들이 돌아가며 떨어진다
  boxStaggerJitterMs: 110,     // 박스마다 여기에 더해지는 0~이 값의 어긋남(ms). 칸들이 같은 박자로 한 줄로 떨어지지 않게 한다
  boxDropJitter: 220,          // 박스마다 떨어지기 시작하는 높이가 0~이 값(px)만큼 더 높다. 도착하는 때가 제각각이 된다
  boxSpawnGap: 80,             // 같은 칸에서 앞서 떨어진 박스와 새 박스 사이 최소 간격(px). 떨어지는 박스들이 한 줄로 붙지 않게 한다
  boxBounce: 0.5,              // 박스가 부딪힐 때 튕기는 정도(0~1). 클수록 통통 튄다. carpet-physics.js의 restitution
  boxSpawnVx: 190,             // 떨어질 때 옆으로 흔들리는 속도의 최대(px/s). 클수록 옆으로 흩어지며 떨어진다
  maxSettleMs: 12000,          // 마지막 박스가 떨어진 뒤 이 시간이 지나면 정착하지 못했어도 멈춘다(배터리를 쓰며 계속 도는 것을 막는 안전장치)
  // --- 박스 위 글자·아이콘·완료 도장. 박스 높이(부하)에 따라 배치가 달라진다: 제목과 아이콘 줄이 위아래로 들어갈 높이가 되면 위아래(제목은 자리 되는 만큼 여러 줄),
  //     모자라면 한 줄에 제목과 아이콘을 같이 둔다. 먼저 여백을 넉넉히(boxPad), 안 되면 좁혀서(boxPadTight) 위아래 배치를 시도한다 ---
  boxTitleFont: 13,            // 제목 글자 크기(px). 박스 크기와 상관없이 모두 같다. 길면 …로 줄인다
  boxLineHeight: 1.25,         // 제목 줄 높이(글자 크기의 배수)
  boxGoalScale: 0.85,          // 상위 할 일(목표) 제목의 글자 크기 / 제목 글자 크기. 칸이 남을 때만 제목 아래에 흐리게 나온다
  boxIcon: 13,                 // 아이콘 크기(px)
  boxPad: 6,                   // 점선과 글자 사이 여백(px). 가장 작은 박스는 boxPadTiny
  boxPadTight: 3,              // 박스가 낮을 때 점선과 글자 사이 여백
  boxPadTiny: 2,               // 한 줄 배치일 때 위아래 여백
  boxPadXRow: 8,               // 한 줄 배치일 때 점선과 글자 사이 좌우 여백
  boxInsetMin: 4.5,            // 점선이 가장자리에서 들어가는 거리의 범위(px). 박스가 작을수록 가장자리에 붙여 글자 자리를 만든다
  boxInsetMax: 8,
  sealSize: 30,                // 완료 도장 지름(px). 가장 작은 박스는 sealSizeTiny
  sealSizeTiny: 24,            // 박스 높이가 sealTinyBelow보다 낮을 때
  sealTinyBelow: 40,
  sealInset: 0.2,              // 도장 중심이 박스 오른쪽 위 모서리에서 안쪽으로 들어간 거리(도장 지름의 배수). 작을수록 더 튀어나간다
  sealLobes: 18,               // 도장 가장자리의 물결 수
  carpetFlatRatio: 0.75,       // 카펫이 처졌을 때 칸 폭 중 평평한 바닥 비율. 키우면 바닥이 넓고 날짜 사이 경사가 가팔라진다(박스 폭보다 작으면 박스 끝이 경사 위로 살짝 나온다)
  physics: {},                 // carpet-physics.js의 DEFAULTS를 덮어쓰는 값. 예: { gravity: 3000, restitution: 0.4 } (튕김·출렁임 조절)
};

(function () {
  if (new URLSearchParams(location.search).get('carpet') !== 'next') return;

  document.documentElement.classList.add('carpet-next-on'); // 옛 카펫을 숨기고 새 카펫 자리를 연다
  const stage = document.getElementById('carpet-next');
  stage.hidden = false;
  // 층(아래부터): 눈금(그려 두고 안 바뀜) -> 가리개(롤 앞의 눈금을 숨김) -> 깔린 카펫(처음 직선) -> 처진 카펫 -> 박스 -> 롤.
  // 움직이는 것은 층을 따로 둬서, 박스 하나가 움직일 때 눈금 점선이나 다른 박스까지 다시 그려지지 않게 한다(Safari 렉 방지).
  // 박스·가리개·깔린 카펫·롤은 transform만 바꾼다(그래픽 카드가 위치만 옮긴다)
  stage.innerHTML = '<div class="cn-world">'
    + '<svg class="cn-grid" aria-hidden="true"><g class="grid"></g></svg>'
    + '<div class="cn-cover"></div>'
    + '<div class="cn-laid"></div>'
    + '<svg class="cn-carpet" aria-hidden="true"><path/></svg>'
    + '<div class="cn-boxes"></div>'
    + '<div class="cn-seals"></div>'
    + '<svg class="cn-roll" aria-hidden="true"><path/></svg>'
    + '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="cn-seal-sym" viewBox="-50 -50 100 100">'
    + `<path style="fill:var(--seal-fill);stroke:var(--seal-edge);stroke-width:1.4" d="${BoxIcons.sealPath(STAGE_STYLE.sealLobes)}"/>`
    // 체크: 선 두께를 스티치와 같게(--stitch-width, 화면 크기 그대로: non-scaling-stroke), 끝은 스티치처럼 둥글게
    + '<polyline points="-23,2 -8,17 23,-17" style="fill:none;stroke:var(--seal-check);stroke-width:var(--stitch-width);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke"/>'
    + '</symbol></svg>'
    + '</div>';
  const world_el = stage.querySelector('.cn-world');
  const gridSvg = world_el.querySelector('.cn-grid');
  const gridG = gridSvg.querySelector('.grid');
  const coverEl = world_el.querySelector('.cn-cover');
  const laidEl = world_el.querySelector('.cn-laid');
  const carpetSvg = world_el.querySelector('.cn-carpet');
  const carpetPath = carpetSvg.querySelector('path');
  const boxesEl = world_el.querySelector('.cn-boxes');
  const sealsEl = world_el.querySelector('.cn-seals');
  const rollSvg = world_el.querySelector('.cn-roll');
  const rollPath = rollSvg.querySelector('path');
  const S = INTRO_STYLE;
  const G = STAGE_STYLE;
  [carpetPath, rollPath].forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', S.lineColor);
    p.setAttribute('stroke-width', S.lineWidth);
    p.setAttribute('stroke-linejoin', 'round');
  });
  laidEl.style.height = `${S.lineWidth}px`;
  laidEl.style.background = S.lineColor;
  coverEl.style.background = getComputedStyle(document.body).backgroundColor; // 페이지 바탕색: 롤 앞쪽 눈금을 이 색으로 덮어 숨긴다

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
    const capacity = state.settings.capacity;
    const maxLoad = Math.max(0, ...(work.weekStats || []).map(st => st.load)); // 가장 무거운 날(예산을 넘을 수 있다)
    const key = `${width},${window.innerHeight},${capacity},${maxLoad}`;
    if (key === layoutKey) return L;
    layoutKey = key;
    const P = { spacing: S.spacing, coreRadius: S.coreRadius };
    const startMargin = S.entryGap + S.lineWidth / 2;
    const groundY = S.topMargin + 2 * CarpetRoll.rollPose({ progress: 0, width, ...P, groundY: 0, startMargin }).radius; // svg 안에서 땅 높이: 롤 지름 + 위 여백
    const headerBottom = parseFloat(getComputedStyle(document.body).paddingTop) || 0; // 헤더 아랫단 높이(화면 위에서)
    world_el.style.marginTop = '0px';
    const stageTop = world_el.getBoundingClientRect().top + window.scrollY;
    // 위 여백 줄이기: 그림은 그대로 두고 통째로 위로 끌어올려, 처음 롤 윗부분이 지름의 rollTuckRatio만큼 헤더 뒤로 들어가게 한다
    const diameter = groundY - S.topMargin;
    const lift = Math.max(0, stageTop + S.topMargin - headerBottom + G.rollTuckRatio * diameter);
    world_el.style.marginTop = `${-lift}px`;
    const svgTop = stageTop - lift;
    const lineY = svgTop + groundY;                // 카펫 선의 화면 높이
    const topSpace = lineY - headerBottom;         // 위쪽 여백: 헤더 아랫단 ~ 카펫 선
    // 예산선(맨 아래 가로선): 아래쪽 '할 일' 메모지의 왼쪽 위 꼭짓점보다 조금 아래. 메모지를 못 찾으면 위쪽 여백과 같은 아래 여백
    const corner = noteCornerY();
    const budgetY = corner === null ? window.innerHeight - topSpace : corner + G.budgetBelowCorner;
    const refSag = Math.max(G.minSag, budgetY - lineY);   // 기준 예산(refCapacity)일 때의 예산선 깊이
    const unit = refSag / G.refCapacity;                  // 부하 1당 높이(px). 예산 설정이 바뀌어도 그대로다
    const sag = unit * capacity;                          // 예산선 깊이
    const deepest = unit * Math.max(capacity, maxLoad);   // 가장 깊이 처지는 날(예산을 넘으면 예산선 밑)
    const height = Math.ceil(groundY + deepest + G.scrollTail + 2);
    const radius0 = CarpetRoll.rollPose({ progress: 0, width, ...P, groundY: 0, startMargin }).radius;
    L = { P, startMargin, groundY, lift, sag, unit, deepest, height, topSpace, svgTop, radius0 };
    // 층 크기: 모든 층이 같은 좌표계(왼쪽 위가 (0,0))를 쓴다
    world_el.style.height = `${height}px`;
    // 화면보다 길어지면 아래로 스크롤된다. 맨 아래까지 내려도 고정된 아래 두 버튼에 카펫이 가리지 않게 그 높이만큼 아래 여백을 둔다
    world_el.style.marginBottom = svgTop + height > window.innerHeight ? `${Math.max(0, window.innerHeight - (corner === null ? window.innerHeight - 170 : corner)) + 16}px` : '0px';
    [gridSvg, carpetSvg].forEach(el => { el.setAttribute('width', width); el.setAttribute('height', height); });
    laidEl.style.top = `${groundY - S.lineWidth / 2}px`;
    laidEl.style.width = `${width}px`;
    coverEl.style.height = `${height}px`;
    coverEl.style.width = `${width}px`;
    const rollSize = Math.ceil(2 * (radius0 + S.lineWidth));
    rollSvg.setAttribute('width', rollSize); rollSvg.setAttribute('height', rollSize);
    L.rollSize = rollSize;
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

  // 롤 그리기. eased는 0~1(곡선을 입힌 진행도). 눈금은 이미 그려 있고, 가리개를 오른쪽으로 밀어 드러낸다
  function draw(eased) {
    const width = world_el.clientWidth || stage.clientWidth + 32;
    const { P, startMargin, groundY, sag, height, topSpace, rollSize } = layout(width);
    const pose = CarpetRoll.rollPose({ progress: eased, width, ...P, groundY, startMargin });
    drawGrid(width, groundY, height, sag, topSpace);
    const contact = Math.max(0, pose.contactX);
    coverEl.style.display = '';
    coverEl.style.transform = `translate3d(${contact.toFixed(1)}px,0,0)`;           // 롤이 지나간 자리까지만 눈금이 보인다
    laidEl.style.display = '';
    laidEl.style.transform = `scaleX(${(contact / width).toFixed(4)})`;              // 깔린 카펫이 롤을 따라 늘어난다
    // 롤: 중심을 그림 한가운데로 옮긴 작은 그림. 위치는 transform으로 옮기고, 굴러서 작아지는 모양만 다시 그린다
    const half = rollSize / 2;
    rollSvg.style.transform = `translate3d(${(pose.cx - half).toFixed(1)}px,${(pose.cy - half).toFixed(1)}px,0)`;
    const pts = pose.theta > 0.001 ? CarpetRoll.spiralPoints(pose, P) : [];
    rollPath.setAttribute('d', pts.length > 1 ? 'M' + pts.map(([x, y]) => `${(x - pose.cx + half).toFixed(1)} ${(y - pose.cy + half).toFixed(1)}`).join('L') : '');
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
    const goalTitle = new Map(state.goals.map(g => [g.id, g.title])); // 단계의 상위 할 일
    (work.weekStats || []).forEach((st, col) => { // 계산 단계가 실패했으면 박스 없이 간다
      st.events.forEach(ev => items.push({ id: `ev:${ev.id}:${st.date}`, col, load: ev.load, kind: 'fixed', title: ev.title, minutes: Placement.eventDurationMinutes(ev), push: 0 }));
      st.doneSteps.forEach(s => items.push({ id: `done:${s.id}`, col, load: s.load, kind: 'done', title: s.title, goal: goalTitle.get(s.goalId) || '', minutes: s.minutes, push: s.pushCount || 0 }));
      st.steps.forEach(({ step }) => items.push({ id: `step:${step.id}`, col, load: step.load, kind: 'todo', title: step.title, goal: goalTitle.get(step.goalId) || '', minutes: step.minutes, push: step.pushCount || 0 }));
    });
    return items.filter(it => it.load > 0);
  }

  let sim = null; // { world, pending, els, raf, start, last, width }
  stage.carpetSim = () => sim; // 확인용(개발자 도구에서 stage.carpetSim()으로 지금 세계를 볼 수 있다)

  function cssNum(name) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); }

  // 시간(분)을 짧게: 30분, 1시간, 1시간30분
  function shortDuration(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h && m) return `${h}시간${m}분`;
    if (h) return `${h}시간`;
    return `${m}분`;
  }

  // 박스 안 내용(글자만, 눌러서 동작하는 것은 없다). 박스 높이(부하)에 따라 배치가 달라진다:
  //  tall: 제목 여러 줄 + 아래 아이콘 줄(밀림·시간·부하)   mid: 제목 한 줄(자리가 되면 두 줄) + 아래 아이콘 줄
  //  tiny: 한 줄에 제목과 아이콘(밀림·시간)을 같이 둔다. 부하는 박스 높이가 이미 보여 주므로 뺀다
  // 폭이 모자라면 style.css의 컨테이너 쿼리가 부하, 그다음 시간 아이콘을 먼저 숨긴다
  function boxContent(item, w, h, inset) {
    const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${BoxIcons.paths[name]}"/></svg>`;
    const metric = (cls, name, text) => `<span class="m ${cls}">${icon(name)}<b>${text}</b></span>`;
    // 위아래 배치가 들어갈 높이: 위아래 여백 + 제목 한 줄 + 아이콘 줄 + 사이
    const lineH = G.boxTitleFont * G.boxLineHeight;
    const need = padv => 2 * (inset + padv) + lineH + (G.boxIcon + 2) + 2;
    let tier, pad;
    if (h >= need(G.boxPad)) { tier = 'col'; pad = inset + G.boxPad; }
    else if (h >= need(G.boxPadTight)) { tier = 'col'; pad = inset + G.boxPadTight; }
    else { tier = 'row'; pad = inset + G.boxPadTiny; }
    const metrics = (item.push > 0 ? metric('m-push', 'push', item.push) : '')
      + metric('m-time', 'time', shortDuration(item.minutes))
      + (tier === 'row' ? '' : metric('m-load', 'load', item.load));
    // 위아래 배치에서 남는 높이: 제목은 들어가는 만큼 여러 줄, 제목 한 줄을 두고도 한 줄이 더 들어가면 그 아래에 상위 할 일을 흐리게 보여 준다
    const avail = h - 2 * pad - (G.boxIcon + 2) - 2;
    const goalH = G.boxTitleFont * G.boxGoalScale * G.boxLineHeight + 1;
    const showGoal = tier === 'col' && !!item.goal && avail - lineH >= goalH;
    const lines = tier === 'row' ? 1 : Math.max(1, Math.min(4, Math.floor((avail - (showGoal ? goalH : 0)) / lineH)));
    const font = G.boxTitleFont;
    // 한 줄 배치는 위아래 여백은 작아도 되지만 좌우는 더 둔다(점선에 글자가 붙어 보이지 않게). 완료 도장은 글자 자리에 영향을 주지 않는다(위에 얹힐 뿐)
    const padX = tier === 'row' ? inset + G.boxPadXRow : pad;
    return `<div class="bx bx-${tier}" style="--bx-padx:${padX.toFixed(1)}px;--bx-pad:${pad.toFixed(1)}px;--bx-lines:${lines};--bx-font:${font}px;--bx-icon:${G.boxIcon}px;--bx-lh:${G.boxLineHeight};--bx-goal-scale:${G.boxGoalScale}">`
      + `<div class="bx-title">${escapeHtml(item.title || '')}</div>`
      + (showGoal ? `<div class="bx-goal">${escapeHtml(item.goal)}</div>` : '')
      + `<div class="bx-metrics">${metrics}</div></div>`;
  }

  // 박스 하나: 둥근 모서리 몸통(div, 그림자는 box-shadow) + 안쪽 털실 점선(한 번 그리면 안 바뀌는 작은 SVG) + 글자·아이콘. 색은 style.css의 .cn-box 규칙.
  // 작은 박스는 점선을 가장자리에 더 붙여 글자 자리를 만든다. 움직일 때는 transform만 바꾼다. 중심이 (0,0)에 오게 두고 translate로 옮긴다
  function makeBoxEl(box, kind, item) {
    const baseRadius = cssNum('--box-radius');
    const inset = Math.max(G.boxInsetMin, Math.min(G.boxInsetMax, (box.h - 22) / 3));
    const radius = Math.min(baseRadius, box.h / 2.6, box.w / 4);
    const el = document.createElement('div');
    el.className = `cn-box ${kind}`;
    el.style.cssText = `width:${box.w.toFixed(1)}px;height:${box.h.toFixed(1)}px;margin:${(-box.h / 2).toFixed(1)}px 0 0 ${(-box.w / 2).toFixed(1)}px;border-radius:${radius.toFixed(1)}px`;
    el.innerHTML = `<svg class="stitch" width="${box.w.toFixed(1)}" height="${box.h.toFixed(1)}" viewBox="0 0 ${box.w.toFixed(1)} ${box.h.toFixed(1)}" aria-hidden="true">`
      + `<rect x="${inset.toFixed(1)}" y="${inset.toFixed(1)}" width="${(box.w - inset * 2).toFixed(1)}" height="${(box.h - inset * 2).toFixed(1)}" rx="${Math.max(0, radius - inset).toFixed(1)}"/></svg>`
      + boxContent(item, box.w, box.h, inset);
    boxesEl.appendChild(el);
    return el;
  }

  // 완료 도장: 박스 오른쪽 위 모서리에 조금 튀어나가게 붙는다. 박스 층과 따로 둔 위층에 있어서 위에 쌓인 박스에 가려지지 않고,
  // 물리 계산에는 아무 영향이 없다(보이는 것만). 박스와 같은 transform을 받아 따라다닌다
  function makeSealEl(box) {
    const tiny = box.h < G.sealTinyBelow;
    const s = tiny ? G.sealSizeTiny : G.sealSize;
    const wrap = document.createElement('div');
    wrap.className = 'cn-seal-wrap';
    const left = box.w / 2 - G.sealInset * s - s / 2, top = -box.h / 2 + G.sealInset * s - s / 2;
    wrap.innerHTML = `<svg class="cn-seal" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${s}px;height:${s}px" aria-hidden="true"><use href="#cn-seal-sym"/></svg>`;
    sealsEl.appendChild(wrap);
    return wrap;
  }

  // 지금 세계 상태를 화면에 반영: 카펫 선(처짐)과 박스 위치
  function renderSim(now = 0) {
    const { world, els, width } = sim;
    const Lr = layout(width);
    const t = now / 1000;
    // 예산 초과인 날의 카펫은 위아래로 떤다(박스는 그 위에 얹혀 같이 움직인다). 곡선은 이웃 날짜와 이어져 있어 가운데로 갈수록 크게 떨리는 것처럼 보인다
    const osc = c => (sim.fidget && sim.over[c] ? G.jiggleCarpetPx * Math.sin(2 * Math.PI * G.jiggleCarpetHz * t + c * 1.7) : 0);
    // 카펫 모양 계산은 부하가 예산을 넘으면 더 처지지 않으므로, 가장 깊은 날 기준으로 '예산'을 키워 넘기고 깊이도 같은 비율로 키운다(부하 1당 높이 unit은 그대로)
    const loads = world.sag.map((s, c) => (s + osc(c)) / Lr.unit);
    const cEff = Math.max(world.capacity, ...loads) + 1e-6;
    const shape = Carpet.carpetShape({
      loads, capacity: cEff, columns: world.columns, width, baseY: Lr.groundY, maxSag: Lr.unit * cEff, flatRatio: G.carpetFlatRatio, curve: 0.5,
    });
    carpetPath.setAttribute('d', shape.linePath);
    if (!sim.carpetShown) { // 처음 한 번: 롤이 깔아 둔 직선과 가리개를 걷고 처지는 카펫으로 넘긴다(처음에는 같은 직선이라 티가 안 난다)
      sim.carpetShown = true;
      laidEl.style.display = 'none';
      coverEl.style.display = 'none';
    }
    world.boxes.forEach(b => {
      const el = els.get(b.id);
      if (!el) return;
      // 예산 초과인 날의 박스는 자리를 잡은 뒤 홈 화면 수정 모드의 아이콘처럼 벌벌 떤다(박스마다 빠르기와 시작점이 다르다)
      const jig = sim.fidget && b.landed && sim.over[b.col];
      const y = b.y + (jig ? osc(b.col) : 0);
      const rot = b.tilt + (jig ? G.jiggleDeg * Math.sin(2 * Math.PI * G.jiggleHz * (0.9 + 0.2 * b.jr) * t + b.jp) : 0);
      const tr = `translate3d(${b.x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
      if (jig || b.lastT !== tr) { // 움직인 박스만 바꾼다(떠는 박스는 매 프레임)
        b.lastT = tr;
        el.style.transform = tr;
        const seal = sim.seals.get(b.id);
        if (seal) seal.style.transform = tr;
      }
    });
  }

  // 박스를 세계에 넣는다. 같은 열에서 방금 떨어진 박스와 겹치지 않게, 그 위쪽에서 시작한다
  function spawn(item) {
    const { world, width, unit, colW } = sim;
    const col = world.columns[item.col];
    // 한 칸의 첫 박스(맨 아래에 깔린다)는 칸 가운데, 기울지 않고, 가로로 움직이지 않는다. 폭은 카펫 평평한 바닥 안에 들어가게 해서 경사에 걸리지 않는다
    const isBottom = !world.boxes.some(b => b.col === item.col);
    let w = colW * (G.boxWidthMin + (G.boxWidthMax - G.boxWidthMin) * hash01(item.id, 'w'));
    if (isBottom) w = Math.min(w, colW * G.carpetFlatRatio * G.bottomBoxFit);
    const h = item.load * unit;
    const x = (col.left + col.right) / 2 + (isBottom ? 0 : (hash01(item.id, 'x') - 0.5) * (colW - w) * 0.85);
    // 화면 맨 위 바로 위(헤더 뒤)에서 시작하되 박스마다 시작 높이가 다르다. 같은 칸의 앞 박스보다는 boxSpawnGap만큼 위에서 시작한다
    let bottom = -layout(width).svgTop - 24 - hash01(item.id, 'drop') * G.boxDropJitter;
    world.boxes.forEach(b => { if (b.col === item.col) bottom = Math.min(bottom, b.y - b.h / 2 - G.boxSpawnGap); });
    const box = CarpetPhysics.addBox(world, {
      id: item.id, col: item.col, x, y: bottom - h / 2, w, h, load: item.load,
      vx: isBottom ? 0 : (hash01(item.id, 'v') - 0.5) * 2 * G.boxSpawnVx,
      lockX: isBottom,
    });
    box.tilt = isBottom ? 0 : (hash01(item.id, 't') - 0.5) * 2 * G.boxTiltDeg;
    box.jp = hash01(item.id, 'jp') * Math.PI * 2; // 예산 초과인 날의 떨림: 박스마다 시작점과 빠르기가 다르다
    box.jr = hash01(item.id, 'jr');
    sim.els.set(item.id, makeBoxEl(box, item.kind === 'todo' ? 'todo' : item.kind === 'fixed' ? 'paper fixed' : 'paper', item));
    if (item.kind === 'done') sim.seals.set(item.id, makeSealEl(box));
  }

  // 날짜 칸들이 돌아가며 하나씩 떨어지도록 순서를 짜고(열마다 k번째 박스를 한 바퀴씩), 박스마다 떨어뜨릴 시각(at, ms)을 정한다.
  // 순서 × 간격에 박스마다 다른 어긋남을 더해 한 박자로 몰리지 않게 한다. 같은 칸 안의 먼저 떨어질 박스(아래에 깔릴 박스)가 늦지 않게 칸 안에서는 시각이 뒤집히지 않는다
  function releaseOrder(items) {
    const byCol = [];
    items.forEach(it => { (byCol[it.col] = byCol[it.col] || []).push(it); });
    const order = [];
    for (let k = 0; ; k++) {
      let any = false;
      byCol.forEach(list => { if (list && list[k]) { order.push(list[k]); any = true; } });
      if (!any) break;
    }
    const lastAt = [];
    order.forEach((it, i) => {
      let at = i * G.boxStaggerMs + hash01(it.id, 'delay') * G.boxStaggerJitterMs;
      if (lastAt[it.col] !== undefined) at = Math.max(at, lastAt[it.col] + 1); // 같은 칸에서는 앞선 박스가 먼저
      lastAt[it.col] = at;
      it.at = at;
    });
    return order.sort((a, b) => a.at - b.at);
  }

  function stopSim() {
    if (!sim) return;
    if (sim.raf) cancelAnimationFrame(sim.raf);
    if (sim.fidgetRaf) cancelAnimationFrame(sim.fidgetRaf);
  }

  // 다 자리를 잡은 뒤에도, 예산 초과인 날이 있으면 떨림을 계속 그린다(물리 계산은 멈춰 있고 그리기만). 탭이 가려지면 브라우저가 알아서 멈춘다
  function startFidget() {
    if (!sim.fidget) return;
    const mySim = sim;
    const tick = now => {
      if (sim !== mySim) return; // 새로 놓았으면 옛 루프는 끝낸다
      renderSim(now);
      mySim.fidgetRaf = requestAnimationFrame(tick);
    };
    mySim.fidgetRaf = requestAnimationFrame(tick);
  }

  // animate=true: 하나씩 떨어지는 연출. false: 보이지 않게 끝까지 계산해 정착한 모습만 보여 준다(창 크기가 바뀐 때, 모션 줄이기)
  function startBoxes(animate) {
    stopSim();
    boxesEl.innerHTML = '';
    sealsEl.innerHTML = '';
    const width = world_el.clientWidth || stage.clientWidth + 32;
    const Lr = layout(width);
    const capacity = state.settings.capacity;
    const colW = width / 7;
    const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const world = CarpetPhysics.createWorld({
      columns, capacity, maxSag: Lr.sag, baseY: Lr.groundY - S.lineWidth / 2, // 박스는 카펫 선의 윗면에 얹힌다
      params: { restitution: G.boxBounce, capSag: false, ...G.physics }, // capSag false: 예산을 넘으면 카펫이 예산선 밑으로 계속 처진다
    });
    const over = (work.weekStats || []).map(st => st.overBudget);
    const fidget = over.some(Boolean) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sim = { world, width, colW, unit: Lr.unit, over, fidget, els: new Map(), seals: new Map(), pending: releaseOrder(boxItems()), raf: 0, fidgetRaf: 0, start: 0, last: 0, released: 0, carpetShown: false };
    stage.dataset.boxes = String(sim.pending.length);
    if (!animate) {
      sim.pending.forEach(spawn);
      sim.pending = [];
      CarpetPhysics.settle(world, 15);
      renderSim();
      stage.dataset.boxState = 'settled';
      startFidget();
      return;
    }
    stage.dataset.boxState = 'falling';
    renderSim(); // 카펫 선을 처지는 카펫으로 먼저 넘겨 둔다(처음엔 직선)
    function frame(now) {
      if (!sim.start) { sim.start = now; sim.last = now; }
      while (sim.pending.length && now - sim.start >= sim.pending[0].at) { spawn(sim.pending.shift()); sim.released++; sim.lastSpawnAt = now; } // 때가 된 박스를 떨어뜨린다
      CarpetPhysics.advance(world, Math.min(50, now - sim.last));
      sim.last = now;
      if (!sim.pending.length && now - sim.lastSpawnAt > G.maxSettleMs) world.settled = true; // 안전장치
      renderSim(now);
      if (sim.pending.length || !world.settled) sim.raf = requestAnimationFrame(frame);
      else { sim.raf = 0; stage.dataset.boxState = 'settled'; startFidget(); }
    }
    sim.raf = requestAnimationFrame(frame);
  }

  function finish() {
    draw(1);
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
