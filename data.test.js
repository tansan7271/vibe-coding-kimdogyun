const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseImport, serializeExport, isDateStr } = require('./data.js');

const goal = { id: 'g1', title: '과제', deadline: '2026-10-12', createdAt: '2026-10-01' };
const step = { id: 's1', goalId: 'g1', title: '자료', load: 3, minutes: 60, order: 0, done: false, pushCount: 0 };
const event = { id: 'e1', title: '수업', load: 2, start: '09:00', end: '10:00', repeat: 'weekly', weekday: 1 };
const full = () => structuredClone({ version: 1, goals: [goal], steps: [step], events: [event], settings: { capacity: 12, safeRatio: 0.7, sleepHours: 7, lifeHours: 3, placeMode: 'even' } });
const parse = obj => parseImport(typeof obj === 'string' ? obj : JSON.stringify(obj));
const mod = fn => { const o = full(); fn(o); return o; };

test('빈 상태(첫 사용)를 내보냈다가 그대로 가져온다', () => {
  const empty = { version: 1, goals: [], steps: [], events: [], settings: { capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4, placeMode: 'fill' } };
  const r = parseImport(serializeExport(empty));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, empty);
});

test('내보냈다가 가져오면 같다 (혹시 상태에 apiKey가 있어도 파일로 새지 않는다)', () => {
  const state = full();
  state.settings.apiKey = 'sk-secret';
  const text = serializeExport(state);
  assert.ok(!text.includes('sk-secret'));
  assert.ok(!text.includes('apiKey'));
  const r = parseImport(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, full());
  assert.equal(state.settings.apiKey, 'sk-secret'); // 원본은 그대로
});

test('가져올 때 파일 안의 apiKey는 무시한다 (옛 파일 대비)', () => {
  const o = full();
  o.settings.apiKey = 'sk-x';
  assert.equal('apiKey' in parse(o).state.settings, false);
});

test('빠진 설정은 기본값으로 채운다', () => {
  const o = full();
  delete o.settings;
  assert.deepEqual(parse(o).state.settings, { capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4, placeMode: 'fill' });
  const p = mod(x => { x.settings = { capacity: 5 }; });
  assert.equal(parse(p).state.settings.safeRatio, 0.8);
});

test('깨진 JSON, 객체가 아닌 값, version 없음/다름은 거부한다', () => {
  assert.match(parseImport('{깨짐').error, /JSON/);
  assert.equal(parseImport('[]').ok, false);
  assert.equal(parseImport('null').ok, false);
  assert.match(parse(mod(o => { delete o.version; })).error, /version/);
  assert.match(parse(mod(o => { o.version = 2; })).error, /version/);
  assert.match(parse(mod(o => { o.version = 0; })).error, /version/);
  assert.match(parse(mod(o => { o.version = '1'; })).error, /version/);
});

test('목록이 빠지거나 형태가 틀리면 거부한다', () => {
  assert.equal(parse(mod(o => { delete o.goals; })).ok, false);
  assert.equal(parse(mod(o => { o.steps = {}; })).ok, false);
  assert.equal(parse(mod(o => { o.events = null; })).ok, false);
});

test('단계가 없는 할 일을 가리키거나 id가 겹치면 거부한다', () => {
  assert.match(parse(mod(o => { o.steps[0].goalId = 'zzz'; })).error, /없는 할 일/);
  assert.match(parse(mod(o => { o.goals.push({ ...goal }); })).error, /겹칩니다/);
  assert.match(parse(mod(o => { o.steps.push({ ...step }); })).error, /겹칩니다/);
  assert.match(parse(mod(o => { o.events.push({ ...event }); })).error, /겹칩니다/);
});

test('날짜는 실제 달력에 있어야 한다 (윤년 포함)', () => {
  assert.equal(isDateStr('2028-02-29'), true);
  assert.equal(isDateStr('2026-02-29'), false);
  assert.equal(isDateStr('2100-02-29'), false);
  assert.equal(isDateStr('2026-13-01'), false);
  assert.equal(isDateStr('2026-4-1'), false);
  assert.equal(isDateStr(20261001), false);
  assert.match(parse(mod(o => { o.goals[0].deadline = '2026-02-30'; })).error, /마감일/);
  assert.match(parse(mod(o => { o.steps[0].pinnedDate = '10/01'; })).error, /pinnedDate/);
  assert.equal(parse(mod(o => { o.steps[0].placedDate = '2026-09-30'; o.steps[0].pushCount = 2; })).ok, true);
});

test('완료 단계는 완료일이 있어야 하고, 부하·시간·순서 값을 검사한다', () => {
  assert.match(parse(mod(o => { o.steps[0].done = true; })).error, /doneDate/);
  assert.equal(parse(mod(o => { o.steps[0].done = true; o.steps[0].doneDate = '2026-10-02'; })).ok, true);
  assert.match(parse(mod(o => { o.steps[0].load = 6; })).error, /부하/);
  assert.match(parse(mod(o => { o.steps[0].load = 2.5; })).error, /부하/);
  assert.match(parse(mod(o => { o.steps[0].minutes = 0; })).error, /예상 시간/);
  assert.match(parse(mod(o => { o.steps[0].order = 'a'; })).error, /order/);
  assert.match(parse(mod(o => { o.steps[0].pushCount = -1; })).error, /pushCount/);
});

test('일정: 반복별 필수값과 시각 형식', () => {
  assert.match(parse(mod(o => { o.events[0].weekday = 7; })).error, /weekday/);
  assert.match(parse(mod(o => { o.events[0].repeat = 'daily'; })).error, /repeat/);
  assert.match(parse(mod(o => { o.events[0] = { ...event, repeat: 'none' }; })).error, /날짜/);
  assert.equal(parse(mod(o => { o.events[0] = { ...event, repeat: 'none', date: '2026-10-03' }; })).ok, true);
  assert.match(parse(mod(o => { o.events[0].start = '9:00'; })).error, /HH:MM/);
  assert.match(parse(mod(o => { o.events[0].start = '10:00'; })).error, /빠르지/);
  assert.match(parse(mod(o => { o.events[0].repeatUntil = 'x'; })).error, /반복 종료일/);
});

test('설정값 범위를 검사한다', () => {
  assert.match(parse(mod(o => { o.settings.capacity = 0; })).error, /capacity/);
  assert.match(parse(mod(o => { o.settings.safeRatio = 0; })).error, /safeRatio/);
  assert.match(parse(mod(o => { o.settings.safeRatio = 1.2; })).error, /safeRatio/);
  assert.equal(parse(mod(o => { o.settings.safeRatio = 1; })).ok, true);
  assert.match(parse(mod(o => { o.settings.sleepHours = 25; })).error, /sleepHours/);
  assert.match(parse(mod(o => { o.settings.placeMode = 'x'; })).error, /placeMode/);
  assert.match(parse(mod(o => { o.settings = []; })).error, /settings/);
});

test('격주·매월 일정: 시작 날짜 필수, 매주 시작 날짜는 선택', () => {
  const bi = { ...event, repeat: 'biweekly', date: '2026-10-01' };
  delete bi.weekday;
  assert.equal(parse(mod(o => { o.events[0] = bi; })).ok, true);
  assert.equal(parse(mod(o => { o.events[0] = { ...bi, repeat: 'monthly', repeatUntil: '2027-01-01' }; })).ok, true);
  assert.match(parse(mod(o => { o.events[0] = { ...bi, date: undefined }; })).error, /시작 날짜/);
  assert.match(parse(mod(o => { o.events[0] = { ...bi, repeat: 'monthly', date: '2026-02-30' }; })).error, /시작 날짜/);
  assert.match(parse(mod(o => { o.events[0] = { ...bi, repeatUntil: '내일' }; })).error, /반복 종료일/);
  assert.equal(parse(mod(o => { o.events[0] = { ...event, date: '2026-10-05' }; })).ok, true); // 매주 + 시작일
  assert.match(parse(mod(o => { o.events[0] = { ...event, date: '10/05' }; })).error, /시작 날짜/);
  assert.equal(parse(mod(() => {})).ok, true); // 시작일 없는 옛 매주 데이터
});
