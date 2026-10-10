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

  // 데모 모드: 켜면 내 데이터(radcarpet-data)는 건드리지 않고 별도 저장 공간(radcarpet-demo-data)의 예시 데이터를 보여 준다.
  // 켜고 끄는 일은 설정 화면에서 하고, 바꾼 뒤에는 페이지를 다시 불러온다
  const DEMO_FLAG_KEY = 'radcarpet-demo-on';
  const DEMO_STORAGE_KEY = 'radcarpet-demo-data';
  const demoOn = localStorage.getItem(DEMO_FLAG_KEY) === '1' && typeof DEMO_DATA !== 'undefined';
  const STORAGE_KEY = demoOn ? DEMO_STORAGE_KEY : 'radcarpet-data';

  function defaultState() {
    return {
      version: 1,
      goals: [],
      steps: [],
      events: [],
      settings: {
        capacity: 15,
        safeRatio: 0.8,
        sleepHours: 8,
        lifeHours: 4,
        placeMode: 'fill',
      },
    };
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoOn ? JSON.parse(JSON.stringify(DEMO_DATA)) : defaultState(); // 데모는 처음 켤 때 예시 데이터에서 시작한다
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

  if (demoOn) { // 지금 보는 것이 내 데이터가 아님을 늘 알린다
    const badge = document.createElement('div');
    badge.className = 'demo-badge';
    badge.textContent = '데모 모드 · 내 데이터 아님';
    document.body.appendChild(badge);
  }

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

  // 열고 닫는 연출: 아래쪽 버튼이 그 자리에서 180도 뒤집혀(앞면 = 버튼, 뒷면 = 팝업) 팝업이 된다. 닫을 때는 거꾸로 줄어들며 버튼 자리에 맞춰 들어간다.
  // 팝업은 늘 최종 크기로 두고 transform(이동·기울기·확대·회전)만 움직인다. 크기를 실제로 바꾸면 줄바꿈이 다시 계산되기 때문이다.
  // 늘어나며 생기는 찌그러짐은 옆면(90도)일 때 가장 커서 거의 안 보이고, 그 순간 앞면(버튼 복제본)과 뒷면(팝업)이 서로 바뀐다.
  // 열 때: 복제본이 원본 버튼 위에 서서히 나타나 덮은 뒤 원본이 빠진다(시작 직후는 잠깐 가만히 둔다). 닫을 때: 원본이 먼저 켜지고 그 위의 복제본이 서서히 사라진다.
  // 모양 값은 style.css 맨 위 --modal-*
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
    const dx = (p.left + p.width / 2) - (b.left + b.width / 2); // 버튼 중심에서 팝업 중심까지
    const dy = (p.top + p.height / 2) - (b.top + b.height / 2);
    const tilt = tiltDeg(btn);
    const kx = p.width / bw, ky = p.height / bh; // 버튼을 팝업 크기로 늘리는 배율
    const persp = cssVar('--modal-perspective');
    const half = parseFloat(cssVar('--modal-flip-deg')) / 2; // 앞면이 이만큼 돌아 옆면이 되고, 거기서 뒷면이 이어받는다
    const delay = cssMs('--modal-content-delay');
    // 원본 버튼과 복제본이 서로 바뀌는 구간(시간 비율 0~1). 닫을 때는 도착한 뒤 가만히 있는 시간이 길어 보이지 않게 따로 짧게 둔다
    const swapStart = cssMs(reverse ? '--modal-swap-start-close' : '--modal-swap-start'), swap = cssMs(reverse ? '--modal-swap-close' : '--modal-swap');
    const ms = cssMs(reverse ? '--modal-anim-close-ms' : '--modal-anim-ms');
    const timing = { duration: ms, easing: cssVar(reverse ? '--modal-ease-close' : '--modal-ease'), fill: 'both' };
    const landEase = cssVar('--modal-ease-land'), settleEase = cssVar('--modal-ease-settle');
    const bounce = cssMs('--modal-bounce'), bounceAt = cssMs('--modal-bounce-at');
    const closeMid = cssMs('--modal-close-mid');
    // 닫을 때는 키프레임을 직접 뒤집어 앞으로 재생한다. direction: 'reverse'로는 구간마다 다른 곡선을 줄 수 없다.
    // land 표시가 붙은 키프레임에서 시작하는 구간(복제본이 버튼 자리로 내려앉는 마지막 이동)에만 닫을 때 landEase를 건다
    const frames = list => {
      const n = list.length;
      const f = list.map((k, i) => ({ ...k, offset: k.offset ?? i / (n - 1) }));
      // 닫을 때는 팝업이 줄어드는 앞 구간과 버튼이 내려앉는 뒤 구간의 이음매(0.5)를 closeMid로 옮겨, 뒤 구간이 더 긴 시간을 쓰게 한다.
      // 두 구간이 같은 길이면 뒤 구간이 같은 거리를 더 짧게 가서 이음매에서 속도가 튄다
      const at = o => (o <= 0.5 ? o * closeMid / 0.5 : closeMid + (o - 0.5) * (1 - closeMid) / 0.5);
      const out = reverse ? f.map(k => ({ ...k, offset: at(1 - k.offset) })).reverse() : f;
      return out.map(({ land, settle, ...k }) => (reverse && land ? { ...k, easing: landEase } : reverse && settle ? { ...k, easing: settleEase } : k));
    };

    // 앞면: 버튼 복제본. 버튼 크기 그대로 두고 변환만 준다
    const front = btn.cloneNode(true);
    front.removeAttribute('data-screen');
    front.setAttribute('aria-hidden', 'true');
    front.tabIndex = -1;
    front.classList.add('flip-front');
    front.style.cssText = `left:${b.left + b.width / 2 - bw / 2}px; top:${b.top + b.height / 2 - bh / 2}px; width:${bw}px; height:${bh}px;`;
    modal.appendChild(front);
    modal.classList.add('flipping');

    // 변환 모양: 이동 → 기울기 → 확대 → 세로축 회전. 모든 키프레임이 같은 순서라야 부드럽게 이어진다.
    // 중간(0.5) 값은 양 끝의 평균이라 앞뒤 구간이 한 줄로 이어진다
    const tf = (x, y, rot, sx, sy, ry) => `perspective(${persp}) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sx}, ${sy}) rotateY(${ry}deg)`;
    const bg = getComputedStyle(modal).backgroundColor;
    const blur = cssVar('--modal-blur');
    const anims = [
      // 뒤 화면의 어두움과 흐림만 페이드한다. modal 전체의 opacity를 건드리면 팝업까지 투명해진다
      modal.animate(frames([
        { backgroundColor: bg.replace(/[\d.]+\)$/, '0)'), backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)' },
        { backgroundColor: bg, backdropFilter: `blur(${blur})`, webkitBackdropFilter: `blur(${blur})` },
      ]), { duration: ms * cssMs('--modal-fade-ratio'), easing: 'ease-in-out', fill: 'both' }),
      // 앞면(버튼 복제본): 서서히 나타나 원본을 덮고, 팝업 쪽으로 이동하며 늘어나 옆면까지 돈 뒤 사라진다
      front.animate(frames([
        { transform: tf(0, 0, tilt, 1, 1, 0), opacity: 0, offset: 0 },
        { transform: tf(0, 0, tilt, 1, 1, 0), opacity: 0, offset: swapStart },
        { transform: tf(0, 0, tilt, 1, 1, 0), opacity: 1, offset: swap }, // 교차하는 동안은 원본 위에 가만히 있어서 글자가 두 겹으로 보이지 않는다
        // 닫을 때만: 버튼 자리를 bounce만큼 지나쳐 눌렸다가(여기까지 landEase) 부드럽게 제자리로 올라온다(settle 구간 settleEase).
        // 지나친 지점 = 도착 자리 + bounce × (도착 자리 − 중간 지점)
        ...(reverse && bounce > 0 ? [{ transform: tf(-bounce * dx / 2, -bounce * dy / 2, tilt * (1 + bounce / 2), 1 - bounce * (kx - 1) / 2, 1 - bounce * (ky - 1) / 2, -bounce * half), opacity: 1, offset: swap + (0.5 - swap) * (1 - bounceAt), settle: true }] : []),
        { transform: tf(dx / 2, dy / 2, tilt / 2, (1 + kx) / 2, (1 + ky) / 2, half), opacity: 1, offset: 0.5, land: true },
        { transform: tf(dx / 2, dy / 2, tilt / 2, (1 + kx) / 2, (1 + ky) / 2, half), opacity: 0, offset: 0.5001 },
        { transform: tf(dx, dy, 0, kx, ky, half), opacity: 0, offset: 1 },
      ]), timing),
      // 원본 버튼: 복제본이 덮은 뒤 빠진다 (닫을 때는 거꾸로 먼저 켜진다)
      btn.animate(frames([{ opacity: 1, offset: 0 }, { opacity: 1, offset: swap }, { opacity: 0, offset: swap + 0.0001 }, { opacity: 0, offset: 1 }]), timing),
      // 뒷면(팝업): 옆면에서 이어받아 펴지며 자리를 잡는다
      panel.animate(frames([
        { transform: tf(-dx, -dy, tilt, 1 / kx, 1 / ky, -half), opacity: 0, offset: 0 },
        { transform: tf(-dx / 2, -dy / 2, tilt / 2, (1 + 1 / kx) / 2, (1 + 1 / ky) / 2, -half), opacity: 0, offset: 0.4999 },
        { transform: tf(-dx / 2, -dy / 2, tilt / 2, (1 + 1 / kx) / 2, (1 + 1 / ky) / 2, -half), opacity: 1, offset: 0.5 },
        { transform: tf(0, 0, 0, 1, 1, 0), opacity: 1, offset: 1 },
      ]), timing),
      ...[...scroll.children, ...panel.querySelectorAll('.index-tabs')].map(el => el.animate(frames([{ opacity: 0 }, { opacity: 0, offset: delay }, { opacity: 1 }]), timing)),
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

  // 견출지로 팝업 안의 페이지를 바꿀 때: 지금 페이지의 복제본을 위에 얹어 두고 진짜 내용은 바로 새 페이지로 바꾼 뒤,
  // 복제본을 아래에서 위로 말아 올려 새 페이지가 드러나게 한다. 말린 가장자리의 명암과 그림자는 --turn-* 값(style.css)으로 만든다.
  // 3D 변환 없이 clip-path와 transform만 쓴다(날아다니는 팝업의 그림자가 연출 중 사라지던 문제를 피하려고)
  function pageTurn(modal, change) {
    modal.querySelectorAll('.page-curl').forEach(el => el.remove()); // 진행 중이던 것은 즉시 끝낸다
    if (reduceMotion.matches || modalBusy || !modal.classList.contains('open')) { change(); return; }
    const panel = modal.querySelector('.modal-panel');
    const scroll = modal.querySelector('.modal-scroll');
    const h = scroll.clientHeight;
    const roll = cssMs('--turn-roll-h');

    const curl = document.createElement('div'); // 말려 올라가는 동안 덮어 둘 층
    curl.className = 'page-curl';
    const old = scroll.cloneNode(true); // 지금 페이지. 아이디가 겹치면 진짜 요소를 못 찾으니 걷어 낸다
    old.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    old.classList.add('page-curl-old');
    const edge = document.createElement('div'); // 말린 종이 두루마리
    edge.className = 'page-roll';
    curl.append(old, edge);
    panel.appendChild(curl); // 진짜 요소보다 뒤에 둬야 getElementById가 진짜를 먼저 찾는다
    old.scrollTop = scroll.scrollTop;

    change(); // 진짜 내용을 새 페이지로

    const timing = { duration: cssMs('--turn-ms'), easing: cssVar('--turn-ease'), fill: 'both' };
    const anims = [
      old.animate([{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: `inset(0px 0px ${h}px 0px)` }], timing),
      // 두루마리의 아랫면이 잘린 가장자리에 놓인다. 시작할 때는 서서히 나타난다
      edge.animate([
        { transform: `translateY(${h - roll}px)`, opacity: 0 },
        { transform: `translateY(${(h - roll) * 0.92}px)`, opacity: 1, offset: 0.08 },
        { transform: `translateY(${-roll}px)`, opacity: 1 },
      ], timing),
    ];
    Promise.all(anims.map(a => a.finished)).then(() => curl.remove()).catch(() => {});
  }

  function openModal(target, btn) {
    if (modalBusy) return;
    if (target === 'goals') renderGoals();
    if (target === 'settings') showSettingsTab('current'); // 열 때는 항상 현재 일정부터
    document.body.style.overflow = 'hidden';
    modals[target].classList.add('open');
    playModal(modals[target], btn, false, () => modals[target].classList.add('settled')); // 그림자는 자리 잡은 뒤에 나타난다
    btn.classList.add('dock-away'); // 버튼은 팝업이 됐으니 그 자리에서 빠진다
    btn.blur(); // 닫을 때 키보드 포커스 테두리가 버튼에 남지 않게
  }

  function closeModals() {
    if (modalBusy) return;
    const key = Object.keys(modals).find(k => modals[k].classList.contains('open'));
    if (!key) { document.body.style.overflow = ''; return; }
    const btn = document.querySelector(`[data-screen="${key}"]`);
    modals[key].classList.remove('settled'); // 움직임이 시작되자마자 그림자가 서서히 사라진다
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

  Object.values(modals).forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.classList.contains('modal-close')) closeModals();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });
