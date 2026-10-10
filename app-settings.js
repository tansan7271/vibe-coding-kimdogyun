// 일정과 설정 화면(일정 목록, 기본값, 데이터 내보내기/가져오기). app-common.js 다음에 읽는다

  // ---- 일정과 설정 화면 ----

  const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
  const newEventDraft = { load: 3 };
  const eventList = document.getElementById('event-list');

  const REPEAT_LABELS = { none: '반복 없음', weekly: '매주', biweekly: '격주', monthly: '매월' };

  function eventSortKey(ev) {
    if (ev.repeat === 'weekly') return `1-${ev.weekday}`;
    if (ev.repeat === 'biweekly') return `1-${ev.date ? Placement.weekdayOf(ev.date) : 0}`;
    return `0-${ev.date}`; // 반복 없음, 매월은 날짜순
  }

  // 반복 일정은 시작 날짜부터 생긴다 (그 이전에는 없다). 매주의 시작 날짜는 옛 데이터에는 없을 수 있다
  function eventRepeatFieldsHtml(ev) {
    const dateInput = chipField(`<input type="date" data-field="date" data-event-id="${ev.id}" value="${ev.date || ''}" required>`);
    const until = `<span class="ev-label">종료</span> ${chipField(`<input type="date" data-field="repeatUntil" data-event-id="${ev.id}" value="${ev.repeatUntil || ''}" required>`)}`;
    if (ev.repeat === 'weekly') {
      const options = WEEKDAY_LABELS.map((label, i) => `<option value="${i}"${Number(ev.weekday) === i ? ' selected' : ''}>${label}</option>`).join('');
      return `${chipField(`<select data-field="weekday" data-event-id="${ev.id}">${options}</select>`)} <span class="ev-label">시작</span> ${dateInput} ${until}`;
    }
    if (ev.repeat === 'biweekly') {
      const day = ev.date ? WEEKDAY_LABELS[Placement.weekdayOf(ev.date)] : '';
      return `<span class="ev-label">시작</span> ${dateInput} <span class="repeat-note">격주 ${day}요일</span> ${until}`;
    }
    if (ev.repeat === 'monthly') {
      const dom = ev.date ? Number(ev.date.slice(8)) : '';
      return `<span class="ev-label">시작</span> ${dateInput} <span class="repeat-note">매월 ${dom}일${dom > 28 ? ' (없는 달은 말일)' : ''}</span> ${until}`;
    }
    return dateInput;
  }

  // 뺀 날 목록과 되돌리기 (SPEC에는 없는 실수 복구용)
  function skippedDatesHtml(ev) {
    if (!ev.skipDates || ev.skipDates.length === 0) return '';
    const items = ev.skipDates.map(d => `<span class="skip-item">${d.slice(5).replace('-', '/')} <button type="button" class="sbtn sbtn-sm" data-action="unskip-event-day" data-event-id="${ev.id}" data-date="${d}">되돌리기</button></span>`).join('');
    return `<div class="skipped-dates"><span class="ev-label">뺀 날</span>${items}</div>`;
  }

  // 카드 머리에 보이는 요약: 언제 · 몇 시 · 부하
  function eventSummary(ev) {
    let when;
    if (ev.repeat === 'weekly') when = `매주 ${WEEKDAY_LABELS[Number(ev.weekday)] || ''}`;
    else if (ev.repeat === 'biweekly') when = `격주 ${ev.date ? WEEKDAY_LABELS[Placement.weekdayOf(ev.date)] : ''}`;
    else if (ev.repeat === 'monthly') when = `매월 ${ev.date ? Number(ev.date.slice(8)) : ''}일`;
    else when = ev.date || '';
    return `${when} · ${ev.start}~${ev.end} · 부하 ${ev.load}`;
  }

  // 일정 카드: 할 일 카드와 같은 구조와 서식(머리 전체를 누르면 아코디언으로 펼침). 펼친 카드만 본문을 그린다
  function eventBodyHtml(ev) {
    const repeatSelect = `<select data-field="repeat" data-event-id="${ev.id}">
      <option value="none"${ev.repeat === 'none' ? ' selected' : ''}>반복 없음</option>
      ${['weekly', 'biweekly', 'monthly'].map(r => `<option value="${r}"${ev.repeat === r ? ' selected' : ''}>${REPEAT_LABELS[r]}</option>`).join('')}
    </select>`;
    return `
      <div class="goal-edit-row">
        ${textField(`data-field="title" data-event-id="${ev.id}" value="${escapeAttr(ev.title)}" placeholder="일정 제목"`, 'goal-title-field')}
        ${chipField(repeatSelect)}
      </div>
      <div class="ev-fields">${eventRepeatFieldsHtml(ev)}</div>
      <div class="ev-fields">
        ${chipField(`<input type="time" data-field="start" data-event-id="${ev.id}" value="${ev.start}">`)}
        <span class="ev-label">~</span>
        ${chipField(`<input type="time" data-field="end" data-event-id="${ev.id}" value="${ev.end}">`)}
        ${loadPickerHtml(ev.id, ev.load)}
      </div>
      ${skippedDatesHtml(ev)}`;
  }

  const expandedEvents = new Set();

  function eventRowHtml(ev) {
    const expanded = expandedEvents.has(ev.id);
    return `
      <div class="goal-item">
      <div class="goal-card${expanded ? ' expanded' : ''}" data-event-id="${ev.id}">
        <div class="goal-header" data-action="toggle-event" data-event-id="${ev.id}" aria-expanded="${expanded}">
          <div class="goal-header-info">
            <span class="goal-title">${escapeHtml(ev.title)}</span>
            <span class="goal-deadline">${eventSummary(ev)}</span>
            ${CHEV_DOWN.replace('class="chev"', 'class="chev goal-chev"')}
          </div>
          <div class="goal-actions">
            <button type="button" class="sbtn sbtn-sm sbtn-danger" data-action="delete-event" data-event-id="${ev.id}">삭제</button>
          </div>
        </div>
        <div class="goal-acc">
          <div class="goal-body"><div class="goal-body-inner">${expanded ? eventBodyHtml(ev) : ''}</div></div>
        </div>
      </div>
      </div>`;
  }

  // 팝업 왼쪽 견출지 탭: 'current'(현재 일정) | 'over'(지난 일정) | 'prefs'(전체 설정)
  let settingsTab = 'current';
  const settingsPanes = { events: document.getElementById('settings-pane-events'), prefs: document.getElementById('settings-pane-prefs') };
  const eventAddWrap = document.getElementById('event-add-wrap'); // 일정 입력줄(고정 머리 안). 전체 설정 탭에서는 숨긴다

  function renderEvents() {
    const sorted = [...state.events].sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)));
    const today = todayStr();
    const overEvents = sorted.filter(ev => Placement.isEventOver(ev, today));
    const currentEvents = sorted.filter(ev => !Placement.isEventOver(ev, today));
    const labels = { current: `현재 일정 (${currentEvents.length})`, over: `지난 일정 (${overEvents.length})`, prefs: '전체 설정' };
    document.querySelectorAll('#settings-tabs button').forEach(b => {
      b.textContent = labels[b.dataset.tab];
      b.classList.toggle('active', b.dataset.tab === settingsTab);
    });
    const shown = settingsTab === 'over' ? overEvents : currentEvents;
    const empty = settingsTab === 'over'
      ? '지난 일정이 없습니다.'
      : (state.events.length ? '현재 일정이 없습니다.' : '아직 일정이 없습니다.');
    eventList.innerHTML = shown.length
      ? shown.map(eventRowHtml).join('')
      : `<div class="empty-hint">${empty}</div>`;
  }

  function showSettingsTab(key) {
    settingsTab = key;
    settingsPanes.events.hidden = key === 'prefs';
    eventAddWrap.hidden = key === 'prefs';
    settingsPanes.prefs.hidden = key !== 'prefs';
    renderEvents(); // 탭 글자·선택 표시와 일정 목록을 다시 그린다
  }

  document.getElementById('settings-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn || btn.dataset.tab === settingsTab) return;
    const order = ['current', 'over', 'prefs'];
    const dir = order.indexOf(btn.dataset.tab) > order.indexOf(settingsTab) ? 'next' : 'prev'; // 아래쪽 탭이면 지금 페이지가 넘어가고, 위쪽 탭이면 새 페이지가 덮는다
    pageTurn(document.getElementById('modal-settings'), () => showSettingsTab(btn.dataset.tab), dir);
  });

  function renderNewEventLoadPicker() {
    document.getElementById('new-event-load-picker').innerHTML = loadPickerHtml('new-event', newEventDraft.load);
  }

  // 날짜 칸은 항상 보인다. 반복 일정에서는 시작 날짜이고 기본값은 오늘이다 (그 이전에는 일정이 생기지 않는다)
  function syncNewEventRepeatFields() {
    const repeat = document.getElementById('new-event-repeat').value;
    const dateInput = document.getElementById('new-event-date');
    document.getElementById('new-event-date-label').textContent = repeat === 'none' ? '날짜' : '시작 날짜';
    document.getElementById('new-event-weekday-wrap').style.display = repeat === 'weekly' ? '' : 'none';
    document.getElementById('new-event-repeat-until-wrap').style.display = repeat === 'none' ? 'none' : '';
    if (!dateInput.value) dateInput.value = todayStr();
    if (repeat === 'weekly' && dateInput.value) document.getElementById('new-event-weekday').value = Placement.weekdayOf(dateInput.value);
  }

  document.getElementById('new-event-date').addEventListener('change', syncNewEventRepeatFields);
  document.getElementById('new-event-repeat').addEventListener('change', syncNewEventRepeatFields);
  syncNewEventRepeatFields();
  renderNewEventLoadPicker();

  document.getElementById('new-event-load-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="select-load"]');
    if (!btn) return;
    newEventDraft.load = Number(btn.dataset.load);
    renderNewEventLoadPicker();
  });

  document.getElementById('add-event-btn').addEventListener('click', () => {
    const title = document.getElementById('new-event-title').value.trim();
    const repeat = document.getElementById('new-event-repeat').value;
    const start = document.getElementById('new-event-start').value;
    const end = document.getElementById('new-event-end').value;
    if (!title || !start || !end) return;
    if (start >= end) { alert('시작 시각은 종료 시각보다 빨라야 합니다.'); return; }

    const date = document.getElementById('new-event-date').value;
    if (!date) return;
    const ev = { id: uid('event'), title, load: newEventDraft.load, start, end, repeat, date };
    if (repeat === 'weekly') ev.weekday = Number(document.getElementById('new-event-weekday').value);
    if (repeat !== 'none') {
      const repeatUntil = document.getElementById('new-event-repeat-until').value;
      if (repeatUntil) ev.repeatUntil = repeatUntil;
    }

    state.events.push(ev);
    saveState();

    document.getElementById('new-event-title').value = '';
    document.getElementById('new-event-date').value = todayStr();
    document.getElementById('new-event-repeat-until').value = '';
    syncNewEventRepeatFields();
    newEventDraft.load = 3;
    renderNewEventLoadPicker();
    renderEvents();
  });

  eventList.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    if (target.dataset.action === 'toggle-event') { // 머리 전체를 누르면 펼침/접힘. 한 번에 하나만 펼치고, 펼칠 때 본문을 그린다
      const id = target.dataset.eventId;
      const card = target.closest('.goal-card');
      if (expandedEvents.has(id)) {
        expandedEvents.delete(id);
        collapseGoalCard(card);
      } else {
        eventList.querySelectorAll('.goal-card.expanded').forEach(collapseGoalCard);
        expandedEvents.clear();
        expandedEvents.add(id);
        expandGoalCard(card, eventBodyHtml(state.events.find(x => x.id === id)));
      }
      return;
    }

    if (target.dataset.action === 'delete-event') {
      if (!confirm('이 일정을 삭제할까요?')) return;
      state.events = state.events.filter(ev => ev.id !== target.dataset.eventId);
      saveState();
      renderEvents();
      return;
    }

    if (target.dataset.action === 'unskip-event-day') {
      const ev = state.events.find(x => x.id === target.dataset.eventId);
      if (!ev || !ev.skipDates) return;
      ev.skipDates = ev.skipDates.filter(d => d !== target.dataset.date);
      if (ev.skipDates.length === 0) delete ev.skipDates;
      saveState();
      renderEvents();
      renderCarpet();
      return;
    }

    if (target.dataset.action === 'select-load') {
      const ev = state.events.find(ev => ev.id === target.dataset.loadKey);
      if (ev) {
        ev.load = Number(target.dataset.load);
        saveState();
        renderEvents();
      }
      return;
    }
  });

  eventList.addEventListener('change', (e) => {
    const field = e.target.dataset.field;
    const eventId = e.target.dataset.eventId;
    if (!field || !eventId) return;
    const ev = state.events.find(ev => ev.id === eventId);
    if (!ev) return;

    if (field === 'title') {
      const v = e.target.value.trim();
      ev.title = v || ev.title;
    } else if (field === 'repeat') {
      const prev = ev.repeat;
      ev.repeat = e.target.value;
      if (ev.repeat === 'none') {
        delete ev.weekday;
        delete ev.repeatUntil;
        delete ev.skipDates;
        if (!ev.date) ev.date = todayStr();
      } else if (ev.repeat === 'weekly') {
        if (ev.weekday === undefined) ev.weekday = Placement.weekdayOf(ev.date || todayStr());
        if (!ev.date) ev.date = todayStr();
      } else {
        // 격주·매월은 시작 날짜가 기준이다. 매주였다면 기존 요일에 맞춰 시작 날짜 이후 첫 그 요일로 옮긴다
        if (prev === 'weekly') ev.date = Placement.nextWeekday(ev.date || todayStr(), ev.weekday);
        else if (!ev.date) ev.date = todayStr();
        delete ev.weekday;
      }
    } else if (field === 'weekday') {
      ev.weekday = Number(e.target.value);
    } else if (field === 'date') {
      if (e.target.value) ev.date = e.target.value;
      else if (ev.repeat === 'weekly') delete ev.date; // 매주만 시작 날짜 없이 둘 수 있다 (옛 데이터와 같음)
      else { renderEvents(); return; }
    } else if (field === 'repeatUntil') {
      if (e.target.value) ev.repeatUntil = e.target.value; else delete ev.repeatUntil;
    } else if (field === 'start') {
      if (e.target.value >= ev.end) { alert('시작 시각은 종료 시각보다 빨라야 합니다.'); renderEvents(); return; }
      ev.start = e.target.value;
    } else if (field === 'end') {
      if (ev.start >= e.target.value) { alert('시작 시각은 종료 시각보다 빨라야 합니다.'); renderEvents(); return; }
      ev.end = e.target.value;
    }
    saveState();
    renderEvents();
  });

  renderEvents();

  function bindSettingField(id, key, transformIn, transformOut) {
    const el = document.getElementById(id);
    const displayValue = () => transformOut ? transformOut(state.settings[key]) : state.settings[key];
    el.value = displayValue();
    el.addEventListener('change', () => {
      const raw = el.value.trim();
      const v = Number(raw);
      const min = el.min !== '' ? Number(el.min) : -Infinity;
      const max = el.max !== '' ? Number(el.max) : Infinity;
      if (raw === '' || Number.isNaN(v) || v < min || v > max) {
        el.value = displayValue();
        return;
      }
      state.settings[key] = transformIn ? transformIn(v) : v;
      saveState();
    });
  }

  bindSettingField('setting-capacity', 'capacity');
  bindSettingField('setting-safe-ratio', 'safeRatio', v => v / 100, v => Math.round(v * 100));
  bindSettingField('setting-sleep-hours', 'sleepHours');
  bindSettingField('setting-life-hours', 'lifeHours');

  // ---- 데이터 내보내기/가져오기 (JSON 파일) ----

  const dataMessage = document.getElementById('data-message');
  const importFile = document.getElementById('import-file');

  function setDataMessage(text, isError) {
    dataMessage.textContent = text;
    dataMessage.style.color = isError ? '#b8203a' : ''; // 평소 색은 CSS(.pref-status)
  }

  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([Data.serializeExport(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redcarpet-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDataMessage(`${a.download} 로 내보냈습니다.`, false);
  });

  document.getElementById('import-btn').addEventListener('click', () => importFile.click());

  // 초기화: 내 데이터(할 일·단계·일정·설정)를 모두 지우고 처음 상태로 돌린다. 저장 공간을 비우고 페이지를 다시 불러온다.
  // 데모를 보는 동안은 내 데이터가 아니라 데모 데이터를 보고 있으므로 이 버튼을 막는다(데모 데이터는 테스트 데모 카드의 '데이터 초기화')
  const resetBtn = document.getElementById('reset-btn');
  if (demoOn) {
    resetBtn.disabled = true;
    setDataMessage('데모 모드를 보는 동안에는 내 데이터를 지울 수 없습니다. 데모를 끈 뒤에 사용하세요.', false);
  }
  resetBtn.addEventListener('click', () => {
    if (demoOn) return;
    if (!confirm('내 할 일, 단계, 일정, 설정이 모두 지워지고 처음 상태로 돌아갑니다. 되돌릴 수 없습니다.\n먼저 내보내기로 백업해 두는 것을 권합니다.\n\n정말 모두 지울까요?')) return;
    localStorage.removeItem(PERSONAL_STORAGE_KEY);
    location.reload();
  });

  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    importFile.value = '';
    if (!file) return;
    const result = Data.parseImport(await file.text());
    if (!result.ok) { setDataMessage(`가져오지 못했습니다: ${result.error}`, true); return; }
    if (!confirm('현재 데이터가 모두 사라지고 파일의 내용으로 바뀝니다. 가져올까요?')) return;

    state.goals = result.state.goals;
    state.steps = result.state.steps;
    state.events = result.state.events;
    state.settings = result.state.settings;
    // 앱을 연 직후와 같게: 깔린 날이 지난 미완료 단계는 밀린 것으로 처리한다
    state.steps = Placement.autoPush({ steps: state.steps, today: todayStr() }).steps;
    saveState();

    document.getElementById('setting-capacity').value = state.settings.capacity;
    document.getElementById('setting-safe-ratio').value = Math.round(state.settings.safeRatio * 100);
    document.getElementById('setting-sleep-hours').value = state.settings.sleepHours;
    document.getElementById('setting-life-hours').value = state.settings.lifeHours;
    renderPlaceModeOptions();
    renderGoals();
    renderEvents();
    renderCarpet();
    setDataMessage(`가져왔습니다: 할 일 ${state.goals.length}개, 단계 ${state.steps.length}개, 일정 ${state.events.length}개`, false);
  });

// ---- 테스트 데모 켜기/끄기: 저장 공간을 바꾸므로 페이지를 다시 불러와 처음부터 읽는다 ----

const demoToggleBtn = document.getElementById('demo-toggle-btn');
demoToggleBtn.textContent = demoOn ? '데모 모드 끄기 (내 데이터로 돌아가기)' : '데모 모드 켜기';

// 데모 데이터 초기화: 데모를 보는 동안에만 보인다. 어지럽혀 둔 데모 데이터를 버리고 예시 처음 상태로 되돌린다. 내 데이터는 건드리지 않는다
const demoResetBtn = document.getElementById('demo-reset-btn');
demoResetBtn.hidden = !demoOn;
demoResetBtn.addEventListener('click', () => {
  if (!demoOn) return;
  if (!confirm('데모 데이터를 처음 예시 상태로 되돌립니다. 데모에서 고친 내용은 사라지고, 내 데이터는 그대로입니다. 페이지를 다시 불러옵니다.')) return;
  localStorage.removeItem(DEMO_STORAGE_KEY); // 저장 공간이 비면 다음에 읽을 때 예시 데이터에서 새로 시작한다
  location.reload();
});

demoToggleBtn.addEventListener('click', () => {
  if (demoOn) {
    localStorage.removeItem(DEMO_FLAG_KEY);
    localStorage.removeItem(DEMO_STORAGE_KEY); // 데모에서 고친 내용은 버린다
  } else {
    if (!confirm('데모 모드를 켭니다. 내 데이터는 그대로 보관됩니다. 페이지를 다시 불러옵니다.')) return;
    localStorage.removeItem(DEMO_STORAGE_KEY); // 켤 때마다 예시 데이터에서 새로 시작한다
    localStorage.setItem(DEMO_FLAG_KEY, '1');
  }
  location.reload();
});
