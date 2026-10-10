const test = require('node:test');
const assert = require('node:assert');
const DEMO = require('./demo-data.js');
const { parseImport } = require('./data.js');
const { placeSteps, dayStats, dateRange, addDays, weekStart, eventsOnDate } = require('./placement.js');

// 데모는 앱의 기능을 한 번에 보여 주는 데이터다. 기준 오늘(2026-10-07, 앱에서는 DEMO_TODAY로 고정)에서 아래 구성이 빠지지 않게 지킨다
const TODAY = '2026-10-07';
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

test('기준일 이후에 완료한 기록은 없다(오늘이 10/7인데 미래에 끝낸 단계가 있으면 안 된다)', () => {
  assert.ok(done.every(x => x.doneDate <= TODAY), done.filter(x => x.doneDate > TODAY).map(x => x.id).join());
});

test('마감이 오늘인 단계가 있다(지남이 아니라 오늘 칸에 깔린다)', () => {
  const dueToday = new Set(DEMO.goals.filter(g => g.deadline === TODAY).map(g => g.id));
  const steps = active.filter(x => dueToday.has(x.goalId));
  assert.ok(steps.length >= 1);
  steps.forEach(x => { const p = placements.find(q => q.stepId === x.id); assert.equal(p.overdue, false); assert.equal(p.date, TODAY); });
});

test('주마다 빽빽한 정도가 다양하다: 한산한 주(예산 초과 없고 부하 합이 낮음)와 빽빽한 주(예산 초과가 있고 부하 합이 높음)가 모두 있다', () => {
  const weeks = [];
  for (let m = '2026-09-07'; m <= '2026-11-23'; m = addDays(m, 7)) {
    const days = dateRange(m, addDays(m, 6)).map(stats);
    weeks.push({ m, load: days.reduce((s, d) => s + d.load, 0), over: days.filter(d => d.overBudget).length });
  }
  assert.ok(weeks.filter(w => w.over === 0).length >= 3, '예산 초과 없는 주가 3주 이상');
  assert.ok(weeks.some(w => w.load <= 45), '부하 합이 45 이하인 한산한 주');
  assert.ok(weeks.filter(w => w.load >= 85 && w.over >= 2).length >= 2, '빽빽한 주가 2주 이상');
});
