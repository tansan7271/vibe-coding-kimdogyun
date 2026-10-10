// 할 일 화면과 AI 분해("텍스트로 만들기"). app-common.js 다음에 읽는다

  // ---- 할 일 화면 ----


  const expandedGoals = new Set();

  function stepsForGoal(goalId) {
    return state.steps
      .filter(s => s.goalId === goalId)
      .sort((a, b) => a.order - b.order);
  }

  function stepRowHtml(step) {
    return `
      <div class="step-row" data-step-id="${step.id}">
        <button type="button" class="btn-plain" data-action="move-step-up" data-step-id="${step.id}">▲</button>
        <button type="button" class="btn-plain" data-action="move-step-down" data-step-id="${step.id}">▼</button>
        <input type="text" class="step-title-input" data-field="title" data-step-id="${step.id}" value="${escapeAttr(step.title)}" placeholder="중간 단계 제목">
        ${loadPickerHtml(step.id, step.load)}
        <input type="number" class="step-minutes-input" data-field="minutes" data-step-id="${step.id}" value="${step.minutes}" step="30" min="30"> 분
        <button type="button" class="btn btn-danger" data-action="delete-step" data-step-id="${step.id}">삭제</button>
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
        <input type="text" class="step-title-input" id="new-step-title-${goalId}" data-draft="title" data-goal-id="${goalId}" value="${escapeAttr(title)}" placeholder="새 중간 단계 제목">
        ${loadPickerHtml(key, selected)}
        <input type="number" class="step-minutes-input" id="new-step-minutes-${goalId}" data-draft="minutes" data-goal-id="${goalId}" value="${minutes}" step="30" min="30"> 분
        <button type="button" class="btn" data-action="add-step" data-goal-id="${goalId}">단계 추가</button>
      </div>`;
  }

  function goalCardHtml(goal) {
    const expanded = expandedGoals.has(goal.id);
    const steps = stepsForGoal(goal.id);
    const stepsHtml = steps.length
      ? steps.map(stepRowHtml).join('')
      : '<div class="empty-hint">아직 중간 단계가 없습니다.</div>';

    return `
      <div class="goal-card" data-goal-id="${goal.id}">
        <div class="goal-header">
          <div class="goal-header-info" data-action="toggle-expand" data-goal-id="${goal.id}">
            <span class="goal-title">${escapeHtml(goal.title)}</span>
            <span class="goal-deadline">마감 ${goal.deadline}</span>
            <span>${expanded ? '▲' : '▼'}</span>
          </div>
          <div class="goal-actions">
            ${steps.some(s => !s.done) ? `<button type="button" class="btn" data-action="complete-goal" data-goal-id="${goal.id}">완료</button>` : ''}
            <button type="button" class="btn btn-danger" data-action="delete-goal" data-goal-id="${goal.id}">삭제</button>
          </div>
        </div>
        ${expanded ? `
          <div class="goal-body">
            <div class="goal-edit-row">
              <input type="text" data-field="title" data-goal-id="${goal.id}" value="${escapeAttr(goal.title)}" placeholder="제목">
              <input type="date" data-field="deadline" data-goal-id="${goal.id}" value="${goal.deadline}">
            </div>
            ${stepsHtml}
            ${stepAddFormHtml(goal.id)}
          </div>` : ''}
      </div>`;
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
    if (!btn) return;
    goalTab = btn.dataset.tab;
    renderGoals();
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

  goalList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'toggle-expand') {
      const goalId = target.dataset.goalId;
      expandedGoals.has(goalId) ? expandedGoals.delete(goalId) : expandedGoals.add(goalId);
      renderGoals();
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

    if (action === 'move-step-up' || action === 'move-step-down') {
      const stepId = target.dataset.stepId;
      const step = state.steps.find(s => s.id === stepId);
      const siblings = stepsForGoal(step.goalId);
      const idx = siblings.findIndex(s => s.id === stepId);
      const swapIdx = action === 'move-step-up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return;
      const other = siblings[swapIdx];
      const tmp = step.order;
      step.order = other.order;
      other.order = tmp;
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

  function renderAiKeyUi() {
    aiOpenBtn.style.display = hasAiKey() ? '' : 'none';
    aiKeyStatus.textContent = hasAiKey() ? 'API 키가 메모리에 있습니다 (새로고침하면 사라집니다).' : 'API 키가 없습니다. AI 기능은 숨겨져 있습니다.';
    if (!hasAiKey()) { aiPanel.style.display = 'none'; closeAiDraft(); }
  }

  document.getElementById('ai-key-save').addEventListener('click', () => {
    const v = aiKeyInput.value.trim();
    if (!v) return;
    aiKey = v;
    aiKeyInput.value = '';
    renderAiKeyUi();
  });

  document.getElementById('ai-key-delete').addEventListener('click', () => {
    aiKey = '';
    aiKeyInput.value = '';
    renderAiKeyUi();
  });

  aiOpenBtn.addEventListener('click', () => {
    aiPanel.style.display = aiPanel.style.display === 'none' ? '' : 'none';
  });

  document.getElementById('ai-cancel-btn').addEventListener('click', () => {
    aiPanel.style.display = 'none';
    aiMessage.textContent = '';
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
    const manual = ' 할 일은 위의 입력칸에서 직접 추가할 수 있습니다.';
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

  function renderAiDraft() {
    const d = aiDraft;
    aiDraftBox.style.display = '';
    aiDraftBox.innerHTML = `
      <div><strong>초안 (고쳐서 확정하면 저장됩니다)</strong></div>
      <div class="ai-step-row" style="margin-top:8px">
        <input type="text" id="ai-draft-title" value="${escapeAttr(d.title)}" placeholder="할 일 제목">
        <input type="date" id="ai-draft-deadline" value="${escapeAttr(d.deadline)}">
        ${d.deadlineWarn ? '<span class="ai-warn">마감일을 정해 주세요</span>' : ''}
      </div>
      ${d.steps.map((s, i) => `
        <div class="ai-step-row">
          <span>${i + 1}.</span>
          <input type="text" data-ai-step="${i}" data-ai-field="title" value="${escapeAttr(s.title)}" placeholder="단계 제목">
          <select data-ai-step="${i}" data-ai-field="load">${[1, 2, 3, 4, 5].map(l => `<option value="${l}"${s.load === l ? ' selected' : ''}>부하 ${l}</option>`).join('')}</select>
          <input type="number" data-ai-step="${i}" data-ai-field="minutes" value="${s.minutes}" min="30" step="30"> 분
          <button class="btn btn-plain" type="button" data-ai-del="${i}">지우기</button>
          ${s.warn ? `<span class="ai-warn">${escapeHtml(s.warn)}</span>` : ''}
        </div>`).join('')}
      <div id="ai-draft-error" class="ai-warn"></div>
      <button class="btn" id="ai-confirm-btn" type="button">확정해서 저장</button>
      <button class="btn btn-plain" id="ai-discard-btn" type="button">버리기</button>`;
  }

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
    expandedGoals.add(goalId);
    closeAiDraft();
    aiPanel.style.display = 'none';
    document.getElementById('ai-text').value = '';
    renderGoals();
    renderCarpet();
  });

  renderAiKeyUi();
