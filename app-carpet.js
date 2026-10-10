// 카펫 화면(모양 값, 주간 카펫, 단계 드래그 고정). 카펫을 처음 그리므로 마지막에 읽는다

  // 카펫 모양 값. 숫자나 색을 바꾸고 새로고침하면 바로 보인다
  const CARPET_STYLE = {
    // --- 크기 ---
    height: 237,          // 그림 전체 높이(px). maxSag 키울 때 같이 키우지 않으면 아래가 잘린다
    baseY: 14,            // 처지지 않았을 때 카펫 높이(위에서부터 px). 키우면 카펫 전체가 아래로 내려간다
    maxSag: 179,          // 예산만큼 찼을 때 처지는 깊이(px). 키우면 날짜 간 차이가 커진다
    // --- 카펫 선 ---
    lineWidth: 8,         // 카펫 선 두께(px). 키우면 두꺼운 끈처럼 보인다
    lineColor: '#b8203a', // 카펫 선 색
    flatRatio: 0.5,       // 날짜 칸 폭 중 평평한 바닥 비율(0~1). 키우면 바닥이 길고 경사가 급해진다. 0이면 점처럼 뾰족하다
    curve: 0.5,           // 바닥 사이 곡선 모양(0~0.5). 0이면 비스듬한 직선, 0.5면 완만한 S자
    // --- 시간 초과 (짐이 폭 밖으로 삐져나옴) ---
    overflowBoxWidth: 1.3,  // 짐 상자 폭 / 날짜 칸 폭. 1보다 커야 칸 밖으로 삐져나온다. 키우면 더 많이 삐져나온다
    overflowBoxHeight: 14,  // 짐 상자 높이(px). 키우면 짐이 높이 쌓인다
    overflowColor: '#3b8f9c', // 짐 상자 색. 부하 초과 표시(선들)와 다른 색이어야 구분된다
    overflowStroke: '#1f5a64', // 짐 상자 테두리 색
    // --- 격자 ---
    gridMaxLines: 5,     // 가로 눈금선 최대 개수. 줄이면 간격이 넓어지고, 예산이 이보다 작으면 1단위마다 그린다
    gridLabelEvery: 10,    // 눈금 몇 줄마다 숫자를 적을지. 키우면 숫자가 드물어진다
    gridColor: '#e6e1da',       // 일반 눈금선 색
    gridWidth: 2,               // 눈금선 두께(px)
    budgetColor: '#b9b2a8',     // 예산선(맨 아래 눈금) 색
    labelColor: '#9a938a',      // 눈금 숫자 색
    labelSize: 9,               // 눈금 숫자 크기(px)
    // --- 안전선 ---
    safeColor: '#e0a030', // 안전선 색
    safeWidth: 2,         // 안전선 두께(px)
    safeDash: '5 4',      // 안전선 점선 모양(선 길이 빈 길이). '0'이면 실선
    // --- 칸 ---
    dividerColor: '#d8d2ca',    // 날짜 구분선 색
    dividerWidth: 2,            // 날짜 구분선 두께(px)
    dividerDash: '3 4',         // 날짜 구분선 점선 모양
    todayFill: 'rgba(184,32,58,0.08)', // 오늘 칸 배경색. 투명도(마지막 숫자)를 올리면 진해진다
  };

  // ---- 카펫 화면 (막대 버전) ----

  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
  let weekOffset = 0; // 이번 주 기준 몇 주 뒤인가
  const weekStrip = document.getElementById('week-strip');

  function formatMinutes(min) {
    const sign = min < 0 ? '-' : '';
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (h && m) return `${sign}${h}시간 ${m}분`;
    if (h) return `${sign}${h}시간`;
    return `${sign}${m}분`;
  }

  function stepTagHtml(p) {
    const tags = [];
    if (p.overLoad) tags.push('부하 초과');
    if (p.overTime) tags.push('시간 초과');
    return tags.length ? ` <span class="tag">${tags.join('·')}</span>` : '';
  }

  let openMenu = null; // { stepId, mode: 'menu' | 'done' | 'pin' }

  function pushButtonHtml(step, placement) {
    const goal = state.goals.find(g => g.id === step.goalId);
    const can = Placement.canPush({ placedDate: placement.date, deadline: goal.deadline });
    const button = `<button type="button" class="btn btn-plain" data-action="step-push" data-step-id="${step.id}" data-date="${placement.date}"${can.ok ? '' : ' disabled'}>이 날 안 함</button>`;
    return can.ok ? button : `${button}<span class="menu-hint">${can.reason}</span>`;
  }

  function stepMenuHtml(step, overdue, placement) {
    if (!openMenu || openMenu.stepId !== step.id) return '';
    const id = step.id;
    const today = todayStr();
    const btn = (action, label, cls = 'btn-plain') => `<button type="button" class="btn ${cls}" data-action="${action}" data-step-id="${id}">${label}</button>`;
    let body;
    if (openMenu.mode === 'done') {
      body = `<span class="menu-hint">한 날짜 (오늘까지)</span>
        <input type="date" id="step-menu-date" max="${today}" value="${today}">
        ${btn('step-done-confirm', '완료 기록', '')}${btn('close-step-menu', '취소')}`;
    } else if (openMenu.mode === 'pin') {
      body = `<span class="menu-hint">고정할 날짜 (오늘부터)</span>
        <input type="date" id="step-menu-date" min="${today}" value="${step.pinnedDate || Placement.addDays(today, 1)}">
        ${btn('step-pin-confirm', '이 날에 고정', '')}${btn('close-step-menu', '취소')}`;
    } else {
      body = btn('step-done-open', '완료', '')
        + (overdue ? '' : (step.pinnedDate ? '' : pushButtonHtml(step, placement))
          + btn('step-pin-open', '다른 날에 고정')
          + (step.pinnedDate ? btn('step-unpin', '고정 해제') : ''))
        + btn('close-step-menu', '닫기');
    }
    return `<div class="step-menu">${body}</div>`;
  }

  function clickableStepHtml(step, goalTitle, placement, overdue) {
    const tags = [];
    if (placement && placement.pinned) tags.push('<span class="tag tag-pin">고정</span>');
    const over = placement ? stepTagHtml(placement) : '';
    const deadline = overdue ? ` · 마감 ${state.goals.find(g => g.id === step.goalId).deadline}` : '';
    const pushed = step.pushCount ? ` · 밀림 ${step.pushCount}회` : '';
    return `<div class="day-item step clickable${placement && placement.exceeded ? ' exceeded' : ''}" data-action="open-step-menu" data-step-id="${step.id}">${escapeHtml(step.title)} ${tags.join('')}${over}<br><small>${escapeHtml(goalTitle)} · 부하 ${step.load} · ${formatMinutes(step.minutes)}${pushed}${deadline}</small></div>${stepMenuHtml(step, overdue, placement)}`;
  }

  function dayCardHtml(st, today, goalTitleById) {
    const s = state.settings;
    const loadPct = Math.min(100, (st.load / st.capacity) * 100);
    const usedMin = st.availableMinutes - st.minutesLeft;
    const timePct = st.availableMinutes > 0 ? Math.min(100, Math.max(0, (usedMin / st.availableMinutes) * 100)) : 100;
    const loadClass = st.overBudget ? ' over-budget' : st.overSafe ? ' over-safe' : '';
    const loadWarn = st.overBudget ? '<span class="warn">예산 초과</span>' : st.overSafe ? '<span class="warn">안전선 초과</span>' : '';
    const slackText = st.slack < 0 ? `${st.slack} (초과)` : String(st.slack);

    const eventsHtml = [...st.events]
      .sort((a, b) => a.start.localeCompare(b.start))
      .map(ev => `<div class="day-item event">${escapeHtml(ev.title)} <small>${ev.start}~${ev.end} · 부하 ${ev.load}</small>${ev.repeat !== 'none' ? ` <button type="button" class="skip-btn" data-action="skip-event-day" data-event-id="${ev.id}" data-date="${st.date}">이 날만 빼기</button>` : ''}</div>`)
      .join('');
    const stepsHtml = st.steps
      .map(({ step, placement }) => clickableStepHtml(step, goalTitleById.get(step.goalId) || '', placement, false))
      .join('');
    const doneHtml = st.doneSteps
      .map(step => `<div class="day-item step done"><span class="tag">완료</span> ${escapeHtml(step.title)}<br><small>${escapeHtml(goalTitleById.get(step.goalId) || '')} · 부하 ${step.load} · ${formatMinutes(step.minutes)}</small></div>`)
      .join('');
    const itemsHtml = eventsHtml + stepsHtml + doneHtml || '<div class="empty-hint">비어 있음</div>';
    const [, m, d] = st.date.split('-').map(Number);

    return `
      <div class="day-card${st.date === today ? ' today' : ''}${st.date < today ? ' past' : ''}" data-date="${st.date}">
        <div class="day-head"><span>${m}/${d} (${DAY_LABELS[Placement.weekdayOf(st.date)]})</span>${st.date === today ? '<span class="today-badge">오늘</span>' : ''}</div>
        <div class="day-items">${itemsHtml}</div>
        <div class="bar-row">
          <div class="bar-label"><span>부하 ${st.load} / ${st.capacity}</span>${loadWarn}</div>
          <div class="bar"><div class="bar-fill${loadClass}" style="width:${loadPct}%"></div><div class="bar-safe-line" style="left:${s.safeRatio * 100}%"></div></div>
        </div>
        <div class="bar-row">
          <div class="bar-label"><span>여유</span><span class="${st.slack < 0 ? 'warn' : ''}">${slackText}</span></div>
        </div>
        <div class="bar-row">
          <div class="bar-label"><span>남은 시간 ${formatMinutes(st.minutesLeft)}</span>${st.overTime ? '<span class="warn">시간 초과</span>' : ''}</div>
          <div class="bar"><div class="bar-fill time${st.overTime ? ' over-time' : ''}" style="width:${timePct}%"></div></div>
        </div>
      </div>`;
  }

  // 카펫 SVG: 카드 위치를 재서 가로를 맞춘다. 화면이 숨겨져 있으면 폭이 0이라 그리지 않는다
  const carpetSvg = document.getElementById('carpet-svg');
  let lastCarpet = null; // { loads, capacity, safeRatio, todayIndex }

  function drawCarpet() {
    if (!lastCarpet) return;
    const stripRect = weekStrip.getBoundingClientRect();
    if (stripRect.width === 0) return;
    const columns = [...weekStrip.children].map(card => {
      const r = card.getBoundingClientRect();
      return { left: r.left - stripRect.left, right: r.right - stripRect.left };
    });
    const width = stripRect.width;
    const C = CARPET_STYLE;
    const shape = Carpet.carpetShape({
      loads: lastCarpet.loads, capacity: lastCarpet.capacity, safeRatio: lastCarpet.safeRatio, columns, width,
      baseY: C.baseY, maxSag: C.maxSag, flatRatio: C.flatRatio, curve: C.curve,
      timeOver: lastCarpet.timeOver,
      overflowBoxWidth: C.overflowBoxWidth, overflowBoxHeight: C.overflowBoxHeight,
      gridMaxLines: C.gridMaxLines, gridLabelEvery: C.gridLabelEvery,
    });
    const todayCol = lastCarpet.todayIndex >= 0 ? columns[lastCarpet.todayIndex] : null;
    carpetSvg.setAttribute('width', width);
    carpetSvg.setAttribute('height', C.height);
    carpetSvg.setAttribute('viewBox', `0 0 ${width} ${C.height}`);
    carpetSvg.innerHTML =
      (todayCol ? `<rect x="${todayCol.left}" y="0" width="${todayCol.right - todayCol.left}" height="${C.height}" fill="${C.todayFill}"/>` : '')
      + shape.gridLines.map(g => `<line x1="0" y1="${g.y}" x2="${width}" y2="${g.y}" stroke="${g.isBudget ? C.budgetColor : C.gridColor}" stroke-width="${C.gridWidth}"/>`).join('')
      + (shape.safeLine ? `<line x1="0" y1="${shape.safeLine.y}" x2="${width}" y2="${shape.safeLine.y}" stroke="${C.safeColor}" stroke-width="${C.safeWidth}" stroke-dasharray="${C.safeDash}"/>` : '')
      + shape.gridLines.filter(g => g.label).map(g => `<text x="3" y="${g.y - 2}" font-size="${C.labelSize}" fill="${C.labelColor}">${g.value}</text>`).join('')
      + shape.dividers.map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${C.height}" stroke="${C.dividerColor}" stroke-width="${C.dividerWidth}" stroke-dasharray="${C.dividerDash}"/>`).join('')
      + shape.overflowBoxes.filter(Boolean).map(b => `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="3" fill="${C.overflowColor}" stroke="${C.overflowStroke}" stroke-width="1.5"/>`).join('')
      + `<path d="${shape.linePath}" fill="none" stroke="${C.lineColor}" stroke-width="${C.lineWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  window.addEventListener('resize', drawCarpet);

  // 지난 주(이번 주보다 이전)를 보고 있을 때만 주간 요약을 보여 준다 (SPEC 10장)
  function renderWeekSummary(weekStats) {
    const box = document.getElementById('week-summary');
    if (weekOffset >= 0) { box.style.display = 'none'; return; }
    const r = Placement.weekSummary(weekStats);
    box.style.display = '';
    box.innerHTML = r.empty
      ? '이 주는 기록이 없습니다.'
      : `총 부하 <strong>${r.totalLoad}</strong>`
        + ` · 예산 초과 <strong>${r.overBudgetDays}</strong>일 · 안전선만 넘음 <strong>${r.overSafeOnlyDays}</strong>일 · 시간 초과 <strong>${r.overTimeDays}</strong>일`
        + ` · 밀림 <strong>${r.pushCount}</strong>회 <span class="note">(완료한 단계 기준)</span>`;
  }

  function renderCarpet() {
    const s = state.settings;
    const today = todayStr();
    const activeSteps = state.steps.filter(st => !st.done);
    const doneSteps = state.steps.filter(st => st.done && st.doneDate);
    const params = {
      steps: activeSteps, doneSteps, goals: state.goals, events: state.events, today,
      capacity: s.capacity, safeRatio: s.safeRatio, sleepHours: s.sleepHours, lifeHours: s.lifeHours, placeMode: s.placeMode,
    };
    const placements = Placement.placeSteps(params);
    // 마지막 배치 결과를 저장해 둔다 (다음에 앱을 열 때 자동 밀림 판정에 쓴다)
    let placedChanged = false;
    placements.forEach(p => {
      const st = activeSteps.find(x => x.id === p.stepId);
      const date = p.date || undefined;
      if (st.placedDate !== date) { st.placedDate = date; placedChanged = true; }
    });
    if (placedChanged) saveState();
    const goalTitleById = new Map(state.goals.map(g => [g.id, g.title]));

    const start = Placement.addDays(Placement.weekStart(today), weekOffset * 7);
    const dates = Placement.dateRange(start, Placement.addDays(start, 6));
    document.getElementById('week-label').textContent = `${dates[0]} ~ ${dates[6]}`;
    const weekStats = dates.map(date => Placement.dayStats({ ...params, date, placements }));
    weekStrip.innerHTML = weekStats.map(st => dayCardHtml(st, today, goalTitleById)).join('');
    renderWeekSummary(weekStats);
    lastCarpet = {
      loads: weekStats.map(st => st.load),
      timeOver: weekStats.map(st => st.overTime), capacity: s.capacity, safeRatio: s.safeRatio, todayIndex: dates.indexOf(today) };
    drawCarpet();

    const overdueSteps = placements
      .filter(p => p.overdue)
      .map(p => activeSteps.find(st => st.id === p.stepId));
    document.getElementById('overdue-box').innerHTML = overdueSteps.length
      ? `<h2>지남 (마감이 지나 깔리지 않은 단계)</h2>` + overdueSteps
          .map(st => clickableStepHtml(st, goalTitleById.get(st.goalId) || '', null, true))
          .join('')
      : '';
  }

  document.getElementById('week-prev').addEventListener('click', () => { weekOffset--; renderCarpet(); });
  document.getElementById('week-next').addEventListener('click', () => { weekOffset++; renderCarpet(); });
  document.getElementById('week-today').addEventListener('click', () => { weekOffset = 0; renderCarpet(); });

  // ---- 카펫에서 단계를 끌어 다른 날에 놓으면 그 날에 고정 (SPEC 10장). 포인터 이벤트라 마우스·터치·펜이 같다 ----
  // 마우스·펜: 6px 넘게 움직이면 끌기 시작. 터치: 0.3초 길게 눌러야 시작하고, 그 전에 움직이면 좌우 스크롤로 둔다
  const DRAG_MOVE_PX = 6;
  const DRAG_LONG_PRESS_MS = 300;
  let drag = null; // { stepEl, stepId, fromDate, startX, startY, pointerId, touch, started, timer, ghost }
  let suppressClick = false;

  function dropTargetCard(x, y) {
    const el = document.elementFromPoint(x, y);
    const card = el && el.closest('.day-card');
    return card && weekStrip.contains(card) ? card : null;
  }

  function showDragToast(text) {
    const t = document.createElement('div');
    t.className = 'drag-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  function startDrag(x, y) {
    drag.started = true;
    document.body.classList.add('dragging-step');
    drag.stepEl.classList.add('drag-source');
    const g = drag.stepEl.cloneNode(true);
    g.classList.add('drag-ghost');
    g.removeAttribute('data-action');
    g.style.width = `${drag.stepEl.getBoundingClientRect().width}px`;
    document.body.appendChild(g);
    drag.ghost = g;
    moveDrag(x, y);
  }

  function moveDrag(x, y) {
    drag.ghost.style.left = `${x + 8}px`;
    drag.ghost.style.top = `${y + 8}px`;
    const today = todayStr();
    weekStrip.querySelectorAll('.day-card').forEach(c => c.classList.remove('drop-ok', 'drop-bad'));
    const card = dropTargetCard(x, y);
    if (!card || card.dataset.date === drag.fromDate) return;
    const r = Placement.canDropPin({ fromDate: drag.fromDate, toDate: card.dataset.date, today });
    card.classList.add(r.ok ? 'drop-ok' : 'drop-bad');
  }

  function endDrag(x, y, cancelled) {
    const d = drag;
    drag = null;
    clearTimeout(d.timer);
    document.removeEventListener('pointermove', onDragPointerMove);
    document.removeEventListener('pointerup', onDragPointerUp);
    document.removeEventListener('pointercancel', onDragPointerCancel);
    if (!d.started) return;
    suppressClick = true; // 끌고 난 직후의 클릭이 메뉴를 열지 않게
    setTimeout(() => { suppressClick = false; }, 0);
    document.body.classList.remove('dragging-step');
    d.ghost.remove();
    d.stepEl.classList.remove('drag-source');
    weekStrip.querySelectorAll('.day-card').forEach(c => c.classList.remove('drop-ok', 'drop-bad'));
    if (cancelled) return;
    const card = dropTargetCard(x, y);
    if (!card) return;
    const r = Placement.canDropPin({ fromDate: d.fromDate, toDate: card.dataset.date, today: todayStr() });
    if (!r.ok) { if (r.reason) showDragToast(r.reason); return; }
    const step = state.steps.find(s => s.id === d.stepId);
    if (!step || step.done) return;
    step.pinnedDate = card.dataset.date;
    openMenu = null;
    saveState();
    renderCarpet();
  }

  function onDragPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (drag.touch) {
        // 길게 누르기 전에 움직였으면 스크롤하려는 것이니 끌기를 포기한다
        if (moved > DRAG_MOVE_PX * 2) { clearTimeout(drag.timer); drag = null; removeDragListeners(); }
      } else if (moved > DRAG_MOVE_PX) {
        startDrag(e.clientX, e.clientY);
      }
      return;
    }
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  }
  function onDragPointerUp(e) { if (drag && e.pointerId === drag.pointerId) endDrag(e.clientX, e.clientY, false); }
  function onDragPointerCancel(e) { if (drag && e.pointerId === drag.pointerId) endDrag(e.clientX, e.clientY, true); }
  function removeDragListeners() {
    document.removeEventListener('pointermove', onDragPointerMove);
    document.removeEventListener('pointerup', onDragPointerUp);
    document.removeEventListener('pointercancel', onDragPointerCancel);
  }

  weekStrip.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const stepEl = e.target.closest('.day-item.step.clickable');
    if (!stepEl || e.target.closest('button, input, select')) return;
    const card = stepEl.closest('.day-card');
    drag = {
      stepEl, stepId: stepEl.dataset.stepId, fromDate: card.dataset.date,
      startX: e.clientX, startY: e.clientY, pointerId: e.pointerId,
      touch: e.pointerType === 'touch', started: false, timer: null, ghost: null,
    };
    if (drag.touch) {
      const pending = drag;
      drag.timer = setTimeout(() => { if (drag === pending) startDrag(pending.startX, pending.startY); }, DRAG_LONG_PRESS_MS);
    }
    document.addEventListener('pointermove', onDragPointerMove);
    document.addEventListener('pointerup', onDragPointerUp);
    document.addEventListener('pointercancel', onDragPointerCancel);
  });

  // 끌기가 시작된 뒤에는 터치가 화면을 스크롤하지 않게 막는다 (passive: false여야 막을 수 있다)
  document.addEventListener('touchmove', (e) => { if (drag && drag.started) e.preventDefault(); }, { passive: false });
  weekStrip.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); }); // 길게 누르면 뜨는 메뉴 막기
  document.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

  document.getElementById('screen-carpet').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const step = state.steps.find(st => st.id === target.dataset.stepId);
    const today = todayStr();
    if (target.disabled) return;
    const dateValue = () => { const el = document.getElementById('step-menu-date'); return el ? el.value : ''; };

    if (action === 'skip-event-day') {
      // 반복 예외: 그 날 하루만 뺀다 (SPEC 10장). 개별 회차 편집은 하지 않는다
      const ev = state.events.find(x => x.id === target.dataset.eventId);
      const date = target.dataset.date;
      if (!ev || ev.repeat === 'none' || !date) return;
      ev.skipDates = [...new Set([...(ev.skipDates || []), date])].sort();
      saveState();
      renderCarpet();
      renderEvents();
      return;
    }

    if (action === 'open-step-menu') {
      openMenu = openMenu && openMenu.stepId === step.id ? null : { stepId: step.id, mode: 'menu' };
    } else if (action === 'close-step-menu') {
      openMenu = null;
    } else if (action === 'step-done-open') {
      openMenu = { stepId: step.id, mode: 'done' };
    } else if (action === 'step-pin-open') {
      openMenu = { stepId: step.id, mode: 'pin' };
    } else if (action === 'step-done-confirm') {
      const date = dateValue();
      if (!date) { alert('날짜를 입력하세요.'); return; }
      if (date > today) { alert('아직 오지 않은 날짜는 완료일로 기록할 수 없습니다.'); return; }
      step.done = true;
      step.doneDate = date;
      openMenu = null;
      saveState();
    } else if (action === 'step-push') {
      step.earliestDate = Placement.pushEarliestDate(target.dataset.date);
      step.pushCount = (step.pushCount || 0) + 1;
      openMenu = null;
      saveState();
    } else if (action === 'step-pin-confirm') {
      const date = dateValue();
      if (!date) { alert('날짜를 입력하세요.'); return; }
      if (date < today) { alert('지난 날짜에는 고정할 수 없습니다.'); return; }
      step.pinnedDate = date;
      openMenu = null;
      saveState();
    } else if (action === 'step-unpin') {
      delete step.pinnedDate;
      openMenu = null;
      saveState();
    } else {
      return;
    }
    renderCarpet();
  });

  renderCarpet();
