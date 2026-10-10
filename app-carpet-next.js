// 새 카펫 화면(작업 중). 주소 끝에 ?carpet=next 를 붙여 열 때만 켜진다. 평소 주소에서는 아무 일도 하지 않는다.
// 옛 카펫(app-carpet.js)은 그대로 돌고 같은 state·placement.js를 함께 쓴다. 이 파일이 옛것의 동작을 다 채우면
// 한 커밋으로 (1) 이 파일을 기본으로 바꾸고 (2) 옛 카펫 코드와 CARPET_STYLE을 지운다. 그때 이 파일 이름도 app-carpet.js로 돌려놓는다.
//
// 이관 체크리스트: 옛 카펫이 하는 일. 새 카펫이 다 채워야 교체한다. 채우면 [x]로 바꾼다
//  [x] 주 이동(이전·다음·이번 주)과 날짜 범위 표시. 버튼은 헤더의 week-patch가 가지고 있다. 이동하는 주는 연출 없이 정착한 모습으로 슬라이드해 들어온다
//  [ ] 날짜 7칸: 일정, 그날의 단계, 부하/예산, 여유, 남은 시간, 오늘 표시
//  [ ] 초과 표시 3종: 안전선 초과, 예산 초과, 시간 초과
//  [ ] 단계를 누르면 메뉴: 완료(됨, 박스 누르기) / 이 날 안 함(밀림) / 다른 날에 고정(둘은 드래그가 맡는다)
//  [x] 단계 드래그로 다른 날에 고정(마우스, 터치는 길게 눌러 시작). 안내는 토스트 대신 화면 가장자리 구역
//  [ ] 지남 박스(마감이 지나 깔리지 않은 단계)
//  [ ] 지난 주 요약(총 부하, 초과한 날 수, 밀린 횟수)
//  [ ] 카펫 선: 부하만큼 처짐, 시간 초과 짐 상자
//  [x] 눈금: 가로 눈금, 예산선, 안전선, 날짜 구분선, 오늘 칸 배경. 예산선 아래에는 아무것도 없다
//  [x] 날짜 숫자: 카펫 선 위쪽 여백 안, 칸마다 왼쪽 정렬. 폰트 파일 없이 숫자 윤곽선(barista-digits.js)으로 그린다(눈금 숫자와 요일 글자는 아직 안 넣음)
//  [x] 헤더의 월 표시: Red Carpet ∙ 10월
//  [x] 박스(일정·완료·남은 단계) 낙하: 위에서 떨어져 부딪히고 쌓이며 카펫이 무게만큼 눌렸다 정착한다. 첫 입장 때 한 번(carpet-physics.js)
//  [x] 박스 위 글자(제목)와 아이콘(부하·시간·밀림), 완료 도장. 박스 크기(부하)에 따라 배치가 달라진다
//  [x] 박스 누르기: 제자리에서 커지며 모든 정보와 버튼(완료, 반복 일정의 이 날만 빼기)이 보인다  [x] 끌어 놓으면 다시 낙하(박스를 끌어 날짜칸에 놓으면 그 날에 고정되고 위에서 떨어진다. 화면 끝에 머물면 주 이동, 위쪽에 놓으면 취소)
//  [ ] 좁은 화면(가로 스크롤)
//  숨은 부작용(빠뜨리기 쉬움)
//  [x] 그릴 때마다 마지막 배치 결과(placedDate)를 저장한다. 다음에 앱을 열 때 자동 밀림 판정에 쓴다
//  [x] 다른 화면(팝업 닫기, 할 일·일정·설정 변경)이 전역 renderCarpet()을 불러 다시 그리게 한다. 바뀐 박스만 위에서 다시 떨어진다
//  [ ] 오늘 날짜는 todayStr()로만 읽는다(UTC 쓰지 않기, 자정 전후·오전 9시 이전 확인)
//
// 새 연출 체크리스트
//  [x] 첫 입장 롤 펼침: 페이지를 열 때마다 한 번. 주 이동이나 수정으로 다시 그릴 때는 없다. 모션 줄이기 설정이면 건너뛴다
//  [x] 주 넘기기 슬라이드(버튼과 터치 스와이프)  [ ] 끌어 놓으면 낙하   (전체 보기는 기각, 밀린 단계 주름도 기각: 밀림은 박스의 알람 아이콘으로 한다)
//  [x] 세로축: 부하 1당 높이는 일정하고(예산 15일 때의 눈금 간격), 예산 설정에 따라 예산선 깊이가 늘고 줄어 아래로 스크롤이 생긴다
//  [x] 예산 초과: 카펫이 예산선 밑으로 부하만큼 계속 처지고, 그 날의 박스와 카펫이 아이폰 홈 화면 수정 모드처럼 떤다(예산을 바꾸면 눈금과 처짐이 바로 따라간다)

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
  jiggleCarpetFps: 20,         // 카펫 선을 다시 그리는 초당 횟수. 카펫이 떠는 동안 매 프레임 선과 그림자 캔버스를 다시 그리는 비용을 줄인다(박스 떨림은 이 값과 무관하게 부드럽다). 화면 주사율보다 크면 매 프레임 그린다
  jiggleCarpetScaleMax: 2,     // 카펫이 떠는 동안 카펫 선 캔버스의 화면 배율 상한(1~2). 2는 또렷하고 1은 캔버스가 4배 작아 가볍지만 2배 화면에서 선이 흐려진다. 떨림이 없는 주는 항상 최대 2배
  scrollPauseMs: 150,          // 스크롤이 멈춘 뒤 이만큼 지나야 카펫 떨림을 다시 그린다(ms). 스크롤 중 끊김을 줄인다. 박스 떨림(CSS)은 계속된다
  resizeDebounceMs: 150,       // 창 크기를 바꿀 때 마지막 변화 뒤 이만큼 기다렸다가 한 번만 다시 놓는다(ms)
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
  focusWidth: 250,             // 누르면 커지는 박스의 폭(px). 보이는 영역보다 넓으면 영역에 맞춘다
  focusPad: 16,                // 커진 박스 안쪽 여백(px)
  focusMargin: 12,             // 커진 박스가 화면 가장자리(양옆·헤더 아래·아래 메모지 위)에서 띄우는 거리(px)
  focusCoverPad: 3,            // 커진 박스가 원래 박스보다 사방으로 이만큼 더 덮는다(px). 기울어 있던 박스의 모서리가 삐져나오지 않게
  vanishMs: 280,               // 없어지는 박스가 투명해지는 시간(ms). 그동안 카펫은 줄어든 무게만큼 올라온다
  dragMovePx: 6,               // 마우스로 이만큼 움직이면 끌기가 시작된다(px). 그 전에 놓으면 그냥 누르기
  dragLongPressMs: 300,        // 터치는 이만큼 길게 눌러야 끌기가 시작된다(ms). 그 전에 움직이면 스크롤·주 넘기기 스와이프
  dragGhostOpacity: 0.62,      // 마우스를 따라오는 박스 복사본의 투명도
  dragSourceOpacity: 0.35,     // 끄는 동안 원래 박스의 투명도
  dragEdgeWidth: 72,           // 화면 왼쪽·오른쪽 끝의 주 이동 구역 폭(px). 날짜칸 바깥쪽 일부와 겹치고 이 구역이 우선한다
  dragEdgeDwellMs: 700,        // 주 이동 구역에 이만큼 머물면 한 주 넘어간다(ms). 계속 머물면 또 넘어간다
  dragTopExtra: 12,            // 위쪽 취소 구역은 헤더 높이에서 이만큼 더 아래까지(px)
  focusMs: 260,                // 커지고 줄어드는 시간(ms)
  focusTitleFont: 17,          // 커진 박스의 제목 글자 크기(px)
  focusFont: 13,               // 그 밖의 글자 크기(px)
  sealInset: 0.2,              // 도장 중심이 박스 오른쪽 위 모서리에서 안쪽으로 들어간 거리(도장 지름의 배수). 작을수록 더 튀어나간다
  sealLobes: 18,               // 도장 가장자리의 물결 수
  carpetFlatRatio: 0.75,       // 카펫이 처졌을 때 칸 폭 중 평평한 바닥 비율. 키우면 바닥이 넓고 날짜 사이 경사가 가팔라진다(박스 폭보다 작으면 박스 끝이 경사 위로 살짝 나온다)
  // --- 주 넘기기(아이폰 홈 화면 식 슬라이드) ---
  slideMs: 420,                // 페이지가 옆으로 넘어가는 시간(ms)
  slideEase: 'cubic-bezier(0.22, 0.9, 0.3, 1)', // 빠르게 출발해 부드럽게 멈추는 곡선
  swipeCommitRatio: 0.22,      // 터치로 화면 폭의 이만큼 이상 밀고 놓으면 다음 주로 넘어간다(미만이면 제자리로 돌아간다)
  swipeCommitSpeed: 0.45,      // 그보다 덜 밀었어도 이 속도(px/ms) 이상으로 휙 밀면 넘어간다
  physics: {},                 // carpet-physics.js의 DEFAULTS를 덮어쓰는 값. 예: { gravity: 3000, restitution: 0.4 } (튕김·출렁임 조절)
};

(function () {
  if (new URLSearchParams(location.search).get('carpet') !== 'next') return;

  document.documentElement.classList.add('carpet-next-on'); // 옛 카펫을 숨기고 새 카펫 자리를 연다
  const stage = document.getElementById('carpet-next');
  stage.hidden = false;
  // 한 주 = 한 페이지(.cn-world). 페이지마다 눈금·날짜 숫자·카펫·박스·도장과 자기 물리 세계를 따로 갖는다.
  // 주를 넘기면 새 페이지를 만들어 슬라이드로 들이고 옛 페이지는 치운다. 완료 도장 모양은 한 번만 정의해 모든 페이지가 쓴다
  stage.innerHTML = '<div class="cn-pages"></div>'
    + '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="cn-seal-sym" viewBox="-50 -50 100 100">'
    + `<path style="fill:var(--seal-fill);stroke:var(--seal-edge);stroke-width:1.4" d="${BoxIcons.sealPath(STAGE_STYLE.sealLobes)}"/>`
    // 체크: 선 두께를 스티치와 같게(--stitch-width, 화면 크기 그대로: non-scaling-stroke), 끝은 스티치처럼 둥글게
    + '<polyline points="-23,2 -8,17 23,-17" style="fill:none;stroke:var(--seal-check);stroke-width:var(--stitch-width);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke"/>'
    + '</symbol></svg>';
  const pagesEl = stage.querySelector('.cn-pages');
  const S = INTRO_STYLE;
  const G = STAGE_STYLE;
  stage.style.setProperty('--jig-deg', `${G.jiggleDeg}deg`); // 박스 떨림 각도를 CSS 애니메이션에 넘긴다
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weekLabelEl = document.getElementById('week-label');

  let active = null;      // 지금 보이는 페이지
  let introDone = false;  // 첫 입장 롤 펼침이 끝나기 전에는 주를 넘길 수 없다

  // ---- 작은 도우미 ----

  function cssNum(name) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); }

  // 문자열에서 0~1 값을 결정적으로 뽑는다. 같은 박스는 늘 같은 크기·자리·기울기다(새로고침·창 크기 변경에도)
  function hash01(text, salt) {
    let h = 2166136261;
    const s = text + '#' + salt;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  }

  // 시간(분)을 짧게: 30분, 1시간, 1시간30분
  function shortDuration(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h && m) return `${h}시간${m}분`;
    if (h) return `${h}시간`;
    return `${m}분`;
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

  // 헤더의 월 표시("Red Carpet ∙ 12월")와 패치의 날짜 범위: 보이는 주 기준. 월은 그 주의 목요일이 든 달(두 달에 걸치면 날이 더 많은 쪽)
  const monthEl = document.getElementById('header-month');
  const monthSize = cssNum('--header-month-num-size');
  function setHeader(page) {
    const monthNum = Number(page.dates[3].slice(5, 7));
    monthEl.setAttribute('aria-label', `${monthNum}월`);
    monthEl.querySelector('.num').innerHTML = monthNumberSvg(monthNum, monthSize);
    monthEl.hidden = false;
    if (weekLabelEl) weekLabelEl.textContent = `${page.dates[0]} ~ ${page.dates[6]}`;
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

  // ---- 로딩 단계. 옛 카펫이 처음 그릴 때 하는 계산(마지막 배치 결과 placedDate 저장 포함). 단계마다 따로 실행해 그 사이에 화면이 그려지게 한다. 처음 두 단계는 다시 그릴 때(refreshCarpet)도 다시 돌린다 ----
  const work = {};
  const phases = [
    () => { // 1. 읽기
      work.today = todayStr();
      work.activeSteps = state.steps.filter(st => !st.done);
      work.doneSteps = state.steps.filter(st => st.done && st.doneDate);
    },
    () => { // 2. 배치 계산(어느 주든 같은 배치 결과를 쓴다)
      const s = state.settings;
      work.params = {
        steps: work.activeSteps, doneSteps: work.doneSteps, goals: state.goals, events: state.events, today: work.today,
        capacity: s.capacity, safeRatio: s.safeRatio, sleepHours: s.sleepHours, lifeHours: s.lifeHours, placeMode: s.placeMode,
      };
      work.placements = Placement.placeSteps(work.params);
      // 마지막 배치 결과를 저장해 둔다(다음에 앱을 열 때 자동 밀림 판정에 쓴다)
      let placedChanged = false;
      work.placements.forEach(p => {
        const st = work.activeSteps.find(x => x.id === p.stepId);
        const date = p.date || undefined;
        if (st && st.placedDate !== date) { st.placedDate = date; placedChanged = true; }
      });
      if (placedChanged) saveState();
    },
    () => { // 3. 첫 주(이번 주) 7일 구성
      first.stats = statsFor(first.offset);
    },
    () => {}, // 4. 그리기 준비
  ];
  let workDone = 0;
  const nextTask = () => new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));

  // offset주 뒤(음수는 앞)의 7일 구성. 보이는 주가 아니어도 같은 배치 결과로 계산한다
  function statsFor(offset) {
    const start = Placement.addDays(Placement.weekStart(work.today), offset * 7);
    const dates = Placement.dateRange(start, Placement.addDays(start, 6));
    return dates.map(date => Placement.dayStats({ ...work.params, date, placements: work.placements }));
  }

  // ---- 페이지 ----

  // 페이지 하나를 만들어 붙인다. intro: 첫 입장 롤 펼침 층(가리개·깔린 카펫·롤)도 같이 만든다
  function createPage(offset, intro) {
    const start = Placement.addDays(Placement.weekStart(todayStr()), offset * 7);
    const dates = Placement.dateRange(start, Placement.addDays(start, 6));
    const el = document.createElement('div');
    el.className = 'cn-world';
    // 층(아래부터): 눈금(그려 두고 안 바뀜) -> 가리개(롤 앞의 눈금을 숨김) -> 깔린 카펫(처음 직선) -> 처진 카펫 -> 박스 -> 도장 -> 롤.
    // 움직이는 것은 층을 따로 둬서, 박스 하나가 움직일 때 눈금 점선이나 다른 박스까지 다시 그려지지 않게 한다(Safari 렉 방지).
    el.innerHTML = '<svg class="cn-grid" aria-hidden="true"><g class="grid"></g></svg>'
      + (intro ? '<div class="cn-cover"></div><div class="cn-laid"></div>' : '')
      + '<canvas class="cn-shadow" aria-hidden="true"></canvas>'
      + '<canvas class="cn-carpet" aria-hidden="true"></canvas>'
      + '<div class="cn-drop"></div><div class="cn-boxes"></div><div class="cn-seals"></div><div class="cn-focus"></div>'
      + (intro ? '<svg class="cn-roll" aria-hidden="true"><path/></svg>' : '');
    pagesEl.appendChild(el);
    const q = sel => el.querySelector(sel);
    const page = {
      offset, dates, stats: [], el, sim: null, m: null, mKey: '', gridKey: '',
      gridSvg: q('.cn-grid'), gridG: q('.grid'), carpetCanvas: q('.cn-carpet'),
      dropEl: q('.cn-drop'), boxesEl: q('.cn-boxes'), sealsEl: q('.cn-seals'), focusEl: q('.cn-focus'), shadowEl: q('.cn-shadow'),
      coverEl: q('.cn-cover'), laidEl: q('.cn-laid'), rollSvg: q('.cn-roll'), rollPath: q('.cn-roll path'),
    };
    [page.rollPath].filter(Boolean).forEach(p => {
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', S.lineColor);
      p.setAttribute('stroke-width', S.lineWidth);
      p.setAttribute('stroke-linejoin', 'round');
    });
    if (page.laidEl) { page.laidEl.style.height = `${S.lineWidth}px`; page.laidEl.style.background = S.lineColor; }
    if (page.coverEl) page.coverEl.style.background = getComputedStyle(document.body).backgroundColor; // 페이지 바탕색: 롤 앞쪽 눈금을 이 색으로 덮어 숨긴다
    return page;
  }

  function removePage(page) {
    stopSim(page);
    page.el.remove();
  }

  // ---- 세로 배치 ----

  // 주와 상관없는 배치: 땅 높이, 위로 끌어올리는 양, 부하 1당 높이(unit), 예산선 깊이. 화면 폭·높이·예산이 바뀔 때만 다시 잰다
  let baseKey = '', B = null;
  function baseLayout(width) {
    const capacity = state.settings.capacity;
    const key = `${width},${window.innerHeight},${capacity}`;
    if (key === baseKey) return B;
    baseKey = key;
    const P = { spacing: S.spacing, coreRadius: S.coreRadius };
    const startMargin = S.entryGap + S.lineWidth / 2;
    const radius0 = CarpetRoll.rollPose({ progress: 0, width, ...P, groundY: 0, startMargin }).radius;
    const groundY = S.topMargin + 2 * radius0;     // 페이지 안에서 땅 높이: 롤 지름 + 위 여백
    const headerBottom = parseFloat(getComputedStyle(document.body).paddingTop) || 0; // 헤더 아랫단 높이(화면 위에서)
    pagesEl.style.marginTop = '0px';
    const stageTop = pagesEl.getBoundingClientRect().top + window.scrollY;
    // 위 여백 줄이기: 그림은 그대로 두고 통째로 위로 끌어올려, 처음 롤 윗부분이 지름의 rollTuckRatio만큼 헤더 뒤로 들어가게 한다
    const diameter = groundY - S.topMargin;
    const lift = Math.max(0, stageTop + S.topMargin - headerBottom + G.rollTuckRatio * diameter);
    pagesEl.style.marginTop = `${-lift}px`;
    const svgTop = stageTop - lift;
    const lineY = svgTop + groundY;                // 카펫 선의 화면 높이
    const topSpace = lineY - headerBottom;         // 위쪽 여백: 헤더 아랫단 ~ 카펫 선
    // 예산선(맨 아래 가로선): 아래쪽 '할 일' 메모지의 왼쪽 위 꼭짓점보다 조금 아래. 메모지를 못 찾으면 위쪽 여백과 같은 아래 여백
    const corner = noteCornerY();
    const budgetY = corner === null ? window.innerHeight - topSpace : corner + G.budgetBelowCorner;
    const refSag = Math.max(G.minSag, budgetY - lineY);   // 기준 예산(refCapacity)일 때의 예산선 깊이
    const unit = refSag / G.refCapacity;                  // 부하 1당 높이(px). 예산 설정이 바뀌어도 그대로다
    const rollSize = Math.ceil(2 * (radius0 + S.lineWidth));
    B = { P, startMargin, groundY, lift, sag: unit * capacity, unit, capacity, topSpace, svgTop, radius0, rollSize, corner };
    return B;
  }

  // 페이지 높이: 가장 무거운 날 기준(예산을 넘으면 예산선 밑까지). 바뀌었으면 층 크기를 다시 맞춘다
  function metrics(page, width) {
    const b = baseLayout(width);
    const maxLoad = Math.max(0, ...page.stats.map(st => st.load));
    const key = `${baseKey}|${maxLoad}`;
    if (page.mKey === key) return page.m;
    page.mKey = key;
    const deepest = b.unit * Math.max(b.capacity, maxLoad);
    const height = Math.ceil(b.groundY + deepest + G.scrollTail + 2);
    const m = page.m = { ...b, maxLoad, deepest, height };
    // 층 크기: 모든 층이 같은 좌표계(왼쪽 위가 (0,0))를 쓴다
    page.el.style.height = `${height}px`;
    page.gridSvg.setAttribute('width', width); page.gridSvg.setAttribute('height', height); // 카펫 캔버스는 그릴 때마다 크기를 맞춘다(화면 배율이 바뀔 수 있다)
    if (page.laidEl) { page.laidEl.style.top = `${b.groundY - S.lineWidth / 2}px`; page.laidEl.style.width = `${width}px`; }
    if (page.coverEl) { page.coverEl.style.height = `${height}px`; page.coverEl.style.width = `${width}px`; }
    if (page.rollSvg) { page.rollSvg.setAttribute('width', b.rollSize); page.rollSvg.setAttribute('height', b.rollSize); }
    if (page === active) applyContainer(m);
    return m;
  }

  // 보이는 페이지의 높이를 바깥 틀에 반영. 화면보다 길어지면 아래로 스크롤된다. 맨 아래까지 내려도 고정된 아래 두 버튼에 카펫이 가리지 않게 그 높이만큼 아래 여백을 둔다
  function applyContainer(m) {
    pagesEl.style.height = `${m.height}px`;
    const dockClear = Math.max(0, window.innerHeight - (m.corner === null ? window.innerHeight - 170 : m.corner)) + 16;
    pagesEl.style.marginBottom = m.svgTop + m.height > window.innerHeight ? `${dockClear}px` : '0px';
  }

  // ---- 눈금(7칸을 화면 너비로 똑같이 나눠 그린다. 오늘 칸은 배경). 폭이나 높이가 바뀔 때만 다시 만든다 ----
  function drawGrid(page, m, width) {
    const key = [width, m.groundY, m.height, m.sag, m.topSpace, page.dates[0], m.capacity, state.settings.safeRatio, todayStr()].join();
    if (key === page.gridKey) return;
    page.gridKey = key;
    const cs = getComputedStyle(document.documentElement);
    const dash = cs.getPropertyValue('--stitch-dash').trim(), gap = cs.getPropertyValue('--stitch-gap').trim();
    const stitchW = cs.getPropertyValue('--stitch-width').trim(), yarn = cs.getPropertyValue('--stitch-color').trim();
    const stitch = `stroke-dasharray="${dash} ${gap}" stroke-width="${stitchW}" stroke-linecap="round"`;
    const st = state.settings;
    const dates = page.dates;
    const colW = width / 7;
    const columns = dates.map((_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const shape = Carpet.carpetShape({
      loads: dates.map(() => 0), capacity: st.capacity, safeRatio: st.safeRatio, columns, width,
      baseY: m.groundY, maxSag: m.sag, gridMaxLines: G.gridMaxLines,
    });
    const todayIdx = dates.indexOf(todayStr());
    page.gridG.innerHTML =
      (todayIdx >= 0 ? `<rect x="${columns[todayIdx].left}" y="${m.groundY}" width="${colW}" height="${m.sag}" fill="${G.todayFill}"/>` : '')
      + shape.gridLines.map(g => `<line x1="0" y1="${g.y}" x2="${width}" y2="${g.y}" stroke="${g.isBudget ? G.budgetColor : G.gridColor}" stroke-width="${G.gridWidth}"/>`).join('')
      + (shape.safeLine ? `<line x1="0" y1="${shape.safeLine.y}" x2="${width}" y2="${shape.safeLine.y}" stroke="${yarn}" ${stitch}/>` : '')
      + shape.dividers.map(x => `<line x1="${x}" y1="${m.groundY}" x2="${x}" y2="${m.groundY + m.sag}" stroke="${G.dividerColor}" ${stitch}/>`).join('')
      + dateNumbers(columns, dates, colW, m.groundY, m.topSpace);
  }

  // ---- 첫 입장 롤 그리기. eased는 0~1(곡선을 입힌 진행도). 눈금은 이미 그려 있고, 가리개를 오른쪽으로 밀어 드러낸다 ----
  function draw(page, eased) {
    const width = page.el.clientWidth || stage.clientWidth + 32;
    const m = metrics(page, width);
    const pose = CarpetRoll.rollPose({ progress: eased, width, ...m.P, groundY: m.groundY, startMargin: m.startMargin });
    drawGrid(page, m, width);
    const contact = Math.max(0, pose.contactX);
    page.coverEl.style.display = '';
    page.coverEl.style.transform = `translate3d(${contact.toFixed(1)}px,0,0)`;           // 롤이 지나간 자리까지만 눈금이 보인다
    page.laidEl.style.display = '';
    page.laidEl.style.transform = `scaleX(${(contact / width).toFixed(4)})`;              // 깔린 카펫이 롤을 따라 늘어난다
    // 롤: 중심을 그림 한가운데로 옮긴 작은 그림. 위치는 transform으로 옮기고, 굴러서 작아지는 모양만 다시 그린다
    const half = m.rollSize / 2;
    page.rollSvg.style.transform = `translate3d(${(pose.cx - half).toFixed(1)}px,${(pose.cy - half).toFixed(1)}px,0)`;
    const pts = pose.theta > 0.001 ? CarpetRoll.spiralPoints(pose, m.P) : [];
    page.rollPath.setAttribute('d', pts.length > 1 ? 'M' + pts.map(([x, y]) => `${(x - pose.cx + half).toFixed(1)} ${(y - pose.cy + half).toFixed(1)}`).join('L') : '');
  }

  // ---- 박스: 날짜별 일정(fixed)·완료한 단계(done)·남은 단계(todo)가 위에서 떨어져 쌓이고, 카펫이 무게만큼 눌린다 ----

  // 그 주 항목을 박스 목록으로. 한 날짜 안에서는 일정 -> 완료 -> 남은 단계 순(먼저 떨어진 것이 아래에 깔린다)
  function boxItems(page) {
    const items = [];
    const goalTitle = new Map(state.goals.map(g => [g.id, g.title])); // 단계의 상위 할 일
    page.stats.forEach((st, col) => {
      st.events.forEach(ev => items.push({ id: `ev:${ev.id}:${st.date}`, col, load: ev.load, kind: 'fixed', title: ev.title, minutes: Placement.eventDurationMinutes(ev), push: 0, eventId: ev.id, date: st.date }));
      st.doneSteps.forEach(s => items.push({ id: `done:${s.id}`, col, load: s.load, kind: 'done', title: s.title, goal: goalTitle.get(s.goalId) || '', minutes: s.minutes, push: s.pushCount || 0, stepId: s.id }));
      st.steps.forEach(({ step }) => items.push({ id: `step:${step.id}`, col, load: step.load, kind: 'todo', title: step.title, goal: goalTitle.get(step.goalId) || '', minutes: step.minutes, push: step.pushCount || 0, stepId: step.id }));
    });
    return items.filter(it => it.load > 0);
  }

  // 박스 안 내용(글자만, 눌러서 동작하는 것은 없다). 박스 높이(부하)에 따라 배치가 달라진다:
  //  col: 제목 여러 줄 + (자리가 남으면 흐린 상위 할 일) + 아래 아이콘 줄(밀림·시간·부하)   row: 한 줄에 제목과 아이콘(밀림·시간). 부하는 박스 높이가 이미 보여 주므로 뺀다
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
  // 박스 크기에 맞는 점선 들어간 거리와 모서리 둥글기
  function boxLook(w, h) {
    return { inset: Math.max(G.boxInsetMin, Math.min(G.boxInsetMax, (h - 22) / 3)), radius: Math.min(cssNum('--box-radius'), h / 2.6, w / 4) };
  }

  function makeBoxEl(page, box, kind, item) {
    const { inset, radius } = boxLook(box.w, box.h);
    const el = document.createElement('div');
    el.className = `cn-box ${kind}`;
    el.dataset.id = item.id;
    el.style.cssText = `width:${box.w.toFixed(1)}px;height:${box.h.toFixed(1)}px;margin:${(-box.h / 2).toFixed(1)}px 0 0 ${(-box.w / 2).toFixed(1)}px;border-radius:${radius.toFixed(1)}px`;
    el.innerHTML = `<svg class="stitch" width="${box.w.toFixed(1)}" height="${box.h.toFixed(1)}" viewBox="0 0 ${box.w.toFixed(1)} ${box.h.toFixed(1)}" aria-hidden="true">`
      + `<rect x="${inset.toFixed(1)}" y="${inset.toFixed(1)}" width="${(box.w - inset * 2).toFixed(1)}" height="${(box.h - inset * 2).toFixed(1)}" rx="${Math.max(0, radius - inset).toFixed(1)}"/></svg>`
      + boxContent(item, box.w, box.h, inset);
    page.boxesEl.appendChild(el);
    return el;
  }

  // 완료 도장: 박스 오른쪽 위 모서리에 조금 튀어나가게 붙는다. 박스 층과 따로 둔 위층에 있어서 위에 쌓인 박스에 가려지지 않고,
  // 물리 계산에는 아무 영향이 없다(보이는 것만). 박스와 같은 transform을 받아 따라다닌다
  function makeSealEl(page, box) {
    const tiny = box.h < G.sealTinyBelow;
    const s = tiny ? G.sealSizeTiny : G.sealSize;
    const wrap = document.createElement('div');
    wrap.className = 'cn-seal-wrap';
    const left = box.w / 2 - G.sealInset * s - s / 2, top = -box.h / 2 + G.sealInset * s - s / 2;
    wrap.innerHTML = `<svg class="cn-seal" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${s}px;height:${s}px" aria-hidden="true"><use href="#cn-seal-sym"/></svg>`;
    page.sealsEl.appendChild(wrap);
    return wrap;
  }

  // 지금 세계 상태를 화면에 반영: 카펫 선(처짐)과 박스 위치
  // boxes: 위치를 다시 잡을 박스들(기본은 전부. 떨림 루프는 떠는 박스만 넘긴다)
  // lineOnly: 카펫 선만 다시 그리고 그림자는 그대로 둔다(떨림 루프: 떨림은 작아서 그림자가 따라갈 필요가 없다)
  function renderSim(page, now = 0, boxes = page.sim.world.boxes, lineOnly = false) {
    const sim = page.sim;
    const { world, els, width } = sim;
    const m = metrics(page, width);
    const t = now / 1000;
    // 예산 초과인 날의 카펫은 위아래로 떤다(박스는 그 위에 얹혀 같이 움직인다). 곡선은 이웃 날짜와 이어져 있어 가운데로 갈수록 크게 떨리는 것처럼 보인다
    const osc = c => (sim.fidget && sim.over[c] ? G.jiggleCarpetPx * Math.sin(2 * Math.PI * G.jiggleCarpetHz * t + c * 1.7) : 0);
    // 카펫 모양 계산은 부하가 예산을 넘으면 더 처지지 않으므로, 가장 깊은 날 기준으로 '예산'을 키워 넘기고 깊이도 같은 비율로 키운다(부하 1당 높이 unit은 그대로)
    const loads = world.sag.map((s, c) => (s + osc(c)) / m.unit);
    const cEff = Math.max(world.capacity, ...loads) + 1e-6;
    const shape = Carpet.carpetShape({
      loads, capacity: cEff, columns: world.columns, width, baseY: m.groundY, maxSag: m.unit * cEff, flatRatio: G.carpetFlatRatio, curve: 0.5,
    });
    drawCarpet(page, shape, width, m, !lineOnly); // 카펫 선과 그림자를 같은 곡선으로 같은 프레임에 그린다(떨림 루프에서는 선만)
    if (!sim.carpetShown) {
      showShadow(page); // 카펫이 처음 그려질 때 그림자도 같이 서서히 나타난다. 이후로는 숨기지 않고 카펫을 따라 계속 그려진다 // 처음 한 번: 롤이 깔아 둔 직선과 가리개를 걷고 처지는 카펫으로 넘긴다(처음에는 같은 직선이라 티가 안 난다)
      sim.carpetShown = true;
      if (page.laidEl) page.laidEl.style.display = 'none';
      if (page.coverEl) page.coverEl.style.display = 'none';
    }
    boxes.forEach(b => {
      const el = els.get(b.id);
      if (!el) return;
      // 예산 초과인 날의 박스는 자리를 잡은 뒤 홈 화면 수정 모드의 아이콘처럼 벌벌 떤다(박스마다 빠르기와 시작점이 다르다)
      const jig = sim.fidget && b.landed && sim.over[b.col];
      const seal = sim.seals.get(b.id);
      if (jig && !b.jigOn) startJig(b, el, seal); // 박스 떨림은 CSS 애니메이션(rotate)이 하므로 JS는 켜기만 한다
      const y = b.y + (jig ? osc(b.col) : 0); // 카펫이 떠는 만큼은 위치로 따라간다
      const pos = `${b.x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (b.lastT !== pos) { // 움직인 박스만 바꾼다. 위치는 translate, 기울기는 transform, 떨림은 rotate 속성이 따로 맡아 서로 곱해진다
        b.lastT = pos;
        el.style.translate = pos;
        if (seal) seal.style.translate = pos;
      }
    });
  }

  // 예산 초과인 날의 박스 떨림을 켠다: 박스마다 빠르기와 시작점이 다른 CSS 애니메이션(style.css .jig). 메인 스레드는 쓰지 않는다
  function startJig(b, el, seal) {
    b.jigOn = true;
    const half = 1 / (2 * G.jiggleHz * (0.9 + 0.2 * b.jr)); // 한 방향으로 가는 시간(초). 왕복이 한 주기
    const delay = -((b.jp + Math.PI / 2) / Math.PI) * half;   // 사인 곡선의 시작점(jp)에 맞춘다
    [el, seal].forEach(e => {
      if (!e) return;
      e.style.setProperty('--jig-dur', `${half.toFixed(4)}s`);
      e.style.setProperty('--jig-delay', `${delay.toFixed(4)}s`);
      e.classList.add('jig');
    });
  }

  // 박스를 세계에 넣는다. 같은 열에서 방금 떨어진 박스와 겹치지 않게, 그 위쪽에서 시작한다
  function spawn(page, item) {
    const sim = page.sim;
    const { world, width, unit, colW } = sim;
    const col = world.columns[item.col];
    // 한 칸의 첫 박스(맨 아래에 깔린다)는 칸 가운데, 기울지 않고, 가로로 움직이지 않는다. 폭은 카펫 평평한 바닥 안에 들어가게 해서 경사에 걸리지 않는다
    const isBottom = !world.boxes.some(b => b.col === item.col);
    let w = colW * (G.boxWidthMin + (G.boxWidthMax - G.boxWidthMin) * hash01(item.id, 'w'));
    if (isBottom) w = Math.min(w, colW * G.carpetFlatRatio * G.bottomBoxFit);
    const h = item.load * unit;
    const x = (col.left + col.right) / 2 + (isBottom ? 0 : (hash01(item.id, 'x') - 0.5) * (colW - w) * 0.85);
    // 화면 맨 위 바로 위(헤더 뒤)에서 시작하되 박스마다 시작 높이가 다르다. 같은 칸의 앞 박스보다는 boxSpawnGap만큼 위에서 시작한다
    let bottom = -metrics(page, width).svgTop - 24 - hash01(item.id, 'drop') * G.boxDropJitter;
    world.boxes.forEach(b => { if (b.col === item.col) bottom = Math.min(bottom, b.y - b.h / 2 - G.boxSpawnGap); });
    const box = CarpetPhysics.addBox(world, {
      id: item.id, col: item.col, x, y: bottom - h / 2, w, h, load: item.load,
      vx: isBottom ? 0 : (hash01(item.id, 'v') - 0.5) * 2 * G.boxSpawnVx,
      lockX: isBottom,
    });
    box.tilt = isBottom ? 0 : (hash01(item.id, 't') - 0.5) * 2 * G.boxTiltDeg;
    box.jp = hash01(item.id, 'jp') * Math.PI * 2; // 예산 초과인 날의 떨림: 박스마다 시작점과 빠르기가 다르다
    box.jr = hash01(item.id, 'jr');
    const boxEl = makeBoxEl(page, box, item.kind === 'todo' ? 'todo' : item.kind === 'fixed' ? 'paper fixed' : 'paper', item);
    sim.els.set(item.id, boxEl);
    boxEl.style.transform = `rotate(${box.tilt.toFixed(2)}deg)`; // 기울기는 한 번만 정한다(위치는 translate, 떨림은 rotate 속성)
    if (item.kind === 'done') {
      const seal = makeSealEl(page, box);
      seal.style.transform = boxEl.style.transform;
      sim.seals.set(item.id, seal);
    }
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

  function stopSim(page) {
    const sim = page.sim;
    if (!sim) return;
    if (sim.raf) cancelAnimationFrame(sim.raf);
    if (sim.fidgetRaf) cancelAnimationFrame(sim.fidgetRaf);
    sim.raf = sim.fidgetRaf = 0;
  }

  // ---- 카펫 아래 그림자(차트 채우기 영역처럼): 카펫 선과 같은 곡선으로 같은 프레임에 매번 그려서, 눌리고 떨리는 카펫을 실시간으로 따라간다. ----
  // 카펫이 처음 그려질 때 서서히 나타나고, 그 뒤로는 숨기지 않는다(주 넘기기 때는 그 주의 카펫과 같이 밀려 들어오고 나간다).
  // 모양 값. 숫자나 색을 바꾸고 새로고침하면 바로 보인다
  const SHADOW_STYLE = {
    rgb: '0,0,0',        // 그림자 색(처음엔 검정)
    overRgb: '170,25,45', // 예산을 넘긴 날짜 칸의 그림자 색(붉은 톤). 이웃 칸과 경계에서 부드럽게 섞인다
    mixSteps: 16,        // 검정과 붉은색 사이를 몇 단계로 나눠 섞을지. 줄마다 그라데이션을 새로 만들지 않고 이 단계 수만큼 만들어 재사용한다
    alpha: 0.15,         // 카펫 곡선 바로 아래의 진하기(0~1). 아래로 갈수록 곡선을 따라 옅어진다
    fadeLength: 160,     // 곡선에서 완전히 투명해지기까지의 깊이(px)
    resolution: 0.5,     // 그림자를 그리는 해상도(1이면 화면 픽셀 그대로). 부드러운 그림자라 절반으로 그려도 티가 나지 않고 메모리를 아낀다
    fadeInMs: 350,       // 카펫이 처음 그려질 때 그림자가 나타나는 시간(ms). 카펫이 눌리고 떨리는 것은 그림자가 실시간으로 따라간다
  };

  // 캔버스 크기를 맞춘다(CSS 크기는 화면 픽셀, 캔버스 크기는 scale배). 크기가 같으면 아무것도 하지 않는다. 캔버스 크기를 바꾸면 내용이 지워진다
  function sizeCanvas(el, cssW, cssH, scale) {
    const w = Math.ceil(cssW * scale), h = Math.ceil(cssH * scale);
    if (el.width === w && el.height === h) return false;
    el.width = w; el.height = h; // 크기를 바꾸면 내용이 다 지워진다
    el.style.width = `${cssW}px`; el.style.height = `${cssH}px`;
    return true;
  }

  // 캔버스에서 지울 세로 범위(CSS px): 이번 띠와 지난번 띠를 합친 만큼만. 처음이거나 크기가 바뀌어 이미 지워졌으면 전체
  function dirtyRange(page, key, band, total, resized) {
    const prev = resized ? null : page[key];
    page[key] = band;
    return prev ? [Math.max(0, Math.min(prev.top, band.top)), Math.min(total, Math.max(prev.bottom, band.bottom))] : [0, total];
  }

  // 카펫 선과 그 아래 그림자를 캔버스에 그린다. 선은 화면 배율(최대 2배)로 또렷하게, 그림자는 부드러워 절반 해상도로.
  // 박스가 눌러 처지는 동안과 예산 초과로 떠는 동안에도 같은 곡선으로 같은 프레임에 그려서 그림자가 카펫을 실시간으로 따라간다
  function drawCarpet(page, shape, width, m, withShadow = true) {
    const k = Math.min(page.sim && page.sim.fidget ? G.jiggleCarpetScaleMax : 2, window.devicePixelRatio || 1); // 떠는 주는 낮은 배율(큰 캔버스를 자주 그리지 않게)
    const el = page.carpetCanvas;
    const resized = sizeCanvas(el, width, m.height, k);
    const ctx = el.getContext('2d');
    const pad = S.lineWidth / 2 + 2; // 선 두께의 절반과 여유
    const [y0, y1] = dirtyRange(page, 'carpetBand', { top: shape.band.top - pad, bottom: shape.band.bottom + pad }, m.height, resized);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, Math.floor(y0 * k), el.width, Math.ceil((y1 - y0) * k) + 1); // 선이 지나는 띠만 지운다
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.lineWidth = S.lineWidth;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = S.lineColor;
    ctx.stroke(new Path2D(shape.linePath));
    if (withShadow) drawShadow(page, shape, width, m);
  }

  // 그림자: 가로 한 줄마다 곡선 바로 아래에서 시작해 아래로 옅어지는 세로 그라데이션을 한 줄씩. 곡선을 따라가고 계단이 없다.
  // 예산을 넘긴 날짜 칸은 붉은 톤, 이웃 칸과는 카펫 곡선처럼 S자로 섞인다. 캔버스 맨 아래에 닿는 줄은 그림자를 세로로 줄여 맨 아래에서 정확히 투명해지게 한다(싹둑 잘려 보이지 않게)
  function drawShadow(page, shape, width, m) {
    const el = page.shadowEl;
    if (!el) return;
    const k = SHADOW_STYLE.resolution;
    const resized = sizeCanvas(el, width, m.height, k);
    const ctx = el.getContext('2d');
    const fade = SHADOW_STYLE.fadeLength;
    const steps = SHADOW_STYLE.mixSteps;
    const [y0, y1] = dirtyRange(page, 'shadowBand', { top: shape.band.top, bottom: shape.band.bottom + fade }, m.height, resized); // 그림자는 곡선에서 fade만큼 아래까지
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, Math.floor(y0 * k), el.width, Math.ceil((y1 - y0) * k) + 1);
    if (!page.shadowGrads) { // 검정(0)에서 붉은색(steps)까지 단계마다 그라데이션 하나. 모양이 고정이라 한 번 만들어 계속 쓴다. 곡선 높이를 0으로 둔 것을 줄마다 옮겨 재사용한다
      const stops = CarpetShadow.falloffStops(SHADOW_STYLE.alpha);
      page.shadowGrads = Array.from({ length: steps + 1 }, (_, b) => {
        const rgb = CarpetShadow.mixRgb(SHADOW_STYLE.rgb, SHADOW_STYLE.overRgb, b / steps);
        const g = ctx.createLinearGradient(0, 0, 0, fade);
        stops.forEach(([t, a]) => g.addColorStop(t, `rgba(${rgb},${a})`));
        return g;
      });
    }
    const grads = page.shadowGrads;
    const step = 1 / k; // 가로로 한 줄 폭(화면 픽셀). 해상도 절반이면 2px
    const over = page.sim ? page.sim.over : [];
    const ys = CarpetShadow.curveYs({ linePath: shape.linePath, width, step });
    const weightsKey = `${over.map(Number).join('')}|${width}|${step}`; // 붉은 톤 가중치는 어느 날이 초과인지와 폭에만 달렸다
    if (!page.shadowWeights || page.shadowWeights.key !== weightsKey) page.shadowWeights = { key: weightsKey, w: CarpetShadow.overWeights({ over, width, flatRatio: G.carpetFlatRatio, step }) };
    const weights = page.shadowWeights.w;
    ys.forEach((y, i) => {
      const room = m.height - y; // 이 줄에서 캔버스 맨 아래까지 남은 높이
      if (room <= 0.5) return;
      const squeeze = Math.min(1, room / fade); // 남은 높이가 그림자보다 짧으면 그만큼 세로로 줄인다
      ctx.setTransform(k, 0, 0, k * squeeze, 0, y * k); // 이 줄의 곡선 높이가 그라데이션의 맨 위
      ctx.fillStyle = grads[Math.round(weights[i] * steps)];
      ctx.fillRect(i * step, 0, step, fade); // 줄 폭이 캔버스 픽셀의 정수배라 줄 사이에 틈도 겹침도 없다(겹치면 줄 경계에 세로 줄무늬가 진해진다)
    });
  }

  // 그림자를 서서히 보인다. 내용은 renderSim이 카펫과 같이 매번 그리므로 여기서는 투명도만 바꾼다
  function showShadow(page) {
    const el = page.shadowEl;
    if (!el) return;
    el.style.transition = reduceMotion() ? 'none' : `opacity ${SHADOW_STYLE.fadeInMs}ms ease`;
    el.classList.add('on');
    if (page === active) stage.dataset.shadow = 'on'; // 확인용
  }

  // 다 자리를 잡은 뒤에도, 예산 초과인 날이 있으면 떨림을 계속 그린다(물리 계산은 멈춰 있고 그리기만). 탭이 가려지면 브라우저가 알아서 멈춘다
  // 카펫 선은 jiggleCarpetFps로 줄여 그리고(그림자는 다시 그리지 않는다), 떠는 열의 박스 위치만 바꾼다. 슬라이드·끌기·팝업이 떠 있는 동안은 그리지 않고 CSS 박스 떨림도 멈춘다
  const openModals = document.getElementsByClassName('modal-backdrop open');
  let lastScrollAt = -Infinity;
  window.addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });
  function startFidget(page) {
    const sim = page.sim;
    if (!sim.fidget) return;
    const jigBoxes = sim.world.boxes.filter(b => sim.over[b.col]);
    const minGap = 1000 / G.jiggleCarpetFps - 2; // 프레임 간격이 조금 들쭉날쭉해도 건너뛰지 않게 여유를 둔다
    let lastDraw = -Infinity;
    const tick = now => {
      if (page.sim !== sim) return; // 새로 놓았으면 옛 루프는 끝낸다
      const paused = busy || !!drag || !!boxDrag || openModals.length > 0;
      stage.classList.toggle('cn-paused', paused);
      const scrolling = now - lastScrollAt < G.scrollPauseMs; // 스크롤 중에는 카펫만 멈춘다(CSS 박스 떨림은 그대로)
      if (!paused && !scrolling && now - lastDraw >= minGap) { lastDraw = now; renderSim(page, now, jigBoxes, true); }
      sim.fidgetRaf = requestAnimationFrame(tick);
    };
    sim.fidgetRaf = requestAnimationFrame(tick);
  }

  // mode 'drop': 박스가 위에서 하나씩 떨어진다(첫 입장, 주를 넘기는 슬라이드가 끝난 뒤).
  //      'instant': 보이지 않게 끝까지 계산해 정착한 모습만 보여 준다(창 크기가 바뀐 때, 모션 줄이기).
  //      'empty': 박스 없이 평평한 카펫만 둔다(슬라이드로 들어오는 동안. 눈금·날짜 숫자는 페이지에 붙어서 같이 들어온다)
  // dropIds(Set): 'drop'일 때 이 박스들만 떨어뜨리고 나머지는 보이지 않게 먼저 자리를 잡아 둔다(다시 그릴 때). 없으면 전부 떨어진다
  function startBoxes(page, mode, dropIds = null) {
    closeFocus(true);
    stopSim(page);
    page.boxesEl.innerHTML = '';
    page.sealsEl.innerHTML = '';
    const width = page.el.clientWidth || stage.clientWidth + 32;
    const m = metrics(page, width);
    const capacity = state.settings.capacity;
    const colW = width / 7;
    const columns = Array.from({ length: 7 }, (_, i) => ({ left: i * colW, right: (i + 1) * colW }));
    const world = CarpetPhysics.createWorld({
      columns, capacity, maxSag: m.sag, baseY: m.groundY - S.lineWidth / 2, // 박스는 카펫 선의 윗면에 얹힌다
      params: { restitution: G.boxBounce, capSag: false, ...G.physics }, // capSag false: 예산을 넘으면 카펫이 예산선 밑으로 계속 처진다
    });
    const all = boxItems(page);
    const drops = dropIds ? all.filter(it => dropIds.has(it.id)) : all;
    const stays = dropIds ? all.filter(it => !dropIds.has(it.id)) : [];
    if (mode !== 'empty') { page.items = all.map(it => ({ ...it })); page.settingsKey = settingsKey(page); } // 다시 그릴 때 무엇이 달라졌는지 견주는 기준
    const over = page.stats.map(st => st.overBudget);
    const fidget = over.some(Boolean) && !reduceMotion();
    const sim = page.sim = { world, width, colW, unit: m.unit, over, fidget, els: new Map(), seals: new Map(), pending: releaseOrder(drops), raf: 0, fidgetRaf: 0, start: 0, last: 0, released: 0, carpetShown: false };
    const debug = state => { if (page === active) { stage.dataset.boxes = String(world.boxes.length + sim.pending.length); stage.dataset.boxState = state; } };
    if (mode === 'empty') {
      sim.pending = [];
      sim.fidget = false;
      renderSim(page);
      return;
    }
    if (mode === 'instant') {
      sim.pending.forEach(item => spawn(page, item));
      sim.pending = [];
      CarpetPhysics.settle(world, 15);
      renderSim(page);
      debug('settled');
      startFidget(page);
      return;
    }
    if (stays.length) { stays.forEach(item => spawn(page, item)); CarpetPhysics.settle(world, 15); } // 그대로인 박스는 떨어뜨리지 않고 자리만 잡아 둔다
    renderSim(page); // 카펫 선을 처지는 카펫으로 먼저 넘겨 둔다(처음엔 직선)
    runFrames(page);
  }

  // 박스를 떨어뜨리고 물리를 진행해 정착할 때까지 프레임마다 그린다. 정착하면 떨림 루프로 넘어간다(처음 그릴 때와 제자리 갱신이 같이 쓴다)
  function runFrames(page) {
    const sim = page.sim, world = sim.world;
    const debug = state => { if (page === active) { stage.dataset.boxes = String(world.boxes.length + sim.pending.length); stage.dataset.boxState = state; } };
    debug('falling');
    sim.start = 0;
    function frame(now) {
      if (!sim.start) { sim.start = now; sim.last = now; sim.lastSpawnAt = now; }
      while (sim.pending.length && now - sim.start >= sim.pending[0].at) { spawn(page, sim.pending.shift()); sim.released++; sim.lastSpawnAt = now; } // 때가 된 박스를 떨어뜨린다
      CarpetPhysics.advance(world, Math.min(50, now - sim.last));
      sim.last = now;
      if (!sim.pending.length && now - sim.lastSpawnAt > G.maxSettleMs) world.settled = true; // 안전장치
      renderSim(page, now);
      if (sim.pending.length || !world.settled) sim.raf = requestAnimationFrame(frame);
      else { sim.raf = 0; debug('settled'); startFidget(page); }
    }
    sim.raf = requestAnimationFrame(frame);
  }

  // 떨림을 끈다(예산을 더 이상 넘기지 않는 날의 박스)
  function stopJig(b, el, seal) {
    b.jigOn = false;
    [el, seal].forEach(e => { if (e) { e.classList.remove('jig'); e.style.removeProperty('--jig-dur'); e.style.removeProperty('--jig-delay'); } });
  }

  // 없어지는 박스: 물리 세계에서는 바로 빼고(카펫이 올라오고 위 박스가 내려온다), 그림은 투명해진 뒤 치운다
  function vanishBox(page, id) {
    const sim = page.sim;
    const el = sim.els.get(id), seal = sim.seals.get(id);
    CarpetPhysics.removeBox(sim.world, id);
    sim.els.delete(id); sim.seals.delete(id);
    [el, seal].forEach(e => {
      if (!e) return;
      e.style.setProperty('--vanish-ms', `${G.vanishMs}ms`);
      e.classList.add('vanish');
      setTimeout(() => e.remove(), G.vanishMs + 60);
    });
  }

  // 월드를 새로 만들지 않고 바뀐 만큼만 고친다: 없어진 박스(옮겨지거나 크기가 바뀐 박스의 옛 모습 포함)는 사라지고, 새로 생기거나 옮겨진 박스는 떨어진다
  function updateInPlace(page, diff, next) {
    closeFocus(true);
    const sim = page.sim, world = sim.world;
    if (sim.fidgetRaf) { cancelAnimationFrame(sim.fidgetRaf); sim.fidgetRaf = 0; }
    const moved = diff.drop.filter(id => sim.els.has(id));
    [...diff.removed, ...moved].forEach(id => vanishBox(page, id));
    page.items = next.map(it => ({ ...it }));
    const over = page.stats.map(st => st.overBudget);
    sim.over = over;
    sim.fidget = over.some(Boolean) && !reduceMotion();
    world.boxes.forEach(b => { if (b.jigOn && !over[b.col]) stopJig(b, sim.els.get(b.id), sim.seals.get(b.id)); });
    const dropIds = new Set(diff.drop);
    sim.pending = releaseOrder(next.filter(it => dropIds.has(it.id)));
    world.settled = false; world.quiet = 0;
    runFrames(page);
  }

  // ---- 박스 누르기: 눌린 박스가 제자리에서 커져(회전 0도) 모든 정보와 버튼을 보여 준다. 원래 박스는 숨기고, 다른 박스·도장 위의 층(.cn-focus)에 큰 박스를 그린다.
  // 그래서 그 박스의 떨림·기울기는 멈추고 다른 박스는 영향이 없다. 바깥을 누르거나 Esc, 스크롤, 다시 그리기·주 이동·창 크기 변경이면 닫힌다 ----
  let focus = null; // { page, item, f, fx, el, seal, from, to, raf, closing }
  const REPEAT_TEXT = { weekly: '매주', biweekly: '격주', monthly: '매월' };
  const easeOut = k => 1 - Math.pow(1 - k, 3);

  function focusHtml(item) {
    const icon = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${BoxIcons.paths[name]}"/></svg>`;
    const metric = (name, text) => `<span class="m">${icon(name)}<b>${text}</b></span>`;
    const button = (action, label, accent) => `<button type="button" class="sbtn${accent ? ' sbtn-accent' : ''}" data-focus-action="${action}"><span>${label}</span></button>`; // 점선 없이 글자만, 오른쪽에 붙는다
    let sub = '', actions = '';
    if (item.kind === 'fixed') {
      const ev = state.events.find(e => e.id === item.eventId);
      if (ev) {
        sub = `<div class="fx-sub">${ev.start}~${ev.end}${REPEAT_TEXT[ev.repeat] ? ` · ${REPEAT_TEXT[ev.repeat]} 반복` : ''}</div>`;
        if (ev.repeat !== 'none') actions = button('skip', '이 날만 빼기', false);
      }
    } else if (item.goal) {
      sub = `<div class="fx-goal">${escapeHtml(item.goal)}</div>`;
    }
    if (item.kind === 'todo') actions = button('done', '완료', true);
    const metrics = (item.push > 0 ? metric('push', `밀림 ${item.push}회`) : '') + metric('time', shortDuration(item.minutes)) + metric('load', `부하 ${item.load}`);
    return `<div class="fx-title">${escapeHtml(item.title || '')}</div>${sub}<div class="fx-metrics">${metrics}</div>${actions ? `<div class="fx-actions">${actions}</div>` : ''}`;
  }

  // 크기·위치·기울기·모서리를 한 번에 적용(점선 사각형도 같이). r: { cx, cy, w, h, rot }
  function applyFocus(f, r) {
    const { inset, radius } = boxLook(r.w, r.h);
    f.style.width = `${r.w.toFixed(1)}px`;
    f.style.height = `${r.h.toFixed(1)}px`;
    f.style.translate = `${(r.cx - r.w / 2).toFixed(1)}px ${(r.cy - r.h / 2).toFixed(1)}px`;
    f.style.rotate = `${r.rot.toFixed(2)}deg`;
    f.style.borderRadius = `${radius.toFixed(1)}px`;
    const svg = f.querySelector('.stitch'), rect = svg.firstChild;
    svg.setAttribute('width', r.w.toFixed(1)); svg.setAttribute('height', r.h.toFixed(1));
    rect.setAttribute('x', inset.toFixed(1)); rect.setAttribute('y', inset.toFixed(1));
    rect.setAttribute('width', Math.max(0, r.w - inset * 2).toFixed(1)); rect.setAttribute('height', Math.max(0, r.h - inset * 2).toFixed(1));
    rect.setAttribute('rx', Math.max(0, radius - inset).toFixed(1));
  }

  function runFocusTween(from, to, ms, onFrame, done) {
    const ease = reduceMotion() ? (() => 1) : easeOut;
    const lerp = (a, b, k) => a + (b - a) * k;
    const t0 = performance.now();
    const tick = now => {
      const raw = ms > 0 && !reduceMotion() ? Math.min(1, Math.max(0, (now - t0) / ms)) : 1;
      const k = ease(raw);
      onFrame({ cx: lerp(from.cx, to.cx, k), cy: lerp(from.cy, to.cy, k), w: lerp(from.w, to.w, k), h: lerp(from.h, to.h, k), rot: lerp(from.rot, to.rot, k) }, raw);
      if (raw < 1) focus.raf = requestAnimationFrame(tick); else done();
    };
    focus.raf = requestAnimationFrame(tick);
  }

  function openFocus(page, id) {
    const item = (page.items || []).find(it => it.id === id);
    const sim = page.sim, el = sim && sim.els.get(id);
    const box = sim && sim.world.boxes.find(b => b.id === id);
    if (!item || !el || !box || !box.landed || !el.style.translate) return;
    // 지금 보이는 자리: 떨림이 더해진 위치와 기울기
    const [cx, cy] = el.style.translate.split(' ').map(parseFloat);
    const jig = parseFloat(getComputedStyle(el).rotate) || 0;
    const from = { cx, cy, w: box.w, h: box.h, rot: box.tilt + jig };
    // 커진 뒤 크기: 정해진 폭에서 내용이 차지하는 높이를 미리 잰다
    const f = document.createElement('div');
    f.className = `${el.className.replace(/\bjig\b/, '').trim()} cn-fbox`;
    f.style.cssText = `--fx-ms:${reduceMotion() ? 0 : G.focusMs}ms;--fx-pad:${G.focusPad}px;--fx-title-font:${G.focusTitleFont}px;--fx-font:${G.focusFont}px`;
    const compact = el.querySelector('.bx').cloneNode(true);
    const fx = document.createElement('div');
    fx.className = 'fx';
    fx.innerHTML = focusHtml(item);
    f.innerHTML = '<svg class="stitch" aria-hidden="true"><rect/></svg>';
    f.appendChild(compact);
    f.appendChild(fx);
    const pageRect = page.el.getBoundingClientRect();
    const bounds = {
      left: -pageRect.left, right: document.documentElement.clientWidth - pageRect.left,
      top: (parseFloat(getComputedStyle(document.body).paddingTop) || 0) - pageRect.top,
      bottom: (noteCornerY() ?? window.innerHeight) - pageRect.top,
    };
    const width = Math.min(G.focusWidth, bounds.right - bounds.left - 2 * G.focusMargin);
    f.style.width = `${width}px`;
    fx.style.width = `${width}px`;
    page.focusEl.appendChild(f);
    const naturalH = fx.offsetHeight; // fx는 글 흐름대로 높이가 정해진 채 재진다(아직 absolute 아님)
    const rect = BoxFocus.focusRect({ box: { x: cx, y: cy }, size: { w: width, h: naturalH }, bounds, margin: G.focusMargin, cover: { w: box.w + 2 * G.focusCoverPad, h: box.h + 2 * G.focusCoverPad } });
    const to = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height, rot: 0 }; // 바탕: 내용 자리와 원래 박스 자리를 함께 덮는다
    f.classList.add('placed'); // 이제부터 fx는 박스 안에 얹힌다(스크롤은 넘칠 때만)
    const c = rect.content; // 글자와 버튼은 항상 보이는 영역 안. 바탕 안에서의 자리로 놓는다
    fx.style.left = `${(c.left - rect.left).toFixed(1)}px`;
    fx.style.top = `${(c.top - rect.top).toFixed(1)}px`;
    fx.style.width = `${c.width}px`;
    fx.style.height = `${c.height}px`;
    // 완료 도장은 그대로 모서리에 붙는다
    const seal = sim.seals.get(id);
    if (seal) {
      const s = G.sealSize;
      f.insertAdjacentHTML('beforeend', `<svg class="cn-seal" style="right:${(G.sealInset * s - s / 2).toFixed(1)}px;top:${(G.sealInset * s - s / 2).toFixed(1)}px;width:${s}px;height:${s}px" aria-hidden="true"><use href="#cn-seal-sym"/></svg>`);
    }
    applyFocus(f, from);
    el.style.visibility = 'hidden';
    if (seal) seal.style.visibility = 'hidden';
    page.focusEl.classList.add('open');
    void f.offsetWidth; // 지금 모양(원래 박스와 같은 작은 그림자)을 확정한 뒤에 그림자를 키워야 서서히 변한다
    f.classList.add('lifted');
    focus = { page, item, f, fx, compact, el, seal, from, to, raf: 0, closing: false, scrollY: window.scrollY };
    runFocusTween(from, to, G.focusMs, (r, raw) => {
      applyFocus(f, r);
      compact.style.opacity = String(Math.max(0, 1 - raw * 2.5)); // 원래 글자는 앞쪽에서 사라지고
    }, () => { fx.classList.add('in'); });                       // 전체 정보는 다 커진 뒤 나타난다
    fx.classList.toggle('in', reduceMotion());
  }

  // instant: 연출 없이 바로 닫는다(다시 그리기·주 이동·창 크기 변경처럼 박스가 바뀌는 때)
  function closeFocus(instant = false) {
    const c = focus;
    if (!c) return;
    if (c.closing && !instant) return;
    cancelAnimationFrame(c.raf);
    const finish = () => {
      c.el.style.visibility = ''; if (c.seal) c.seal.style.visibility = '';
      c.f.remove();
      c.page.focusEl.classList.remove('open');
      if (focus === c) focus = null;
    };
    if (instant) { finish(); return; }
    c.closing = true;
    c.page.focusEl.classList.remove('open'); // 줄어드는 동안은 다른 곳을 누를 수 있다
    c.fx.classList.remove('in');
    c.f.style.setProperty('--fx-ms', `${reduceMotion() ? 0 : G.focusMs * 0.8}ms`);
    c.f.classList.remove('lifted'); // 줄어드는 동안 그림자도 원래 박스 것으로 돌아온다
    const now = { cx: c.to.cx, cy: c.to.cy, w: c.to.w, h: c.to.h, rot: 0 };
    runFocusTween(now, c.from, G.focusMs * 0.8, (r, raw) => {
      applyFocus(c.f, r);
      c.compact.style.opacity = String(Math.min(1, Math.max(0, (raw - 0.5) * 2)));
    }, finish);
  }

  function focusAction(action) {
    const c = focus;
    if (!c) return;
    const { item } = c;
    if (action === 'done') {
      const step = state.steps.find(st => st.id === item.stepId);
      if (!step || step.done) return;
      step.done = true;
      step.doneDate = todayStr(); // SPEC 6장: 완료일 기본은 오늘
    } else if (action === 'skip') {
      const ev = state.events.find(e => e.id === item.eventId);
      if (!ev || ev.repeat === 'none' || !item.date) return;
      ev.skipDates = [...new Set([...(ev.skipDates || []), item.date])].sort(); // SPEC 10장: 그 날 하루만 뺀다
    } else return;
    saveState();
    closeFocus(true);
    renderCarpet();
    if (action === 'skip' && typeof renderEvents === 'function') renderEvents(); // 일정 화면 목록도 새로 그린다
  }

  pagesEl.addEventListener('click', e => {
    if (focus) {
      if (focus.closing) return;
      const b = e.target.closest('[data-focus-action]');
      if (b && focus.f.contains(b)) focusAction(b.dataset.focusAction);
      else if (!focus.f.contains(e.target)) closeFocus();
      return;
    }
    const el = e.target.closest('.cn-box');
    if (!el || busy || drag || suppressClick || !introDone || !active.boxesEl.contains(el)) return;
    openFocus(active, el.dataset.id);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && focus) closeFocus(); });
  window.addEventListener('scroll', () => { if (focus && Math.abs(window.scrollY - focus.scrollY) > 4) closeFocus(true); }, { passive: true });

  // ---- 박스 끌기: 남은 단계(할 일) 박스를 끌면 반투명한 복사본이 포인터를 따라온다. 날짜칸(페이지 폭의 7등분 세로 줄)에 놓으면 그 날에 고정되고(SPEC 10장 pinnedDate)
  // 다시 그리기가 날이 바뀐 박스를 위에서 떨어뜨린다. 화면 왼쪽·오른쪽 끝에 머물면 지난 주·다음 주로 넘어가고, 위쪽(헤더 자리)에 놓거나 Esc면 취소다.
  // 놓는 자리 판정은 box-drag.js(순수 함수), 놓을 수 있는지는 Placement.canDropPin(같은 날·지난 날은 안 된다) ----
  let boxDrag = null;         // 끌기 진행 상태. 눌렀지만 아직 시작 전(터치 길게 누르기 대기)이면 started가 false
  let suppressClick = false;  // 끌고 난 직후의 클릭이 박스 누르기(커지기)로 이어지지 않게

  const dz = document.createElement('div'); // 화면 고정 안내 구역(헤더·메모지 위). 끄는 동안만 보인다
  dz.className = 'cn-dz';
  dz.setAttribute('aria-hidden', 'true');
  dz.style.setProperty('--dz-edge', `${G.dragEdgeWidth}px`);
  const dzIcon = d => `<span class="dz-ic"><svg viewBox="0 0 24 24"><path d="${d}"/></svg></span>`;
  dz.innerHTML = `<div class="dz dz-prev"><div class="dz-body">${dzIcon('M15 5L8 12l7 7')}<b>지난 주</b><span>잠깐 머물면 넘어가요</span></div><i class="dz-fill"></i></div>`
    + `<div class="dz dz-next"><div class="dz-body">${dzIcon('M9 5l7 7-7 7')}<b>다음 주</b><span>잠깐 머물면 넘어가요</span></div><i class="dz-fill"></i></div>`
    + `<div class="dz dz-cancel"><div class="dz-body">${dzIcon('M6 6l12 12M18 6L6 18')}<b>여기에 놓으면 취소</b><span>날짜 칸에 놓으면 그 날로 옮겨요</span></div></div>`;
  document.body.appendChild(dz);
  const dzEl = { prev: dz.querySelector('.dz-prev'), next: dz.querySelector('.dz-next'), cancel: dz.querySelector('.dz-cancel') };

  // 놓을 날짜칸 강조(그 페이지 안, 박스 아래 층). t: 구역 판정 결과, 없으면 숨긴다
  function showDrop(page, t) {
    const el = page && page.dropEl;
    if (!el) return;
    if (!t || t.zone !== 'col') { el.classList.remove('on', 'invalid', 'same'); return; }
    const colW = page.el.clientWidth / 7;
    el.style.left = `${t.col * colW}px`;
    el.style.width = `${colW}px`;
    el.classList.add('on');
    el.classList.toggle('invalid', t.status === 'past');
    el.classList.toggle('same', t.status === 'same');
  }

  function updateBoxDrag() {
    const d = boxDrag;
    d.ghost.style.translate = `${d.x - d.grabDx}px ${d.y - d.grabDy}px`;
    const pr = active.el.getBoundingClientRect(); // 스크롤·슬라이드가 반영된 지금 위치
    const z = BoxDrag.zoneAt({ x: d.x, y: d.y, width: document.documentElement.clientWidth, edge: G.dragEdgeWidth, topHeight: d.topHeight, page: { left: pr.left, width: pr.width } });
    const t = d.target = { zone: busy ? 'none' : z.zone, col: z.col, date: null, status: null }; // 페이지가 넘어가는 중에는 놓을 수 없다
    if (t.zone === 'col') {
      t.date = active.dates[t.col];
      const r = Placement.canDropPin({ fromDate: d.fromDate, toDate: t.date, today: work.today });
      t.status = r.ok ? 'ok' : r.reason ? 'past' : 'same';
    }
    if (d.hlPage && d.hlPage !== active) showDrop(d.hlPage, null);
    d.hlPage = active;
    showDrop(active, t);
    ['prev', 'next', 'cancel'].forEach(k => dzEl[k].classList.toggle('active', t.zone === k || (k === 'cancel' && t.zone === 'cancel')));
    const edge = t.zone === 'prev' || t.zone === 'next' ? t.zone : null; // 주 이동 구역에 닿은 시각부터 머문 시간을 잰다
    if (edge !== d.dwellZone) { d.dwellZone = edge; d.dwellStart = performance.now(); dz.style.setProperty('--dz-progress', '0'); }
  }

  // 주 이동 구역에 머문 시간을 채움 표시로 보이고, 다 차면 한 주 넘긴다. 넘어가는 동안은 다시 재기 시작한다
  function dwellTick(now) {
    const d = boxDrag;
    if (!d || !d.started) return;
    if (busy) { d.dwellStart = now; dz.style.setProperty('--dz-progress', '0'); d.wasBusy = true; }
    else {
      if (d.wasBusy) { d.wasBusy = false; updateBoxDrag(); } // 슬라이드가 끝났으니 새 주의 칸으로 다시 판정한다
      if (d.dwellZone) {
        const p = Math.min(1, (now - d.dwellStart) / G.dragEdgeDwellMs);
        dz.style.setProperty('--dz-progress', String(p));
        if (p >= 1) { d.dwellStart = now; goTo(navTarget + (d.dwellZone === 'next' ? 1 : -1)); }
      }
    }
    d.raf = requestAnimationFrame(dwellTick);
  }

  function startBoxDrag() {
    const d = boxDrag;
    clearTimeout(d.timer);
    d.started = true;
    drag = null; // 터치 주 넘기기 스와이프로 이어지지 않게
    suppressClick = true;
    closeFocus(true);
    const r = d.el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    d.grabDx = d.startX - cx; d.grabDy = d.startY - cy; // 박스를 잡은 자리를 그대로 유지한다
    d.topHeight = (parseFloat(getComputedStyle(document.body).paddingTop) || 0) + G.dragTopExtra;
    d.fromDate = d.page.dates[d.item.col];
    const ghost = document.createElement('div');
    ghost.className = 'cn-ghost';
    ghost.style.setProperty('--ghost-op', String(G.dragGhostOpacity));
    const copy = d.el.cloneNode(true); // 지금 모습 그대로의 복사본(떨림은 빼고 기울기는 그대로)
    copy.classList.remove('jig');
    copy.style.translate = ''; copy.style.visibility = ''; copy.style.opacity = '';
    copy.removeAttribute('data-id');
    ghost.appendChild(copy);
    ghost.style.translate = `${cx}px ${cy}px`;
    document.body.appendChild(ghost);
    d.ghost = ghost;
    d.el.style.opacity = String(G.dragSourceOpacity);
    document.body.classList.add('dragging-box');
    dz.classList.add('show');
    requestAnimationFrame(() => dz.classList.add('on')); // 한 프레임 뒤에 켜야 서서히 나타난다
    d.dwellZone = null; d.dwellStart = performance.now(); d.wasBusy = false;
    updateBoxDrag();
    d.raf = requestAnimationFrame(dwellTick);
  }

  function endBoxDrag(cancelled) {
    const d = boxDrag;
    if (!d) return;
    document.removeEventListener('pointermove', onBoxDragMove);
    document.removeEventListener('pointerup', onBoxDragUp);
    document.removeEventListener('pointercancel', onBoxDragUp);
    clearTimeout(d.timer);
    cancelAnimationFrame(d.raf);
    boxDrag = null;
    setTimeout(() => { suppressClick = false; }, 0);
    if (!d.started) return;
    document.body.classList.remove('dragging-box');
    dz.classList.remove('on');
    setTimeout(() => dz.classList.remove('show'), 220);
    Object.values(dzEl).forEach(el => el.classList.remove('active'));
    showDrop(d.hlPage, null);
    d.el.style.opacity = '';
    const t = d.target;
    const commit = !cancelled && t && t.zone === 'col' && t.status === 'ok';
    const ghost = d.ghost;
    if (commit) { // 놓은 칸에 고정하고 다시 그린다: 날이 바뀐 박스가 위에서 떨어진다
      ghost.style.transition = 'opacity 120ms ease-out';
      ghost.style.opacity = '0';
      setTimeout(() => ghost.remove(), 160);
      const step = state.steps.find(st => st.id === d.item.stepId);
      if (step && !step.done) {
        step.pinnedDate = t.date;
        saveState();
        renderCarpet();
      }
    } else if (d.el.isConnected && !reduceMotion()) { // 취소·놓을 수 없는 자리: 원래 자리로 돌아가며 사라진다
      const r = d.el.getBoundingClientRect();
      ghost.style.transition = `translate ${G.focusMs}ms ease-out, opacity ${G.focusMs}ms ease-out`;
      ghost.style.translate = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
      ghost.style.opacity = '0';
      setTimeout(() => ghost.remove(), G.focusMs + 40);
    } else {
      ghost.remove();
    }
    if (refreshQueued) refreshCarpet();
  }

  function onBoxDragMove(e) {
    const d = boxDrag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX; d.y = e.clientY;
    if (!d.started) {
      const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      if (d.touch) { if (moved > G.dragMovePx * 2) endBoxDrag(true); } // 길게 누르기 전에 움직였으면 스크롤·스와이프하려는 것이니 포기한다
      else if (moved > G.dragMovePx) startBoxDrag();
      return;
    }
    e.preventDefault();
    updateBoxDrag();
  }
  function onBoxDragUp(e) {
    const d = boxDrag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.started && e.type === 'pointerup') { d.x = e.clientX; d.y = e.clientY; updateBoxDrag(); }
    endBoxDrag(e.type === 'pointercancel');
  }

  pagesEl.addEventListener('pointerdown', e => {
    if (boxDrag || focus || busy || !introDone || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.target.closest('.cn-box');
    if (!el || !active.boxesEl.contains(el) || !active.sim) return;
    const item = (active.items || []).find(it => it.id === el.dataset.id);
    if (!item || item.kind !== 'todo') return; // 끌어 옮길 수 있는 것은 남은 단계뿐(고정 일정과 완료한 단계는 날짜를 옮기지 않는다)
    const me = boxDrag = { page: active, item, el, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', started: false, timer: 0, ghost: null, target: null, hlPage: null };
    if (me.touch) me.timer = setTimeout(() => { if (boxDrag === me && !me.started) startBoxDrag(); }, G.dragLongPressMs);
    document.addEventListener('pointermove', onBoxDragMove);
    document.addEventListener('pointerup', onBoxDragUp);
    document.addEventListener('pointercancel', onBoxDragUp);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && boxDrag && boxDrag.started) endBoxDrag(true); });
  document.addEventListener('touchmove', e => { if (boxDrag && boxDrag.started) e.preventDefault(); }, { passive: false }); // 끌기가 시작된 뒤에는 터치가 화면을 스크롤하지 않게
  pagesEl.addEventListener('contextmenu', e => { if (boxDrag) e.preventDefault(); }); // 길게 누르면 뜨는 메뉴 막기

  // ---- 다시 그리기: 할 일·일정·설정이 바뀌면 다른 화면이 전역 renderCarpet()을 부른다. 바뀐 게 없으면 아무것도 하지 않고,
  // 바뀌었으면 새로 생겼거나 옮겨졌거나 크기가 바뀐 박스만 위에서 떨어진다(나머지는 제자리). 슬라이드·끌기·첫 입장 중이면 끝난 뒤로 미룬다 ----
  let refreshQueued = false;
  const settingsKey = page => JSON.stringify([state.settings, work.today, page.dates[0]]);

  // 읽기·배치를 다시 계산해 page의 7일 구성과 날짜를 새로 맞춘다
  function syncWork(page) {
    phases[0]();
    phases[1]();
    page.stats = statsFor(page.offset);
    page.dates = page.stats.map(st => st.date);
  }

  // 미뤄 둔 다시 그리기가 있으면, 박스를 놓기 전에 page에 반영한다(이어서 전부 떨어지므로 견줄 필요가 없다)
  function applyQueuedRefresh(page) {
    if (!refreshQueued) return;
    refreshQueued = false;
    syncWork(page);
    setHeader(page);
    const width = page.el.clientWidth;
    drawGrid(page, metrics(page, width), width);
  }

  function refreshCarpet() {
    if (!introDone || busy || drag || boxDrag) { refreshQueued = true; return; }
    refreshQueued = false;
    const page = active;
    syncWork(page);
    setHeader(page);
    const next = boxItems(page);
    const diff = BoxDiff.diffBoxes(page.items || [], next);
    if (!diff.changed && settingsKey(page) === page.settingsKey) return;
    const width = page.el.clientWidth;
    drawGrid(page, metrics(page, width), width);
    const still = reduceMotion();
    const sim = page.sim;
    // 설정이 그대로이고 가만히 정착해 있으며 글자만 바뀐 박스가 없으면, 월드를 새로 만들지 않고 바뀐 만큼만 고친다(없어지는 박스는 사라지고 카펫이 올라온다)
    if (!still && sim && !sim.raf && sim.width === width && diff.edited.length === 0 && settingsKey(page) === page.settingsKey) { updateInPlace(page, diff, next); return; }
    startBoxes(page, still ? 'instant' : 'drop', still ? null : new Set(diff.drop));
  }
  window.renderCarpet = refreshCarpet; // 옛 카펫의 같은 이름 함수를 이어받는다(옛 화면은 숨겨져 있다)

  // 이동할 주의 페이지를 만든다. 눈금과 날짜 숫자, 평평한 카펫만 있고 박스는 없다(롤 펼침은 첫 입장 때만, 박스는 슬라이드가 끝난 뒤 위에서 떨어진다)
  function buildPage(offset) {
    const page = createPage(offset, false);
    page.stats = statsFor(offset);
    const width = pagesEl.clientWidth;
    drawGrid(page, metrics(page, width), width);
    startBoxes(page, 'empty');
    return page;
  }

  // ---- 주 넘기기: 아이폰 홈 화면처럼 페이지가 옆으로 밀려 나가고 들어온다. 버튼과 터치 스와이프가 같은 슬라이드를 쓴다 ----
  let busy = false;     // 슬라이드 중
  let navTarget = 0;    // 가려는 주(연타하면 마지막 것만 이어서 간다)
  let queued = null;

  // el을 가로로 fromX에서 toX로 옮긴다(WAAPI). 끝나면 최종 위치를 style로 박고 애니메이션을 걷는다
  function animateX(el, fromX, toX, ms) {
    if (reduceMotion() || !el.animate) { el.style.transform = toX ? `translate3d(${toX}px,0,0)` : ''; return Promise.resolve(); }
    const a = el.animate([{ transform: `translate3d(${fromX}px,0,0)` }, { transform: `translate3d(${toX}px,0,0)` }], { duration: ms, easing: G.slideEase, fill: 'forwards' });
    return a.finished.then(() => { el.style.transform = toX ? `translate3d(${toX}px,0,0)` : ''; a.cancel(); }, () => {});
  }

  // 슬라이드가 끝난 뒤: 옛 페이지를 치우고 새 페이지를 보이는 페이지로 삼고, 그 주의 박스를 위에서 떨어뜨린다
  function arrive(old, next) {
    removePage(old);
    active = next;
    applyContainer(next.m);
    next.el.style.transform = '';
    busy = false;
    navTarget = next.offset;
    applyQueuedRefresh(next);
    startBoxes(next, reduceMotion() ? 'instant' : 'drop');
    if (queued !== null) { const q = queued; queued = null; goTo(q); }
  }

  async function goTo(target) {
    if (!introDone || target === navTarget && !busy) return;
    if (busy) { queued = target; return; }
    if (target === active.offset) return;
    closeFocus(true);
    busy = true;
    navTarget = target;
    const dir = target > active.offset ? 1 : -1;       // 다음 주(+1)면 새 페이지가 오른쪽에서 들어온다
    const old = active;
    const next = buildPage(target);
    const width = pagesEl.clientWidth;
    pagesEl.style.height = `${Math.max(old.m.height, next.m.height)}px`; // 슬라이드 동안은 둘 중 높은 쪽에 맞춘다
    next.el.style.transform = `translate3d(${dir * width}px,0,0)`;
    setHeader(next);
    await Promise.all([animateX(old.el, 0, -dir * width, G.slideMs), animateX(next.el, dir * width, 0, G.slideMs)]);
    arrive(old, next);
  }

  // 터치 스와이프: 손가락을 따라 페이지가 움직이고, 놓을 때 충분히 밀었거나 빠르면 넘어가고 아니면 제자리로 돌아간다
  let drag = null;
  pagesEl.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || busy || !introDone || focus || boxDrag) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: 'wait', dir: 0, other: null, dx: 0, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  });
  pagesEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (drag.mode === 'wait') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) { drag.mode = 'drag'; try { pagesEl.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } }
      else { drag = null; return; } // 세로로 밀면 스크롤에 맡긴다
    }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX; drag.lastT = e.timeStamp;
    const width = pagesEl.clientWidth;
    const dir = dx < 0 ? 1 : -1;                        // 왼쪽으로 밀면 다음 주
    if (drag.dir !== dir) {                             // 방향이 바뀌면 반대쪽 이웃 주의 페이지로 바꾼다
      if (drag.other) removePage(drag.other);
      drag.dir = dir;
      drag.other = buildPage(active.offset + dir);
      pagesEl.style.height = `${Math.max(active.m.height, drag.other.m.height)}px`;
    }
    drag.dx = dx;
    active.el.style.transform = `translate3d(${dx}px,0,0)`;
    drag.other.el.style.transform = `translate3d(${dx + dir * width}px,0,0)`;
  });
  async function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.mode !== 'drag' || !d.other) { if (refreshQueued) refreshCarpet(); return; }
    const width = pagesEl.clientWidth, old = active, next = d.other;
    const commit = Math.abs(d.dx) > width * G.swipeCommitRatio || (Math.abs(d.v) > G.swipeCommitSpeed && Math.sign(d.v) === -d.dir);
    busy = true;
    const remain = commit ? width - Math.abs(d.dx) : Math.abs(d.dx);       // 남은 거리에 비례해 짧게
    const ms = Math.max(160, G.slideMs * Math.min(1, remain / width));
    if (commit) {
      navTarget = next.offset;
      setHeader(next);
      await Promise.all([animateX(old.el, d.dx, -d.dir * width, ms), animateX(next.el, d.dx + d.dir * width, 0, ms)]);
      arrive(old, next);
    } else {
      await Promise.all([animateX(old.el, d.dx, 0, ms), animateX(next.el, d.dx + d.dir * width, d.dir * width, ms)]);
      removePage(next);
      applyContainer(old.m);
      busy = false;
      if (refreshQueued) refreshCarpet();
    }
  }
  pagesEl.addEventListener('pointerup', endDrag);
  pagesEl.addEventListener('pointercancel', endDrag);

  // 헤더 패치의 이전 주·다음 주·이번 주 버튼. 옛 카펫의 같은 버튼 처리(app-carpet.js)가 먼저 돌지만 옛 화면은 숨겨져 있어 상관없다
  document.getElementById('week-prev').addEventListener('click', () => goTo(navTarget - 1));
  document.getElementById('week-next').addEventListener('click', () => goTo(navTarget + 1));
  document.getElementById('week-today').addEventListener('click', () => goTo(0));

  // ---- 시작: 첫 입장 롤 펼침 ----
  const first = createPage(0, true);
  active = first;
  setHeader(first);
  stage.carpetSim = () => active && active.sim; // 확인용(개발자 도구에서 stage.carpetSim()으로 지금 세계를 볼 수 있다)
  stage.carpetNav = () => ({ active: active.offset, pages: pagesEl.children.length, busy, navTarget });

  function finish() {
    draw(first, 1);
    stage.classList.add('intro-done');
    introDone = true;
    applyQueuedRefresh(first);
    startBoxes(first, reduceMotion() ? 'instant' : 'drop'); // 첫 입장 때의 떨어지는 연출
    let resizeTimer = 0;
    window.addEventListener('resize', () => { // 폭·높이가 바뀌면 보이는 주의 선과 박스를 새 크기로 다시 놓는다(연출 없이). 창을 끄는 동안은 기다렸다가 멈추면 한 번만
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (busy || drag || boxDrag) return;
        const width = active.el.clientWidth;
        drawGrid(active, metrics(active, width), width);
        startBoxes(active, 'instant');
      }, G.resizeDebounceMs);
    });
  }

  async function runWork() {
    for (const fn of phases) {
      await nextTask();
      try { fn(); } catch (e) { console.error('카펫 로딩 단계 실패', e); }
      workDone++;
    }
  }

  if (reduceMotion()) {
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
    draw(first, CarpetRoll.easeInOutSine(progress));
    if (progress < 1) requestAnimationFrame(frame); else finish();
  }
  requestAnimationFrame(frame);
  runWork();
})();
