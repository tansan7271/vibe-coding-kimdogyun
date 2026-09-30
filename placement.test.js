const { test } = require('node:test');
const assert = require('node:assert/strict');
const { placeSteps, dayStats, weekStart, addDays, weekdayOf, eventsOnDate } = require('./placement.js');

const defaultSettings = {
  capacity: 10,
  safeRatio: 0.8,
  sleepHours: 8,
  lifeHours: 4,
  placeMode: 'fill',
};

function goal(id, deadline) {
  return { id, deadline };
}

function step(overrides) {
  return {
    id: 's1', goalId: 'g1', load: 3, minutes: 60, order: 0,
    ...overrides,
  };
}

test('기본값 조합, 입력 없음 -> 빈 결과 (첫 사용 실패 없음)', () => {
  const result = placeSteps({ steps: [], goals: [], events: [], today: '2026-10-01', ...defaultSettings });
  assert.deepEqual(result, []);
});

test('할 일 하나, 단계 하나 -> 오늘 날짜에 깔린다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const steps = [step({ id: 's1' })];
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-10-01');
  assert.equal(result[0].exceeded, false);
  assert.equal(result[0].overdue, false);
});

test('같은 할 일 안에서는 순서대로, 앞 단계가 깔린 날 이후부터 시작 가능', () => {
  const goals = [goal('g1', '2026-10-10')];
  const steps = [
    step({ id: 's1', order: 0, load: 5 }),
    step({ id: 's2', order: 1, load: 5 }),
  ];
  // capacity 10, safeRatio 0.8 -> safeLimit 8. 첫 단계(5)는 오늘 가능. 둘째 단계(5)를 더하면 오늘 10 > 8이라 오늘엔 안 들어감 -> 다음날로
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  const byId = Object.fromEntries(result.map(r => [r.stepId, r]));
  assert.equal(byId.s1.date, '2026-10-01');
  assert.equal(byId.s2.date, '2026-10-02');
  assert.equal(byId.s2.exceeded, false);
});

test('안전선 초과: 들어갈 날이 없으면 여유가 가장 큰 날에 깔고 초과 표시', () => {
  const goals = [goal('g1', '2026-10-02')]; // 마감이 촉박: 후보는 10/01, 10/02 뿐
  const events = [
    { id: 'e1', title: '수업', load: 8, weekday: weekdayOf('2026-10-01'), start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-01' },
    { id: 'e2', title: '수업2', load: 8, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-02' },
  ];
  const steps = [step({ id: 's1', load: 3, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].exceeded, true);
  assert.equal(result[0].overLoad, true);
  assert.equal(result[0].overTime, false);
  assert.ok(['2026-10-01', '2026-10-02'].includes(result[0].date));
});

test('시간 초과: 부하는 여유 있어도 남은 시간이 모자라면 초과 표시', () => {
  const goals = [goal('g1', '2026-10-01')]; // 마감이 오늘이라 후보가 하루뿐
  // 가용시간 = 24 - 8(수면) - 20(생활) = -4시간 -> 이미 시간이 바닥
  const steps = [step({ id: 's1', load: 1, minutes: 60 })];
  const result = placeSteps({
    steps, goals, events: [], today: '2026-10-01',
    capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 20, placeMode: 'fill',
  });
  assert.equal(result[0].exceeded, true);
  assert.equal(result[0].overLoad, false);
  assert.equal(result[0].overTime, true);
  assert.equal(result[0].date, '2026-10-01');
});

test('부하와 시간 둘 다 초과하면 둘 다 표시된다', () => {
  const goals = [goal('g1', '2026-10-01')]; // 후보가 오늘 하루뿐
  const events = [
    { id: 'e1', title: '알바', load: 8, start: '09:00', end: '20:00', repeat: 'none', date: '2026-10-01' },
  ];
  const steps = [step({ id: 's1', load: 3, minutes: 120 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].exceeded, true);
  assert.equal(result[0].overLoad, true);
  assert.equal(result[0].overTime, true);
});

test('마감이 이미 지난 할 일의 단계는 지남으로 표시하고 깔지 않는다', () => {
  const goals = [goal('g1', '2026-09-25')];
  const steps = [step({ id: 's1' })];
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].overdue, true);
  assert.equal(result[0].date, null);
});

test('마감이 오늘이면 후보가 오늘 하루뿐이고, 들어가면 오늘 깔린다', () => {
  const goals = [goal('g1', '2026-10-01')];
  const steps = [step({ id: 's1', load: 2, minutes: 30 })];
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].date, '2026-10-01');
  assert.equal(result[0].exceeded, false);
});

test('고정(pinned)된 단계는 규칙이 옮기지 않는다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const steps = [step({ id: 's1', pinnedDate: '2026-10-07', load: 9 })]; // 안전선(8) 넘는 부하라도 그대로 유지
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].date, '2026-10-07');
  assert.equal(result[0].pinned, true);
  assert.equal(result[0].exceeded, false);
});

test('고정된 단계의 부하는 다른 단계 배치에 영향을 준다', () => {
  const goals = [goal('g1', '2026-10-03'), goal('g2', '2026-10-03')];
  const steps = [
    step({ id: 'pinned1', goalId: 'g1', pinnedDate: '2026-10-01', load: 8 }),
    step({ id: 's2', goalId: 'g2', load: 3 }),
  ];
  // 10/01엔 이미 고정 단계가 부하 8을 차지 -> safeLimit(8) 넘어가서 s2는 10/01에 못 들어감
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  const byId = Object.fromEntries(result.map(r => [r.stepId, r]));
  assert.equal(byId.s2.date, '2026-10-02');
});

test('채우기 우선: 이미 부하가 있는 날 중 가장 이른 날을 고른다', () => {
  const goals = [goal('g1', '2026-10-05')];
  const events = [
    { id: 'e1', title: '알바', load: 2, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-02' },
  ];
  const steps = [step({ id: 's1', load: 2, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings, placeMode: 'fill' });
  assert.equal(result[0].date, '2026-10-02');
});

test('고르게: 여유가 가장 큰 날을 고른다', () => {
  const goals = [goal('g1', '2026-10-03')];
  const events = [
    { id: 'e1', title: '알바', load: 6, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-01' },
  ];
  const steps = [step({ id: 's1', load: 1, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings, placeMode: 'even' });
  // 10/01은 여유 4(10-6), 10/02,10/03은 여유 10 -> 더 큰 여유인 날 중 이른 날 = 10/02
  assert.equal(result[0].date, '2026-10-02');
});

test('반복(매주) 일정도 부하 계산에 들어간다', () => {
  const goals = [goal('g1', '2026-10-08')];
  const mondayWeekday = weekdayOf('2026-10-05'); // 월요일
  const events = [
    { id: 'e1', title: '전공수업', load: 8, weekday: mondayWeekday, start: '09:00', end: '10:00', repeat: 'weekly' },
  ];
  const steps = [step({ id: 's1', load: 1, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-05', ...defaultSettings });
  // 10/05(월)엔 반복 일정 부하 8이 이미 있어 안전선(8) 넘어가서 못 들어감 -> 다음날
  assert.equal(result[0].date, '2026-10-06');
});

test('같은 입력이면 같은 결과 (결정적)', () => {
  const goals = [goal('g1', '2026-10-10'), goal('g2', '2026-10-05')];
  const steps = [
    step({ id: 's1', goalId: 'g1', order: 0, load: 3 }),
    step({ id: 's2', goalId: 'g1', order: 1, load: 2 }),
    step({ id: 's3', goalId: 'g2', order: 0, load: 4 }),
  ];
  const input = { steps, goals, events: [], today: '2026-10-01', ...defaultSettings };
  const r1 = placeSteps(input);
  const r2 = placeSteps(input);
  assert.deepEqual(r1, r2);
});

test('addDays, weekdayOf 날짜 유틸 기본 동작', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(weekdayOf('2026-10-05'), 0); // 2026-10-05는 월요일
});

test('eventsOnDate: 반복 종료일 이후에는 매칭되지 않는다', () => {
  const events = [
    { id: 'e1', title: '수업', load: 3, weekday: weekdayOf('2026-10-05'), start: '09:00', end: '10:00', repeat: 'weekly', repeatUntil: '2026-10-10' },
  ];
  assert.equal(eventsOnDate(events, '2026-10-05').length, 1);
  assert.equal(eventsOnDate(events, '2026-10-12').length, 0);
});

test('weekStart: 월요일 시작, 일요일은 그 주 월요일로', () => {
  assert.equal(weekStart('2026-09-30'), '2026-09-28'); // 수
  assert.equal(weekStart('2026-09-28'), '2026-09-28'); // 월
  assert.equal(weekStart('2026-10-04'), '2026-09-28'); // 일
  assert.equal(weekStart('2026-10-05'), '2026-10-05'); // 다음 월
});

test('dayStats: 기본값, 아무것도 없는 날은 여유 전체와 가용 시간 전체', () => {
  const s = dayStats({ date: '2026-10-01', steps: [], placements: [], events: [], ...defaultSettings });
  assert.equal(s.load, 0);
  assert.equal(s.slack, 10);
  assert.equal(s.minutesLeft, 720);
  assert.equal(s.overSafe, false);
  assert.equal(s.overTime, false);
});

test('dayStats: 일정과 단계를 합산, 그날에 깔린 단계만 센다', () => {
  const events = [{ id: 'e1', load: 3, start: '09:00', end: '12:00', repeat: 'none', date: '2026-10-01' }];
  const steps = [step({ id: 's1', load: 4, minutes: 90 }), step({ id: 's2', load: 5, minutes: 60, order: 1 })];
  const placements = [
    { stepId: 's1', date: '2026-10-01' },
    { stepId: 's2', date: '2026-10-02' },
  ];
  const s = dayStats({ date: '2026-10-01', steps, placements, events, ...defaultSettings });
  assert.equal(s.load, 7);
  assert.equal(s.slack, 3);
  assert.equal(s.minutesLeft, 720 - 180 - 90);
  assert.equal(s.steps.length, 1);
});

test('dayStats: 안전선 초과와 예산 초과, 시간 초과를 구분', () => {
  const steps = [step({ id: 's1', load: 5, minutes: 60 }), step({ id: 's2', load: 4, minutes: 60, order: 1 }), step({ id: 's3', load: 2, minutes: 60, order: 2 })];
  const pl = ids => ids.map(id => ({ stepId: id, date: '2026-10-01' }));
  const base = { date: '2026-10-01', steps, events: [], ...defaultSettings };
  const safe = dayStats({ ...base, placements: pl(['s1', 's2']) }); // 9 > 8
  assert.equal(safe.overSafe, true);
  assert.equal(safe.overBudget, false);
  const over = dayStats({ ...base, placements: pl(['s1', 's2', 's3']) }); // 11
  assert.equal(over.overBudget, true);
  assert.equal(over.slack, -1);
  const long = dayStats({ ...base, steps: [step({ id: 'L', load: 1, minutes: 780 })], placements: pl(['L']) });
  assert.equal(long.overTime, true);
  assert.equal(long.overSafe, false);
  assert.equal(long.minutesLeft, -60);
});

test('dayStats: 매주 반복 일정은 해당 요일에 들어간다', () => {
  const events = [{ id: 'e1', load: 2, start: '10:00', end: '11:00', repeat: 'weekly', weekday: 2 }];
  assert.equal(dayStats({ date: '2026-09-30', steps: [], placements: [], events, ...defaultSettings }).load, 2); // 수
  assert.equal(dayStats({ date: '2026-10-01', steps: [], placements: [], events, ...defaultSettings }).load, 0);
});
