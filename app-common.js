// 공통: 헤더 아랫단 그림, 상태·저장, 날짜·문자열 도우미, 깔기 방식 토글, 팝업과 헤더 버튼. 다른 app-*.js보다 먼저 읽는다

  // 헤더 아랫단 그림(천 끝 + 털실 점선)을 CSS 값(--stitch-*, --edge-*, --header-bg)으로 만들어 --edge-tile에 넣는다.
  // 조각을 반복하면 이음새에 틈이 비쳐서, 화면 폭만큼 한 장으로 그린다. 창 크기가 바뀌면 다시 그린다
  (function () {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const num = name => parseFloat(cs.getPropertyValue(name));
    const r = n => +n.toFixed(2);
    function draw() {
      const bg = cs.getPropertyValue('--header-bg').trim();
      const yarn = cs.getPropertyValue('--stitch-color').trim();
      const wave = num('--edge-wave'), amp = num('--edge-amp');
      const dash = num('--stitch-dash'), gap = num('--stitch-gap'), width = num('--stitch-width');
      const sy = width / 2 + amp + 1, ey = sy + num('--edge-offset'), h = ey + amp + 1;
      const w = Math.ceil((root.clientWidth + 32) / wave) * wave; // 헤더 폭(좌우로 16px씩 삐져나감)을 한 주기의 배수로 올림
      // 오른쪽 끝에서 왼쪽 끝으로 한 주기씩: 아래로 불룩 → 위로 불룩
      const curve = y => {
        let d = '';
        for (let x = w - wave; x >= 0; x -= wave) d += `Q${r(x + wave * 0.75)} ${r(y + 2 * amp)} ${r(x + wave / 2)} ${r(y)}Q${r(x + wave * 0.25)} ${r(y - 2 * amp)} ${x} ${r(y)}`;
        return d;
      };
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${r(h)}' viewBox='0 0 ${w} ${r(h)}'>`
        + `<path d='M0 0H${w}V${r(ey)}${curve(ey)}Z' fill='${bg}'/>`
        + `<path d='M${w} ${r(sy)}${curve(sy)}' fill='none' stroke='${yarn}' stroke-width='${width}' stroke-linecap='round' stroke-dasharray='${dash} ${gap}'/>`
        + `</svg>`;
      root.style.setProperty('--edge-tile', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    }
    draw();
    let queued = false;
    window.addEventListener('resize', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; draw(); });
    });
  })();

  const STORAGE_KEY = 'radcarpet-data';

  function defaultState() {
    return {
      version: 1,
      goals: [],
      steps: [],
      events: [],
      settings: {
        capacity: 10,
        safeRatio: 0.8,
        sleepHours: 8,
        lifeHours: 4,
        placeMode: 'fill',
      },
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.version) return defaultState();
      return parsed;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = loadState();

  // 이전 버전이 localStorage에 남긴 API 키는 앱을 열 때 지운다 (SPEC 9장: 키는 저장하지 않는다)
  if (state.settings && 'apiKey' in state.settings) {
    delete state.settings.apiKey;
    saveState();
  }

  // 앱을 열었을 때: 깔린 날이 지난 미완료 단계는 밀린 것으로 처리한다 (SPEC 5장 밀림)
  (function applyAutoPush() {
    const r = Placement.autoPush({ steps: state.steps, today: todayStr() });
    if (r.pushedIds.length === 0) return;
    state.steps = r.steps;
    saveState();
  })();

  const PLACE_MODE_LABELS = {
    fill: '깔기 방식: 채우기 우선',
    even: '깔기 방식: 고르게',
  };

  const placeModeToggle = document.getElementById('place-mode-toggle');

  function renderPlaceModeToggle() {
    placeModeToggle.textContent = PLACE_MODE_LABELS[state.settings.placeMode];
  }

  placeModeToggle.addEventListener('click', () => {
    state.settings.placeMode = state.settings.placeMode === 'fill' ? 'even' : 'fill';
    saveState();
    renderPlaceModeToggle();
    renderCarpet();
  });

  renderPlaceModeToggle();

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const ALL_LOADS = [1, 2, 3, 4, 5];
  const EXTRA_LOADS = [2, 4];

  function loadPickerHtml(key, selected) {
    const buttons = ALL_LOADS
      .map(l => {
        const extraClass = EXTRA_LOADS.includes(l) ? ' load-extra' : '';
        return `<button type="button" class="load-btn${extraClass}${l === selected ? ' selected' : ''}" data-action="select-load" data-load-key="${key}" data-load="${l}">${l}</button>`;
      })
      .join('');
    return `<div class="load-picker" data-load-key="${key}">${buttons}</div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function renderTabs(barId, current, tabs) {
    document.querySelectorAll(`#${barId} button`).forEach(btn => {
      const t = tabs.find(x => x.key === btn.dataset.tab);
      btn.textContent = `${t.label} (${t.count})`;
      btn.classList.toggle('active', btn.dataset.tab === current);
    });
  }

  // 팝업은 헤더 위에 뜬다. 닫는 길: 바깥 배경, 왼쪽 위 x, Esc
  const modals = { goals: document.getElementById('modal-goals'), settings: document.getElementById('modal-settings') };

  // 열고 닫는 연출: 아래쪽 버튼이 그 자리에서 커지며 180도 뒤집혀(앞면 = 버튼, 뒷면 = 팝업) 팝업이 된다. 닫을 때는 거꾸로 줄어들며 버튼 자리에 맞춰 들어간다.
  // 열려 있는 동안 진짜 버튼은 숨기고, 버튼 복제본(앞면)이 대신 움직인다. 모양 값은 style.css 맨 위 --modal-*
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let modalBusy = false; // 연출이 도는 동안은 열기·닫기를 받지 않는다

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const cssMs = name => parseFloat(cssVar(name));

  // 버튼의 기울어진 각도(도)
  function tiltDeg(el) {
    const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const [a, b] = m[1].split(',').map(Number);
    return Math.atan2(b, a) * 180 / Math.PI;
  }

  // reverse가 true면 닫는 연출(같은 키프레임을 거꾸로 돌린다). 끝나면 done을 부른다
  function playModal(modal, btn, reverse, done) {
    if (reduceMotion.matches) { done(); return; }
    const panel = modal.querySelector('.modal-panel');
    const scroll = modal.querySelector('.modal-scroll');
    const b = btn.getBoundingClientRect(); // 기울어진 버튼의 바깥 사각형. 중심은 그대로다
    const p = panel.getBoundingClientRect();
    const bw = btn.offsetWidth, bh = btn.offsetHeight;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2; // 버튼 중심
    const px = p.left + p.width / 2, py = p.top + p.height / 2; // 팝업 중심
    const persp = cssVar('--modal-perspective');
    const half = parseFloat(cssVar('--modal-flip-deg')) / 2; // 앞면이 이만큼 돌아 옆면이 되고, 거기서 뒷면이 이어받는다
    const delay = cssMs('--modal-content-delay');
    const dir = reverse ? 'reverse' : 'normal';
    const timing = { duration: cssMs('--modal-anim-ms'), easing: cssVar('--modal-ease'), direction: dir, fill: 'both' };

    // 앞면: 버튼 복제본. 크기를 확대하지 않고 실제 가로·세로를 바꿔서 글자가 찌그러지지 않는다
    const front = btn.cloneNode(true);
    front.removeAttribute('data-screen');
    front.setAttribute('aria-hidden', 'true');
    front.tabIndex = -1;
    front.classList.add('flip-front');
    modal.appendChild(front);

    modal.classList.add('flipping');
    const flipOut = `perspective(${persp}) rotateY(${half}deg)`;
    const flipIn = `perspective(${persp}) rotateY(${-half}deg)`;
    const flat = `perspective(${persp}) rotateY(0deg)`;
    const anims = [
      modal.animate([{ opacity: 0 }, { opacity: 1 }], { duration: cssMs('--modal-fade-ms'), easing: 'ease', direction: dir, fill: 'both' }),
      // 앞면(버튼): 버튼 자리에서 팝업 자리로 커지며 옆면까지 돌고 사라진다
      front.animate([
        { left: `${bx - bw / 2}px`, top: `${by - bh / 2}px`, width: `${bw}px`, height: `${bh}px`, rotate: `${tiltDeg(btn)}deg` },
        { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, height: `${p.height}px`, rotate: '0deg' },
      ], timing),
      front.animate([
        { transform: flat, opacity: 1, offset: 0 },
        { transform: flipOut, opacity: 1, offset: 0.5 },
        { transform: flipOut, opacity: 0, offset: 0.5001 },
        { transform: flipOut, opacity: 0, offset: 1 },
      ], timing),
      // 뒷면(팝업): 옆면에서 이어받아 펴지며 자리를 잡는다
      panel.animate([
        { width: `${bw}px`, height: `${bh}px`, translate: `${bx - px}px ${by - py}px`, rotate: `${tiltDeg(btn)}deg` },
        { width: `${p.width}px`, height: `${p.height}px`, translate: '0px 0px', rotate: '0deg' },
      ], timing),
      panel.animate([
        { transform: flipIn, opacity: 0, offset: 0 },
        { transform: flipIn, opacity: 0, offset: 0.4999 },
        { transform: flipIn, opacity: 1, offset: 0.5 },
        { transform: flat, opacity: 1, offset: 1 },
      ], timing),
      ...[...scroll.children].map(el => el.animate([{ opacity: 0 }, { opacity: 0, offset: delay }, { opacity: 1 }], timing)),
    ];
    modalBusy = true;
    Promise.all(anims.map(a => a.finished)).then(() => {
      modalBusy = false;
      anims.forEach(a => a.cancel()); // fill을 걷어 평소 상태로 돌린다
      front.remove();
      modal.classList.remove('flipping');
      done();
    });
  }

  function openModal(target, btn) {
    if (modalBusy) return;
    if (target === 'goals') renderGoals();
    if (target === 'settings') { renderEvents(); showSettingsTab('events'); }
    document.body.style.overflow = 'hidden';
    modals[target].classList.add('open');
    playModal(modals[target], btn, false, () => {});
    btn.classList.add('dock-away'); // 버튼은 팝업이 됐으니 그 자리에서 빠진다
  }

  function closeModals() {
    if (modalBusy) return;
    const key = Object.keys(modals).find(k => modals[k].classList.contains('open'));
    if (!key) { document.body.style.overflow = ''; return; }
    const btn = document.querySelector(`[data-screen="${key}"]`);
    playModal(modals[key], btn, true, () => {
      modals[key].classList.remove('open');
      btn.classList.remove('dock-away'); // 제자리에 챡 맞춰 들어간 뒤 진짜 버튼이 돌아온다
      document.body.style.overflow = '';
      renderCarpet();
    });
  }

  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (modals[target]) openModal(target, btn);
      else closeModals();
    });
  });

  // 일정과 설정 팝업 안의 탭. 팝업을 열 때는 항상 일정부터 보인다
  const settingsPanes = { events: document.getElementById('settings-pane-events'), prefs: document.getElementById('settings-pane-prefs') };

  function showSettingsTab(key) {
    Object.entries(settingsPanes).forEach(([k, pane]) => { pane.hidden = k !== key; });
    document.querySelectorAll('#settings-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  }

  document.getElementById('settings-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) showSettingsTab(btn.dataset.tab);
  });

  Object.values(modals).forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.classList.contains('modal-close')) closeModals();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });
