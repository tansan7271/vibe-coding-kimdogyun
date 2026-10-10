// 할 일 화면과 AI 분해("텍스트로 만들기"). app-common.js 다음에 읽는다

  // ---- 할 일 화면 ----


  const expandedGoals = new Set();

  function stepsForGoal(goalId) {
    return state.steps
      .filter(s => s.goalId === goalId)
      .sort((a, b) => a.order - b.order);
  }

  // 공통 서식 조각: 입력칸과 버튼은 사이트의 다른 부분과 같은 클래스를 쓴다 (style.css의 .sbtn, .line-field)
  const GRIP = '<svg class="grip" viewBox="0 0 10 16" aria-hidden="true"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></svg>'; // 끌 수 있음을 알리는 2x3 점
  const CHEV_DOWN = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';
  const textField = (attrs, extraCls = '') => `<span class="line-field ${extraCls}"><input type="text" class="line-input" ${attrs}></span>`; // 아래 실선(양끝 둥근) 칸
  const chipField = (inputHtml) => `<label class="sbtn sbtn-sm sbtn-field">${inputHtml}</label>`; // 스티치 버튼 모양에서 점선만 뺀 칸(날짜·숫자·선택). 카드 안 버튼(.sbtn-sm)과 높이가 같다
  const gripHtml = `<span class="step-grip" aria-label="끌어서 순서 바꾸기" title="끌어서 순서 바꾸기">${GRIP}</span>`;

  function stepRowHtml(step) {
    return `
      <div class="step-row" data-step-id="${step.id}">
        ${gripHtml}
        ${textField(`data-field="title" data-step-id="${step.id}" value="${escapeAttr(step.title)}" placeholder="중간 단계 제목"`, 'step-title-field')}
        ${loadPickerHtml(step.id, step.load)}
        ${chipField(`<input type="number" class="step-minutes-input" data-field="minutes" data-step-id="${step.id}" value="${step.minutes}" step="30" min="30">`)} 분
        <button type="button" class="sbtn sbtn-sm sbtn-danger" data-action="delete-step" data-step-id="${step.id}">삭제</button>
      </div>`;
  }

  function stepAddFormHtml(goalId) {
    const key = `new-${goalId}`;
    const draft = newStepDrafts[goalId] || {};
    const selected = draft.load || 3;
    const title = draft.title || '';
    const minutes = draft.minutes || 60;
    return `
      <div class="step-add-form" data-goal-id="${goalId}">
        ${textField(`id="new-step-title-${goalId}" data-draft="title" data-goal-id="${goalId}" value="${escapeAttr(title)}" placeholder="새 중간 단계 제목"`, 'step-title-field')}
        ${loadPickerHtml(key, selected)}
        ${chipField(`<input type="number" class="step-minutes-input" id="new-step-minutes-${goalId}" data-draft="minutes" data-goal-id="${goalId}" value="${minutes}" step="30" min="30">`)} 분
        <button type="button" class="sbtn sbtn-sm sbtn-accent" data-action="add-step" data-goal-id="${goalId}">단계 추가</button>
      </div>`;
  }

  // 카드 본문(제목·마감 고치기, 단계 목록, 단계 추가). 펼친 카드만 그린다: 접힌 카드까지 입력칸을 다 그리면 요소가 많아져 펼침/접힘이 버벅인다
  function goalBodyHtml(goal) {
    const steps = stepsForGoal(goal.id);
    const stepsHtml = steps.length
      ? steps.map(stepRowHtml).join('')
      : '<div class="empty-hint">아직 중간 단계가 없습니다.</div>';
    return `
      <div class="goal-edit-row">
        ${textField(`data-field="title" data-goal-id="${goal.id}" value="${escapeAttr(goal.title)}" placeholder="제목"`, 'goal-title-field')}
        ${chipField(`<input type="date" data-field="deadline" data-goal-id="${goal.id}" value="${goal.deadline}" required>`)}
      </div>
      ${stepsHtml}
      ${stepAddFormHtml(goal.id)}`;
  }

  // 카드 머리 전체(제목·마감·빈 곳)를 누르면 펼침/접힘. 버튼은 자기 동작이 먼저다. 높이만 바꿔서 아코디언 애니메이션이 된다.
  // .goal-item은 화면 밖 카드를 그리지 않게(content-visibility) 하는 바깥 상자다. 카드 그림자가 잘리지 않을 만큼 여유를 둔다
  function goalCardHtml(goal) {
    const expanded = expandedGoals.has(goal.id);
    const steps = stepsForGoal(goal.id);
    return `
      <div class="goal-item">
      <div class="goal-card${expanded ? ' expanded' : ''}" data-goal-id="${goal.id}">
        <div class="goal-header" data-action="toggle-expand" data-goal-id="${goal.id}" aria-expanded="${expanded}">
          <div class="goal-header-info">
            <span class="goal-title">${escapeHtml(goal.title)}</span>
            <span class="goal-deadline">마감 ${goal.deadline}</span>
            ${CHEV_DOWN.replace('class="chev"', 'class="chev goal-chev"')}
          </div>
          <div class="goal-actions">
            ${steps.some(s => !s.done) ? `<button type="button" class="sbtn sbtn-sm sbtn-accent" data-action="complete-goal" data-goal-id="${goal.id}">완료</button>` : ''}
            <button type="button" class="sbtn sbtn-sm sbtn-danger" data-action="delete-goal" data-goal-id="${goal.id}">삭제</button>
          </div>
        </div>
        <div class="goal-acc">
          <div class="goal-body"><div class="goal-body-inner">${expanded ? goalBodyHtml(goal) : ''}</div></div>
        </div>
      </div>
      </div>`;
  }

  // 아코디언: 한 번에 하나만 펼쳐진다. 펼칠 때 본문을 그리고, 접힌 뒤(애니메이션이 끝나면) 지운다
  function collapseGoalCard(card) {
    card.classList.remove('expanded');
    card.querySelector('.goal-header').setAttribute('aria-expanded', 'false');
    clearTimeout(card._clearTimer);
    card._clearTimer = setTimeout(() => {
      if (!card.classList.contains('expanded')) card.querySelector('.goal-body-inner').innerHTML = '';
    }, cssMs('--acc-ms') + 80);
  }

  function expandGoalCard(card, goal) {
    clearTimeout(card._clearTimer);
    card.querySelector('.goal-body-inner').innerHTML = goalBodyHtml(goal);
    void card.offsetHeight; // 접힌 상태를 한 번 계산시켜 둬야 0에서 펼쳐지는 애니메이션이 돈다
    card.classList.add('expanded');
    card.querySelector('.goal-header').setAttribute('aria-expanded', 'true');
  }

  // 단계 순서 바꾸기: 손잡이(점 2x3)를 끌면 그 줄이 포인터를 따라가고, 다른 줄의 가운데를 넘으면 자리를 바꾼다. 마우스·터치·펜 공용
  function startRowDrag(e, row, commit) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const grip = e.target.closest('.step-grip');
    const parent = row.parentNode;
    const startOffset = row.offsetTop, startY = e.clientY, h = row.offsetHeight;
    const rowsNow = () => [...parent.querySelectorAll(':scope > .step-row')];
    row.classList.add('dragging');
    grip.setPointerCapture(e.pointerId);

    const move = (ev) => {
      const dy = ev.clientY - startY;
      const center = startOffset + dy + h / 2; // 끌고 있는 줄의 가운데(화면 위치)
      let rows = rowsNow(), idx = rows.indexOf(row);
      while (idx > 0 && center < rows[idx - 1].offsetTop + rows[idx - 1].offsetHeight / 2) { parent.insertBefore(row, rows[idx - 1]); rows = rowsNow(); idx = rows.indexOf(row); }
      while (idx < rows.length - 1 && center > rows[idx + 1].offsetTop + rows[idx + 1].offsetHeight / 2) { parent.insertBefore(row, rows[idx + 1].nextSibling); rows = rowsNow(); idx = rows.indexOf(row); }
      row.style.transform = `translateY(${startOffset + dy - row.offsetTop}px)`; // 자리가 바뀌어도 줄은 포인터 밑에 그대로 있다
    };
    const end = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      row.classList.remove('dragging');
      row.style.transform = '';
      commit(rowsNow());
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  const goalList = document.getElementById('goal-list');
  const newStepDrafts = {}; // goalId -> { load }

  let goalTab = 'active'; // 'active'(진행 중) | 'done'(완료)


  function renderGoals() {
    const sorted = [...state.goals].sort((a, b) => a.deadline.localeCompare(b.deadline));
    const isDone = g => Placement.isGoalDone(stepsForGoal(g.id));
    const doneGoals = sorted.filter(isDone);
    const activeGoals = sorted.filter(g => !isDone(g));
    renderTabs('goal-tabs', goalTab, [
      { key: 'active', label: '진행 중', count: activeGoals.length },
      { key: 'done', label: '완료', count: doneGoals.length },
    ]);
    const shown = goalTab === 'done' ? doneGoals : activeGoals;
    const empty = goalTab === 'done'
      ? '완료한 할 일이 없습니다.'
      : (state.goals.length ? '진행 중인 할 일이 없습니다.' : '아직 할 일이 없습니다. 위에서 추가하세요.');
    goalList.innerHTML = shown.length
      ? shown.map(goalCardHtml).join('')
      : `<div class="empty-hint">${empty}</div>`;
  }

  document.getElementById('goal-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn || btn.dataset.tab === goalTab) return;
    const order = ['active', 'done'];
    const dir = order.indexOf(btn.dataset.tab) > order.indexOf(goalTab) ? 'next' : 'prev'; // 아래쪽 탭이면 지금 페이지가 넘어가고, 위쪽 탭이면 새 페이지가 덮는다
    pageTurn(document.getElementById('modal-goals'), () => {
      goalTab = btn.dataset.tab;
      renderGoals();
    }, dir);
  });

  document.getElementById('add-goal-btn').addEventListener('click', () => {
    const titleInput = document.getElementById('new-goal-title');
    const deadlineInput = document.getElementById('new-goal-deadline');
    const title = titleInput.value.trim();
    const deadline = deadlineInput.value;
    if (!title || !deadline) return;

    state.goals.push({ id: uid('goal'), title, deadline, createdAt: todayStr() });
    saveState();
    titleInput.value = '';
    deadlineInput.value = '';
    renderGoals();
  });

  goalList.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest('.step-grip');
    if (!grip) return;
    const row = grip.closest('.step-row');
    const goalId = row.closest('.goal-card').dataset.goalId;
    startRowDrag(e, row, (rows) => { // 끝났을 때 줄 순서대로 order를 다시 매긴다
      rows.forEach((r, i) => { const st = state.steps.find(x => x.id === r.dataset.stepId); if (st) st.order = i; });
      saveState();
    });
  });

  goalList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'toggle-expand') {
      const goalId = target.dataset.goalId;
      const card = target.closest('.goal-card');
      if (expandedGoals.has(goalId)) {
        expandedGoals.delete(goalId);
        collapseGoalCard(card);
      } else {
        goalList.querySelectorAll('.goal-card.expanded').forEach(collapseGoalCard); // 한 번에 하나만 펼친다
        expandedGoals.clear();
        expandedGoals.add(goalId);
        expandGoalCard(card, state.goals.find(g => g.id === goalId));
      }
      return;
    }

    if (action === 'complete-goal') {
      const goalId = target.dataset.goalId;
      const left = stepsForGoal(goalId).filter(s => !s.done);
      if (!confirm(`남은 중간 단계 ${left.length}개를 오늘 완료한 것으로 기록하고, 이 할 일을 완료로 옮길까요?`)) return;
      const date = todayStr();
      left.forEach(s => { s.done = true; s.doneDate = date; });
      saveState();
      renderGoals();
      return;
    }

    if (action === 'delete-goal') {
      const goalId = target.dataset.goalId;
      if (!confirm('이 할 일과 모든 중간 단계를 삭제할까요?')) return;
      state.goals = state.goals.filter(g => g.id !== goalId);
      state.steps = state.steps.filter(s => s.goalId !== goalId);
      saveState();
      renderGoals();
      return;
    }

    if (action === 'delete-step') {
      const stepId = target.dataset.stepId;
      if (!confirm('이 중간 단계를 삭제할까요?')) return;
      state.steps = state.steps.filter(s => s.id !== stepId);
      saveState();
      renderGoals();
      return;
    }

    if (action === 'select-load') {
      const key = target.dataset.loadKey;
      const load = Number(target.dataset.load);
      if (key.startsWith('new-')) {
        const goalId = key.slice(4);
        newStepDrafts[goalId] = { ...(newStepDrafts[goalId] || {}), load };
      } else {
        const step = state.steps.find(s => s.id === key);
        if (step) { step.load = load; saveState(); }
      }
      renderGoals();
      return;
    }

    if (action === 'add-step') {
      const goalId = target.dataset.goalId;
      const titleInput = document.getElementById(`new-step-title-${goalId}`);
      const minutesInput = document.getElementById(`new-step-minutes-${goalId}`);
      const title = titleInput.value.trim();
      if (!title) return;
      const minutes = Number(minutesInput.value) || 60;
      const load = (newStepDrafts[goalId] && newStepDrafts[goalId].load) || 3;
      const order = stepsForGoal(goalId).length;
      state.steps.push({
        id: uid('step'), goalId, title, load, minutes, order,
        done: false, pushCount: 0,
      });
      saveState();
      delete newStepDrafts[goalId];
      renderGoals();
      return;
    }
  });

  goalList.addEventListener('input', (e) => {
    const draftField = e.target.dataset.draft;
    if (!draftField) return;
    const goalId = e.target.dataset.goalId;
    const current = newStepDrafts[goalId] || {};
    current[draftField] = draftField === 'minutes' ? Number(e.target.value) || 60 : e.target.value;
    newStepDrafts[goalId] = current;
  });

  goalList.addEventListener('change', (e) => {
    const field = e.target.dataset.field;
    if (!field) return;

    if (e.target.dataset.goalId) {
      const goal = state.goals.find(g => g.id === e.target.dataset.goalId);
      if (!goal) return;
      if (field === 'title') {
        const v = e.target.value.trim();
        if (!v) { e.target.value = goal.title; return; }
        goal.title = v;
      } else if (field === 'deadline') {
        if (!e.target.value) { e.target.value = goal.deadline; return; }
        goal.deadline = e.target.value;
      }
      saveState();
      renderGoals();
      return;
    }

    if (e.target.dataset.stepId) {
      const step = state.steps.find(s => s.id === e.target.dataset.stepId);
      if (!step) return;
      if (field === 'title') {
        const v = e.target.value.trim();
        if (!v) { e.target.value = step.title; return; }
        step.title = v;
      } else if (field === 'minutes') {
        step.minutes = Number(e.target.value) || 60;
      }
      saveState();
    }
  });

  renderGoals();

  // ---- AI 분해: 텍스트로 만들기 (SPEC 9장) ----

  const aiOpenBtn = document.getElementById('ai-open-btn');
  const aiPanel = document.getElementById('ai-panel');
  const aiDraftBox = document.getElementById('ai-draft');
  const aiMessage = document.getElementById('ai-message');
  const aiKeyInput = document.getElementById('ai-key-input');
  const aiKeyStatus = document.getElementById('ai-key-status');
  let aiDraft = null; // 편집 중인 초안. 확정 전에는 state에 넣지 않는다
  let aiBusy = false;

  let aiKey = ''; // API 키는 메모리에만 둔다. localStorage, sessionStorage, 내보내기 파일에 쓰지 않는다

  function hasAiKey() {
    return aiKey !== '';
  }

  // 입력줄 상태: 키가 없으면 직접 입력줄만. 키가 있으면 AI 입력기가 입력줄을 대체하고(기본), '직접 추가'를 누르면 직접 입력줄로 바뀌어 'AI와 추가' 버튼이 나타난다
  let composeAi = true; // 키가 있을 때 AI 입력기를 보여 주는가
  const addForm = document.getElementById('goal-add-form');
  const placeModeBtn = document.getElementById('place-mode-toggle');
  const placeSlotManual = document.getElementById('place-mode-slot-manual');
  const placeSlotAi = document.getElementById('place-mode-slot-ai');

  function renderCompose() {
    const useAi = hasAiKey() && composeAi;
    addForm.hidden = useAi;
    aiPanel.hidden = !useAi;
    aiOpenBtn.hidden = !hasAiKey() || useAi; // AI와 추가: 키가 있는데 직접 입력줄을 보고 있을 때만
    (useAi ? placeSlotAi : placeSlotManual).appendChild(placeModeBtn); // 깔기 방식 버튼은 어느 상태에서나 보이게 옮겨 둔다
  }

  function renderAiKeyUi() {
    aiKeyStatus.textContent = hasAiKey() ? 'API 키가 메모리에 있습니다 (새로고침하면 사라집니다).' : 'API 키가 없습니다. AI 기능은 숨겨져 있습니다.';
    if (!hasAiKey()) { aiMessage.textContent = ''; closeAiDraft(); }
    renderCompose();
  }

  document.getElementById('ai-key-save').addEventListener('click', () => {
    const v = aiKeyInput.value.trim();
    if (!v) return;
    aiKey = v;
    composeAi = true; // 키를 넣으면 AI 입력기부터 보인다
    aiKeyInput.value = '';
    renderAiKeyUi();
  });

  document.getElementById('ai-key-delete').addEventListener('click', () => {
    aiKey = '';
    aiKeyInput.value = '';
    renderAiKeyUi();
  });

  aiOpenBtn.addEventListener('click', () => { // AI와 추가
    composeAi = true;
    renderCompose();
  });

  document.getElementById('manual-open-btn').addEventListener('click', () => { // 직접 추가
    composeAi = false;
    aiMessage.textContent = '';
    renderCompose();
  });

  function closeAiDraft() {
    aiDraft = null;
    aiDraftBox.style.display = 'none';
    aiDraftBox.innerHTML = '';
  }

  document.getElementById('ai-run-btn').addEventListener('click', async () => {
    if (aiBusy) return;
    const text = document.getElementById('ai-text').value.trim();
    if (!text) { aiMessage.textContent = '붙여넣을 글이 비어 있습니다.'; return; }
    if (text.length > Ai.MAX_TEXT_LENGTH) { aiMessage.textContent = `글이 너무 깁니다 (${Ai.MAX_TEXT_LENGTH}자까지). 줄여서 다시 시도하세요.`; return; }
    if (!hasAiKey()) { renderAiKeyUi(); return; }

    const runBtn = document.getElementById('ai-run-btn');
    aiBusy = true;
    runBtn.disabled = true;
    aiMessage.textContent = 'AI가 나누는 중... (최대 30초)';
    const today = todayStr();
    const req = Ai.buildRequest({ text, today, apiKey: aiKey });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const manual = " 할 일은 '직접 추가'를 눌러 입력줄에서 직접 추가할 수 있습니다."; // AI 입력기가 입력줄 자리를 대신하므로 안내도 그에 맞춘다
    try {
      const res = await fetch(req.url, { ...req.init, signal: controller.signal });
      if (!res.ok) { aiMessage.textContent = Ai.describeHttpError(res.status) + manual; return; }
      let json;
      try { json = await res.json(); } catch (e) { aiMessage.textContent = '응답을 읽지 못했습니다.' + manual; return; }
      const parsed = Ai.parseDraft(json, today);
      if (!parsed.ok) { aiMessage.textContent = parsed.error + manual; return; }
      aiMessage.textContent = '';
      aiDraft = parsed.draft;
      renderAiDraft();
    } catch (e) {
      aiMessage.textContent = (e.name === 'AbortError' ? '30초 안에 응답이 오지 않았습니다.' : '네트워크 오류로 AI를 부르지 못했습니다.') + manual;
    } finally {
      clearTimeout(timer);
      aiBusy = false;
      runBtn.disabled = false;
    }
  });

  // AI 초안 카드: 일반 할 일 카드와 같은 마크업과 서식(머리 + 펼쳐진 본문)을 그대로 쓴다. 머리 버튼만 버리기/확정이다
  function renderAiDraft() {
    const d = aiDraft;
    aiDraftBox.style.display = '';
    aiDraftBox.className = 'goal-card expanded draft-card';
    aiDraftBox.innerHTML = `
      <div class="goal-header">
        <div class="goal-header-info">
          <span class="goal-title">초안</span>
          <span class="goal-deadline">고쳐서 확정하면 저장됩니다</span>
        </div>
        <div class="goal-actions">
          <button class="sbtn sbtn-sm sbtn-danger" id="ai-discard-btn" type="button">버리기</button>
          <button class="sbtn sbtn-sm sbtn-accent" id="ai-confirm-btn" type="button">확정해서 저장</button>
        </div>
      </div>
      <div class="goal-acc"><div class="goal-body"><div class="goal-body-inner">
        <div class="goal-edit-row">
          ${textField(`id="ai-draft-title" value="${escapeAttr(d.title)}" placeholder="할 일 제목"`, 'goal-title-field')}
          ${chipField(`<input type="date" id="ai-draft-deadline" value="${escapeAttr(d.deadline)}" required>`)}
          ${d.deadlineWarn ? '<span class="ai-warn">마감일을 정해 주세요</span>' : ''}
        </div>
        ${d.steps.map((s, i) => `
          <div class="step-row" data-ai-row="${i}">
            ${gripHtml}
            ${textField(`data-ai-step="${i}" data-ai-field="title" value="${escapeAttr(s.title)}" placeholder="단계 제목"`, 'step-title-field')}
            ${loadPickerHtml(`ai-${i}`, s.load)}
            ${chipField(`<input type="number" class="step-minutes-input" data-ai-step="${i}" data-ai-field="minutes" value="${s.minutes}" min="30" step="30">`)} 분
            <button class="sbtn sbtn-sm sbtn-danger" type="button" data-ai-del="${i}">삭제</button>
            ${s.warn ? `<span class="ai-warn">${escapeHtml(s.warn)}</span>` : ''}
          </div>`).join('')}
        <div id="ai-draft-error" class="ai-warn"></div>
      </div></div></div>`;
  }

  aiDraftBox.addEventListener('pointerdown', (e) => { // 단계를 끌어서 순서를 바꾼다(일반 카드와 같은 끌기)
    const grip = e.target.closest('.step-grip');
    if (!grip || !aiDraft) return;
    startRowDrag(e, grip.closest('.step-row'), (rows) => {
      aiDraft.steps = rows.map(r => aiDraft.steps[Number(r.dataset.aiRow)]);
      renderAiDraft();
    });
  });

  aiDraftBox.addEventListener('input', (e) => {
    if (!aiDraft) return;
    const t = e.target;
    if (t.id === 'ai-draft-title') aiDraft.title = t.value;
    else if (t.id === 'ai-draft-deadline') { aiDraft.deadline = t.value; aiDraft.deadlineWarn = false; }
    else if (t.dataset.aiStep !== undefined) {
      const step = aiDraft.steps[Number(t.dataset.aiStep)];
      const f = t.dataset.aiField;
      step[f] = f === 'title' ? t.value : Number(t.value);
    }
  });

  aiDraftBox.addEventListener('click', (e) => {
    if (!aiDraft) return;
    const del = e.target.closest('[data-ai-del]');
    if (del) { aiDraft.steps.splice(Number(del.dataset.aiDel), 1); renderAiDraft(); return; }
    const loadBtn = e.target.closest('[data-action="select-load"]'); // 부하는 일반 카드와 같은 1~5 동그라미에서 고른다
    if (loadBtn && loadBtn.dataset.loadKey.startsWith('ai-')) {
      aiDraft.steps[Number(loadBtn.dataset.loadKey.slice(3))].load = Number(loadBtn.dataset.load);
      renderAiDraft();
      return;
    }
    if (e.target.id === 'ai-discard-btn') { closeAiDraft(); return; }
    if (e.target.id !== 'ai-confirm-btn') return;

    const d = aiDraft;
    const err = document.getElementById('ai-draft-error');
    const title = d.title.trim();
    if (!title) { err.textContent = '할 일 제목을 입력하세요.'; return; }
    if (!Data.isDateStr(d.deadline)) { err.textContent = '마감일을 입력하세요.'; return; }
    if (d.steps.length === 0) { err.textContent = '단계가 하나도 없습니다.'; return; }
    for (const [i, s] of d.steps.entries()) {
      if (!s.title.trim()) { err.textContent = `${i + 1}번 단계의 제목을 입력하세요.`; return; }
      if (!(Number.isInteger(s.load) && s.load >= 1 && s.load <= 5)) { err.textContent = `${i + 1}번 단계의 부하는 1~5여야 합니다.`; return; }
      if (!(s.minutes > 0)) { err.textContent = `${i + 1}번 단계의 예상 시간은 0보다 커야 합니다.`; return; }
    }

    const goalId = uid('goal');
    state.goals.push({ id: goalId, title, deadline: d.deadline, createdAt: todayStr() });
    d.steps.forEach((s, i) => {
      state.steps.push({ id: uid('step'), goalId, title: s.title.trim(), load: s.load, minutes: s.minutes, order: i, done: false, pushCount: 0 });
    });
    saveState();
    expandedGoals.clear(); // 한 번에 하나만 펼친다
    expandedGoals.add(goalId);
    closeAiDraft();
    document.getElementById('ai-text').value = ''; // AI 입력기는 그대로 두고 비운다
    renderGoals();
    renderCarpet();
  });

  renderAiKeyUi();
