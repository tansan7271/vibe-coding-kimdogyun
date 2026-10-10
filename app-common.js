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
    badge.textContent = '데모 모드';
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

  // 깔기 방식: 일정과 설정 > 전체 설정의 두 버튼 중 고른 쪽이 눌린 모양(sbtn-accent)이다
  const placeModeOptions = document.getElementById('place-mode-options');

  function renderPlaceModeOptions() {
    placeModeOptions.querySelectorAll('[data-place-mode]').forEach(btn => {
      const on = btn.dataset.placeMode === state.settings.placeMode;
      btn.classList.toggle('sbtn-accent', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  placeModeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-place-mode]');
    if (!btn || btn.dataset.placeMode === state.settings.placeMode) return;
    state.settings.placeMode = btn.dataset.placeMode;
    saveState();
    renderPlaceModeOptions();
    renderCarpet();
  });

  renderPlaceModeOptions();

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

  function loadPickerHtml(key, selected) {
    const buttons = ALL_LOADS
      .map(l => {
        return `<button type="button" class="load-btn${l === selected ? ' selected' : ''}" data-action="select-load" data-load-key="${key}" data-load="${l}">${l}</button>`;
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

  // 견출지로 팝업 안의 페이지를 바꿀 때: 위쪽이 스프링으로 묶인 메모장의 페이지를 넘기는 효과.
  //  1) 페이지 전체가 위쪽 가장자리를 축으로 위로 젖혀진다 (90도를 넘으면 종이 뒷면이 보인다)
  //  2) 다 젖혀지면 팝업 뒤로 층이 바뀌고, 뒤에서 아래로 내려가며 팝업에 가려진다
  //  위로 젖히기와 뒤로 내려가기는 한 번도 멈추지 않는 하나의 곡선(0 → 360도)으로 이어진다. 구간마다 속도가 0으로 끝나면 맨 위에서 턱 걸린다
  // 'next'(지금보다 아래쪽 탭): 지금 페이지가 이 순서대로 넘어간다. 'prev'(위쪽 탭): 새 페이지가 이 순서를 거꾸로 해서 덮는다.
  // 3D 그래픽이 아니라 CSS 3D 변환(perspective + rotateX)으로 평평한 요소를 기울이는 것이다. 모양 값은 --turn-* (style.css).
  // 그림자는 filter·box-shadow 없이 그라디언트로만 그린다(날아다니는 팝업의 그림자가 연출 중 사라지던 문제를 피하려고)
  const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

  function pageTurn(modal, change, dir) {
    modal.querySelectorAll('.page-curl, .page-book').forEach(el => el.remove()); // 진행 중이던 것은 즉시 끝낸다
    if (reduceMotion.matches || modalBusy || !modal.classList.contains('open')) { change(); return; }
    const panel = modal.querySelector('.modal-panel');
    const scroll = modal.querySelector('.modal-scroll');
    const H = scroll.clientHeight;
    const cloneOf = () => { // 지금 화면의 복제본. 아이디는 지우지 않는다: #ai-panel 같은 아이디로 거는 CSS가 풀려 서식이 깨진다.
      // 복제본은 진짜 요소보다 문서 뒤쪽에 있어 getElementById는 늘 진짜를 먼저 찾는다
      const c = scroll.cloneNode(true);
      c.removeAttribute('id');
      c.classList.add('pc-page');
      c.scrollTop = scroll.scrollTop;
      return c;
    };
    const div = cls => { const d = document.createElement('div'); d.className = cls; return d; };

    // 넘어가는 페이지의 견출지는 그 페이지에 딸려 올라가고 내려간다. 탭 상태는 클릭 즉시 바뀌므로, 올라타는 탭은 복제본으로 따로 만들고 그 동안 진짜 탭은 숨긴다
    const tabBar = modal.querySelector('.index-tabs');
    const tabClone = btn => { // 진짜 탭 자리(팝업 기준)에 복제본을 놓는다. 앞면과 뒷면(글자 없음) 한 쌍
      const make = (isBack) => {
        const bar = div('index-tabs pc-tab-bar'); // 같은 CSS를 쓰려고 index-tabs 안에 둔다
        bar.style.top = `${tabBar.offsetTop + btn.offsetTop}px`;
        const b = btn.cloneNode(true);
        b.classList.add(isBack ? 'pc-tab-back' : 'pc-tab-front');
        if (isBack) b.textContent = '';
        bar.append(b);
        return b;
      };
      return { front: make(false), back: make(true) };
    };
    let tab = null, hiddenTab = null;
    if (dir === 'next') { // 지금 페이지의 탭(지금 선택된 탭)이 지금 페이지와 함께 올라간다
      const from = tabBar.querySelector('button.active');
      if (from) { tab = tabClone(from); hiddenTab = from; }
    }

    const oldPage = cloneOf(); // 바꾸기 전 모습
    change();                  // 진짜 내용을 새 페이지로
    const mover = dir === 'prev' ? cloneOf() : oldPage; // 넘어가는 쪽: next면 옛 페이지, prev면 새 페이지
    if (dir === 'prev') { // 새 페이지의 탭(새로 선택된 탭)이 새 페이지와 함께 뒤에서 올라와 앞에 안착한다
      const to = tabBar.querySelector('button.active');
      if (to) { tab = tabClone(to); hiddenTab = to; }
    }
    if (hiddenTab) hiddenTab.style.visibility = 'hidden';

    // curl: 팝업 내용 위에 깔리는 층(덮이기 전의 옛 페이지, 그림자). book: 위로 젖혀지는 페이지. 젖힌 뒤 book만 팝업 뒤로 보낸다
    const curl = div('page-curl');
    const cast = div('pc-cast');   // 페이지가 젖혀 올라가며 아래쪽에 드리우는 그림자
    const hasBand = modal.id === 'modal-settings'; // 일정과 설정의 붉은 접합부는 종이에 딸려 있어서 페이지와 함께 젖혀진다
    if (dir === 'prev') { curl.append(oldPage); if (hasBand) curl.append(div('pc-band')); } // 덮이기 전의 옛 페이지(와 그 접합부)
    curl.append(cast);
    const book = div('page-book');
    const lit = div('pc-lit');     // 기울어질수록 어두워지는 앞면
    const back = div('pc-back');   // 젖혀졌을 때 보이는 종이 뒷면
    book.append(mover);
    if (hasBand) book.append(div('pc-band'));
    book.append(lit, back);
    if (tab) for (const b of [tab.back, tab.front]) book.append(b.parentNode); // 탭은 페이지 오른쪽 바깥으로 튀어나와 있다
    panel.append(curl, book); // 진짜 요소보다 뒤에 둬야 getElementById가 진짜를 먼저 찾는다
    modal.classList.add('turning'); // 넘기는 동안 팝업 틀에 붙은 장식(접합부)의 층을 바꾼다
    mover.scrollTop = scroll.scrollTop;
    oldPage.scrollTop = scroll.scrollTop;

    const rgb = cssVar('--turn-shadow-rgb'), persp = cssVar('--turn-perspective');
    const castW = cssMs('--turn-cast-w'), castA = cssMs('--turn-cast-a'), litA = cssMs('--turn-lit-a'), pageShadowA = cssMs('--turn-page-shadow-a');
    const FALL = [[0, 1], [0.12, 0.72], [0.3, 0.4], [0.55, 0.16], [0.8, 0.05], [1, 0]]; // 그림자는 바깥으로 갈수록 천천히 사라진다: [거리 비율, 진하기 비율]
    const col = a => `rgba(${rgb}, ${a.toFixed(3)})`;

    // 진행도 u(0~1)에서 젖힌 각도 phi: 0 → 180(다 젖혀짐) → 360(뒤로 내려가 팝업에 가려짐). 중간에 멈추지 않는 하나의 곡선
    const phiAt = u => 360 * smooth(u);

    function draw(u) {
      const phi = phiAt(u), rad = phi * Math.PI / 180, face = Math.sin(Math.min(rad, Math.PI)); // face: 0(정면)→1(옆면)→0(젖혀짐)
      // 위로 젖히기: 위쪽 가장자리를 축으로 한 회전. 젖혀진 뒤에는 팝업 뒤로 층을 바꿔 뒤에서 내려가게 한다
      book.style.transform = `perspective(${persp}) rotateX(${phi}deg)`;
      book.style.zIndex = phi > 180 ? -1 : 3;
      // 견출지: 페이지 앞면일 때(0~180도)는 선택된 탭 모양, 뒤로 내려간 뒤(180~360도)는 팝업 뒤에 끼워진 탭 모양. 바뀌는 순간 페이지는 화면 위쪽 밖에 있어 보이지 않는다
      if (tab) for (const b of [tab.front, tab.back]) b.classList.toggle('active', phi < 180);
      lit.style.backgroundColor = col(litA * face); // 기울어질수록 앞면이 어두워진다
      // 종이 자체의 그림자: 평평할 때(0도)는 팝업의 그림자와 겹쳐 튀지 않게 0이고, 들리기 시작하면 빠르게 나타나 젖혀진 뒤에도 윤곽을 보여 준다
      book.style.setProperty('--sa', (pageShadowA * smooth(Math.min(phi, 360 - phi) / 30)).toFixed(3));
      // 젖혀 올라가는 페이지가 드러난 페이지 위쪽에 드리우는 그림자: 페이지 아래 가장자리(투영) 바로 아래
      const edgeY = Math.max(0, H * Math.cos(rad));
      const a = castA * face * (phi < 90 ? 1 : Math.max(0, 1 - (phi - 90) / 60));
      cast.style.background = `linear-gradient(to bottom, transparent ${edgeY}px, ${FALL.map(([d, f]) => `${col(a * f)} ${edgeY + castW * d}px`).join(',')})`;
    }

    // 진행도 u는 시간에 선형으로 간다(구간마다 곡선은 phiAt이 준다)
    const clock = curl.animate([{ opacity: 1 }, { opacity: 1 }], { duration: cssMs('--turn-ms'), easing: 'linear', fill: 'both' });
    let alive = true;
    const cleanup = () => {
      alive = false; curl.remove(); book.remove();
      if (hiddenTab) hiddenTab.style.visibility = '';
      if (!modal.querySelector('.page-curl')) modal.classList.remove('turning'); // 새로 시작된 넘김이 있으면 그쪽이 끝낼 때까지 둔다
    };
    const frame = () => {
      if (!alive || !curl.isConnected) return;
      const p = clock.effect.getComputedTiming().progress ?? 1;
      draw(dir === 'prev' ? 1 - p : p); // prev는 같은 동작을 거꾸로
      if (clock.playState === 'finished') { cleanup(); return; }
      requestAnimationFrame(frame);
    };
    draw(dir === 'prev' ? 1 : 0);
    requestAnimationFrame(frame);
    clock.finished.then(cleanup).catch(() => { alive = false; });
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
