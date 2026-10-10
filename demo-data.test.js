const test = require('node:test');
const assert = require('node:assert');
const DEMO = require('./demo-data.js');
const { parseImport } = require('./data.js');
const { placeSteps, dayStats, dateRange, addDays, weekStart, eventsOnDate } = require('./placement.js');

// 데모는 앱의 기능을 한 번에 보여 주는 데이터다. 기준 오늘(2026-10-10)에서 아래 구성이 빠지지 않게 지킨다
const TODAY = '2026-10-10';
const s = DEMO.settings;
const active = DEMO.steps.filter(x => !x.done);
const done = DEMO.steps.filter(x => x.done && x.doneDate);
const placements = placeSteps({ steps: active, doneSteps: done, goals: DEMO.goals, events: DEMO.events, today: TODAY, ...s });
const stats = date => dayStats({ date, steps: active, doneSteps: done, placements, events: DEMO.events, ...s });
const week = dateRange(weekStart(TODAY), addDays(weekStart(TODAY), 6)).map(stats);

test('데모 데이터는 가져오기 검사를 통과한다', () => {
  const r = parseImport(JSON.stringify(DEMO));
  assert.equal(r.ok, true, r.error);
});

test('지남: 마감이 지난 미완료 단계가 오늘 칸에 깔리고, 고정한 지남 단계는 고정한 날에 있다', () => {
  const late = placements.filter(p => p.overdue);
  assert.ok(late.length >= 3, `지남 ${late.length}개`);
  assert.ok(late.some(p => !p.pinned && p.date === TODAY));
  assert.ok(late.some(p => p.pinned && p.date > TODAY));
});

test('이번 주에 완료한 단계, 예산 초과, 안전선만 초과, 시간 초과가 모두 있다', () => {
  assert.ok(week.some(d => d.doneSteps.length > 0), '완료 도장');
  assert.ok(week.some(d => d.overBudget), '예산 초과');
  assert.ok(week.some(d => d.overSafe && !d.overBudget), '안전선만 초과');
  assert.ok(week.some(d => d.overTime), '시간 초과');
});

test('반복: 매주·격주·매월, 이 날만 빼기, 반복 종료일이 모두 있다', () => {
  const kinds = new Set(DEMO.events.map(e => e.repeat));
  for (const k of ['none', 'weekly', 'biweekly', 'monthly']) assert.ok(kinds.has(k), k);
  assert.ok(DEMO.events.some(e => e.skipDates && e.skipDates.length));
  assert.ok(DEMO.events.some(e => e.repeatUntil));
});

test('격주·매월 일정이 실제로 여러 번 나타난다(데모 기간 안)', () => {
  const dates = dateRange('2026-09-01', '2026-11-30');
  for (const id of ['event_demo_51', 'event_demo_52']) {
    const ev = DEMO.events.find(e => e.id === id);
    const n = dates.filter(d => eventsOnDate([ev], d).length).length;
    assert.ok(n >= 3, `${id} ${n}번`);
  }
});

test('고정한 단계, 초과로 깔린 단계, 완료한 단계가 있다', () => {
  assert.ok(DEMO.steps.some(x => x.pinnedDate && !x.done));
  assert.ok(placements.some(p => p.exceeded));
  assert.ok(done.length >= 10);
});
