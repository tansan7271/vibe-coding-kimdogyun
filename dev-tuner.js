// 임시 개발자용 슬라이더. 헤더 모양을 조절해 보고 "값 복사"로 값을 얻는다. 값이 정해지면 이 파일과 index.html의 script 태그를 지운다
(function () {
  const BG = '#b8203a';      // 천 색
  const YARN = '#e0a030';    // 털실 색
  const P = { tilt: 0.6, amp: 2, wave: 224, dash: 5, gap: 5.4, width: 2.4, offset: 6, shY: 3, shBlur: 5, shAlpha: 0.3 };
  const DEFS = [
    ['tilt', '기울기(도)', 0, 2, 0.05],
    ['amp', '울렁임 진폭(px, 위아래)', 0, 8, 0.25],
    ['wave', '울렁임 파장(px)', 56, 600, 8],
    ['dash', '점 길이', 1, 14, 0.5],
    ['gap', '점 사이 간격(둥근 끝 포함)', 0, 14, 0.1],
    ['width', '털실 두께', 1, 5, 0.1],
    ['offset', '점선과 천 끝 사이(px)', 2, 16, 0.5],
    ['shY', '그림자 아래로(px)', 0, 12, 0.5],
    ['shBlur', '그림자 번짐(px)', 0, 20, 0.5],
    ['shAlpha', '그림자 진하기', 0, 0.6, 0.02],
  ];

  // 오른쪽 끝에서 왼쪽 끝으로: 아래로 불룩 → 위로 불룩 (한 주기). 이동 명령(M)은 뺀 곡선 부분
  function waveCurve(w, y, amp) {
    const r = n => +n.toFixed(2);
    return `Q${r(w * 0.75)} ${r(y + 2 * amp)} ${r(w / 2)} ${r(y)}Q${r(w * 0.25)} ${r(y - 2 * amp)} 0 ${r(y)}`;
  }

  function curveLength(w, amp) {
    // 곡선의 길이를 선분으로 쪼개 어림잡는다
    let len = 0, px = 0, py = 0;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      const x = w * t;
      const y = amp * Math.sin(t * 2 * Math.PI) * 1; // 어림: 사인 곡선으로 길이 계산
      if (i) len += Math.hypot(x - px, y - py);
      px = x; py = y;
    }
    return len;
  }

  function apply() {
    const sy = P.width / 2 + P.amp + 1;      // 점선 곡선 가운데 높이
    const ey = sy + P.offset;                // 천 끝 곡선 가운데 높이
    const h = Math.ceil(ey + P.amp + 1);
    const period = P.dash + P.gap;
    const periods = Math.max(1, Math.round(curveLength(P.wave, P.amp) / period));
    const pathLength = +(periods * period).toFixed(3);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${P.wave}' height='${h}' viewBox='0 0 ${P.wave} ${h}'>`
      + `<path d='M0 0H${P.wave}V${+ey.toFixed(2)}${waveCurve(P.wave, ey, P.amp)}Z' fill='${BG}'/>`
      + `<path d='M${P.wave} ${+sy.toFixed(2)}${waveCurve(P.wave, sy, P.amp)}' fill='none' stroke='${YARN}' stroke-width='${P.width}' stroke-linecap='round' stroke-dasharray='${P.dash} ${P.gap}' stroke-dashoffset='${P.dash / 2}' pathLength='${pathLength}'/>`
      + `</svg>`;
    const root = document.documentElement.style;
    root.setProperty('--edge-tile', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    root.setProperty('--edge-h', h + 'px');
    root.setProperty('--edge-depth', Math.ceil(ey + P.amp) + 'px');
    root.setProperty('--header-tilt-deg', P.tilt + 'deg');
    root.setProperty('--header-shadow', `0 ${P.shY}px ${P.shBlur}px rgba(184,32,58,${P.shAlpha})`);
    // 타일 가로 크기는 CSS 쪽에 박혀 있어서 따로 맞춘다
    document.getElementById('dev-tuner-style').textContent = `header::before { background-size: ${P.wave}px ${h}px, 100% calc(100% - ${h}px + 1px) !important; }`;
    out.value = DEFS.map(d => `${d[1]}: ${P[d[0]]}`).join('\n');
  }

  const style = document.createElement('style');
  style.id = 'dev-tuner-style';
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2000;width:280px;max-height:80vh;overflow:auto;background:#fff;color:#222;border:1px solid #999;border-radius:8px;padding:10px;font:12px/1.4 sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.25)';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:bold;cursor:pointer';
  title.textContent = '헤더 조절 (임시) ▾';
  const body = document.createElement('div');
  title.onclick = () => { body.hidden = !body.hidden; };
  box.append(title, body);

  DEFS.forEach(([key, label, min, max, step]) => {
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin-top:6px';
    const val = document.createElement('b');
    const input = document.createElement('input');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = P[key];
    input.style.cssText = 'width:100%';
    const show = () => { val.textContent = ' ' + P[key]; };
    input.oninput = () => { P[key] = +input.value; show(); apply(); };
    row.append(label, val, input);
    body.appendChild(row);
    show();
  });

  const out = document.createElement('textarea');
  out.readOnly = true; out.rows = 10;
  out.style.cssText = 'width:100%;margin-top:8px;font:11px monospace';
  const copy = document.createElement('button');
  copy.type = 'button'; copy.textContent = '값 복사'; copy.style.cssText = 'margin-top:6px';
  copy.onclick = () => {
    out.select();
    const done = () => { copy.textContent = '복사됨'; setTimeout(() => { copy.textContent = '값 복사'; }, 1200); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(out.value).then(done, () => { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  };
  body.append(copy, out);

  document.body.appendChild(box);
  apply();
})();
