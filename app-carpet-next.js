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
//  [ ] 카펫 선: 부하만큼 처짐, 안전선, 예산선, 눈금, 시간 초과 짐 상자, 오늘 칸 배경
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
  bottomMargin: 56,     // 펼쳐진 카펫 아래 여백(px). 이후 카펫이 처질 자리
};

(function () {
  if (new URLSearchParams(location.search).get('carpet') !== 'next') return;

  document.documentElement.classList.add('carpet-next-on'); // 옛 카펫을 숨기고 새 카펫 자리를 연다
  const stage = document.getElementById('carpet-next');
  stage.hidden = false;
  stage.innerHTML = '<svg class="carpet-intro" aria-hidden="true"><path class="laid"/><path class="roll"/></svg>'
    + '<p class="carpet-next-note">새 카펫 (작업 중)</p>';
  const svg = stage.querySelector('svg');
  const laidPath = svg.querySelector('.laid');
  const rollPath = svg.querySelector('.roll');
  const S = INTRO_STYLE;
  [laidPath, rollPath].forEach(p => {
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', S.lineColor);
    p.setAttribute('stroke-width', S.lineWidth);
  });
  rollPath.setAttribute('stroke-linejoin', 'round');

  // 롤 그리기. eased는 0~1(곡선을 입힌 진행도)
  function draw(eased) {
    const width = svg.clientWidth || stage.clientWidth + 32;
    const P = { spacing: S.spacing, coreRadius: S.coreRadius };
    const groundY = S.topMargin + 2 * CarpetRoll.rollPose({ progress: 0, width, ...P, groundY: 0 }).radius; // 땅에서 롤 지름 + 위 여백
    const pose = CarpetRoll.rollPose({ progress: eased, width, ...P, groundY });
    svg.setAttribute('height', Math.ceil(groundY + S.bottomMargin));
    laidPath.setAttribute('d', `M0 ${groundY} H${pose.contactX.toFixed(2)}`);
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
