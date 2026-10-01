// 데이터 내보내기/가져오기 검사 (SPEC 7장 화면 3, 8장 데이터). 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Data = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_SETTINGS = { capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4, placeMode: 'fill' };

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  // 실제 달력에 있는 YYYY-MM-DD인가 (Date를 쓰지 않는다)
  function isDateStr(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const [y, m, d] = v.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1) return false;
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    return d <= days;
  }

  function isTimeStr(v) {
    return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  }

  function isLoad(v) {
    return Number.isInteger(v) && v >= 1 && v <= 5;
  }

  function nonEmptyString(v) {
    return typeof v === 'string' && v.trim() !== '';
  }

  /**
   * 내보낼 JSON 문자열. API 키는 파일로 새지 않게 뺀다.
   * @param {object} state 앱 상태
   */
  function serializeExport(state) {
    const { apiKey, ...settings } = state.settings || {};
    return JSON.stringify({ ...state, settings }, null, 2);
  }

  /**
   * 가져올 파일 내용을 검사한다. 하나라도 틀리면 가져오지 않는다.
   * 빠진 설정값은 기본값으로 채운다. 파일에 apiKey가 있어도 무시한다.
   * @param {string} text 파일 내용
   * @returns {{ok:true, state:object}|{ok:false, error:string}}
   */
  function parseImport(text) {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      return fail('JSON 형식이 아닙니다. 내보낸 파일이 맞는지 확인하세요.');
    }
    if (!isPlainObject(raw)) return fail('데이터가 객체가 아닙니다.');
    if (raw.version === undefined) return fail('version 항목이 없습니다.');
    if (raw.version !== 1) return fail(`지원하지 않는 version입니다: ${JSON.stringify(raw.version)} (이 앱은 1만 읽습니다)`);
    for (const key of ['goals', 'steps', 'events']) {
      if (!Array.isArray(raw[key])) return fail(`${key} 항목이 목록이 아닙니다.`);
    }

    const goalIds = new Set();
    for (const [i, g] of raw.goals.entries()) {
      const at = `할 일 ${i + 1}번`;
      if (!isPlainObject(g)) return fail(`${at}이 객체가 아닙니다.`);
      if (!nonEmptyString(g.id)) return fail(`${at}에 id가 없습니다.`);
      if (goalIds.has(g.id)) return fail(`${at}의 id가 겹칩니다: ${g.id}`);
      goalIds.add(g.id);
      if (!nonEmptyString(g.title)) return fail(`${at}에 제목이 없습니다.`);
      if (!isDateStr(g.deadline)) return fail(`${at}의 마감일이 YYYY-MM-DD 형식이 아닙니다: ${JSON.stringify(g.deadline)}`);
    }

    const stepIds = new Set();
    for (const [i, s] of raw.steps.entries()) {
      const at = `중간 단계 ${i + 1}번`;
      if (!isPlainObject(s)) return fail(`${at}이 객체가 아닙니다.`);
      if (!nonEmptyString(s.id)) return fail(`${at}에 id가 없습니다.`);
      if (stepIds.has(s.id)) return fail(`${at}의 id가 겹칩니다: ${s.id}`);
      stepIds.add(s.id);
      if (!goalIds.has(s.goalId)) return fail(`${at}이 없는 할 일을 가리킵니다: ${JSON.stringify(s.goalId)}`);
      if (!nonEmptyString(s.title)) return fail(`${at}에 제목이 없습니다.`);
      if (!isLoad(s.load)) return fail(`${at}의 부하는 1~5 정수여야 합니다: ${JSON.stringify(s.load)}`);
      if (typeof s.minutes !== 'number' || !(s.minutes > 0)) return fail(`${at}의 예상 시간은 0보다 커야 합니다.`);
      if (typeof s.order !== 'number' || !Number.isFinite(s.order)) return fail(`${at}의 순서(order)가 숫자가 아닙니다.`);
      if (s.done !== undefined && typeof s.done !== 'boolean') return fail(`${at}의 done이 true/false가 아닙니다.`);
      if (s.done && !isDateStr(s.doneDate)) return fail(`${at}은 완료인데 완료일(doneDate)이 올바르지 않습니다.`);
      for (const f of ['doneDate', 'pinnedDate', 'earliestDate', 'placedDate']) {
        if (s[f] !== undefined && !isDateStr(s[f])) return fail(`${at}의 ${f}가 YYYY-MM-DD 형식이 아닙니다: ${JSON.stringify(s[f])}`);
      }
      if (s.pushCount !== undefined && !(Number.isInteger(s.pushCount) && s.pushCount >= 0)) return fail(`${at}의 pushCount는 0 이상 정수여야 합니다.`);
    }

    const eventIds = new Set();
    for (const [i, ev] of raw.events.entries()) {
      const at = `일정 ${i + 1}번`;
      if (!isPlainObject(ev)) return fail(`${at}이 객체가 아닙니다.`);
      if (!nonEmptyString(ev.id)) return fail(`${at}에 id가 없습니다.`);
      if (eventIds.has(ev.id)) return fail(`${at}의 id가 겹칩니다: ${ev.id}`);
      eventIds.add(ev.id);
      if (!nonEmptyString(ev.title)) return fail(`${at}에 제목이 없습니다.`);
      if (!isLoad(ev.load)) return fail(`${at}의 부하는 1~5 정수여야 합니다: ${JSON.stringify(ev.load)}`);
      if (!isTimeStr(ev.start) || !isTimeStr(ev.end)) return fail(`${at}의 시작·종료 시각이 HH:MM 형식이 아닙니다.`);
      if (ev.start >= ev.end) return fail(`${at}의 시작 시각이 종료 시각보다 빠르지 않습니다.`);
      if (ev.repeat === 'weekly') {
        if (!(Number.isInteger(ev.weekday) && ev.weekday >= 0 && ev.weekday <= 6)) return fail(`${at}의 요일(weekday)은 0~6이어야 합니다.`);
        if (ev.repeatUntil !== undefined && !isDateStr(ev.repeatUntil)) return fail(`${at}의 반복 종료일이 YYYY-MM-DD 형식이 아닙니다.`);
      } else if (ev.repeat === 'none') {
        if (!isDateStr(ev.date)) return fail(`${at}의 날짜가 YYYY-MM-DD 형식이 아닙니다.`);
      } else {
        return fail(`${at}의 반복(repeat)은 none 또는 weekly여야 합니다.`);
      }
    }

    const inSettings = raw.settings === undefined ? {} : raw.settings;
    if (!isPlainObject(inSettings)) return fail('settings 항목이 객체가 아닙니다.');
    const settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (inSettings[key] !== undefined) settings[key] = inSettings[key];
    }
    if (typeof settings.capacity !== 'number' || !(settings.capacity > 0)) return fail('하루 예산(capacity)은 0보다 커야 합니다.');
    if (typeof settings.safeRatio !== 'number' || !(settings.safeRatio > 0 && settings.safeRatio <= 1)) return fail('안전선 비율(safeRatio)은 0보다 크고 1 이하여야 합니다.');
    for (const key of ['sleepHours', 'lifeHours']) {
      if (typeof settings[key] !== 'number' || !(settings[key] >= 0 && settings[key] <= 24)) return fail(`${key}는 0~24 사이여야 합니다.`);
    }
    if (settings.placeMode !== 'fill' && settings.placeMode !== 'even') return fail('깔기 방식(placeMode)은 fill 또는 even이어야 합니다.');

    return {
      ok: true,
      state: { version: 1, goals: raw.goals, steps: raw.steps, events: raw.events, settings },
    };
  }

  function fail(error) {
    return { ok: false, error };
  }

  return { parseImport, serializeExport, isDateStr };
});
