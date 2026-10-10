const { test } = require('node:test');
const assert = require('node:assert/strict');
const { autoPush, placeSteps, dayStats, weekStart, weekNumbers, addDays, weekdayOf, eventsOnDate, nextWeekday, dateRange, canDropPin, isGoalDone, isEventOver } = require('./placement.js');

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

test('마감이 이미 지난 할 일의 단계는 지남으로 표시하고 오늘 칸에 깐다', () => {
  const goals = [goal('g1', '2026-09-25')];
  const steps = [step({ id: 's1' })];
  const result = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result[0].overdue, true);
  assert.equal(result[0].date, '2026-10-01');
  assert.equal(result[0].exceeded, false);
});

test('지남 단계는 오늘의 부하와 시간으로 센다', () => {
  const goals = [goal('g1', '2026-09-25')];
  const steps = [step({ id: 's1', load: 4, minutes: 90 })];
  const placements = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  const today = dayStats({ date: '2026-10-01', steps, placements, events: [], ...defaultSettings });
  assert.equal(today.load, 4);
  assert.equal(today.steps.length, 1);
  assert.equal(today.minutesLeft, 12 * 60 - 90);
  const tomorrow = dayStats({ date: '2026-10-02', steps, placements, events: [], ...defaultSettings });
  assert.equal(tomorrow.load, 0);
});

test('지남 단계는 들어가는지 따지지 않고 오늘에 깔려 부하를 넘겨도 그대로다', () => {
  const goals = [goal('g1', '2026-09-25')];
  const steps = [step({ id: 'a', order: 0, load: 5 }), step({ id: 'b', order: 1, load: 5 })];
  const r = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.deepEqual(r.map(x => x.date), ['2026-10-01', '2026-10-01']);
  assert.deepEqual(r.map(x => x.overdue), [true, true]);
});

test('지남 단계가 오늘을 차지하면 마감이 안 지난 단계는 그 부하를 피해 다음 날로 간다', () => {
  const goals = [goal('late', '2026-09-25'), goal('ok', '2026-10-10')];
  const steps = [step({ id: 'l', goalId: 'late', load: 5 }), step({ id: 'o', goalId: 'ok', load: 5 })]; // 5 + 5 > 안전선 8
  const r = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-01');
  assert.equal(r[0].overdue, true);
  assert.equal(r[1].date, '2026-10-02');
  assert.equal(r[1].overdue, false);
});

test('마감이 어제까지 지났어도 오늘이 마감이면 지남이 아니다. 어제가 마감이면 지남', () => {
  const today = '2026-10-01';
  const onDeadline = placeSteps({ steps: [step({})], goals: [goal('g1', '2026-10-01')], events: [], today, ...defaultSettings });
  assert.equal(onDeadline[0].overdue, false);
  const yesterday = placeSteps({ steps: [step({})], goals: [goal('g1', '2026-09-30')], events: [], today, ...defaultSettings });
  assert.equal(yesterday[0].overdue, true);
  assert.equal(yesterday[0].date, today);
});

test('고정한 지남 단계는 고정한 날에 두고 지남으로 표시한다', () => {
  const r = placeSteps({ steps: [step({ pinnedDate: '2026-10-04' })], goals: [goal('g1', '2026-09-25')], events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-04');
  assert.equal(r[0].pinned, true);
  assert.equal(r[0].overdue, true);
});

test('지남 단계는 날이 바뀌면 그날(오늘) 칸으로 따라온다', () => {
  const goals = [goal('g1', '2026-09-25')];
  const steps = [step({})];
  assert.equal(placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings })[0].date, '2026-10-01');
  assert.equal(placeSteps({ steps, goals, events: [], today: '2026-10-05', ...defaultSettings })[0].date, '2026-10-05');
});

test('지남 단계는 깔기 방식이 고르게여도 오늘이다', () => {
  const r = placeSteps({ steps: [step({})], goals: [goal('g1', '2026-09-25')], events: [], today: '2026-10-01', ...defaultSettings, placeMode: 'even' });
  assert.equal(r[0].date, '2026-10-01');
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

test('채우기 우선: 들어가는 날 중 가장 이른 날을 고른다 (일정이 있는 뒤쪽 날로 건너뛰지 않는다)', () => {
  const goals = [goal('g1', '2026-10-05')];
  const events = [
    { id: 'e1', title: '알바', load: 2, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-02' },
  ];
  const steps = [step({ id: 's1', load: 2, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings, placeMode: 'fill' });
  assert.equal(result[0].date, '2026-10-01'); // 10/01은 비어 있어도 들어가는 가장 이른 날이다
});

test('채우기 우선: 이른 날이 가득 차서 못 들어가면 그다음 이른 날로 간다 (비어 있는 날을 건너뛰지 않는다)', () => {
  // 10/03은 일정 부하 9라 부하 3을 넣으면 안전선(8) 초과, 10/04는 비어 있다, 10/05는 일정 부하 5 + 3 = 8로 들어간다
  const goals = [goal('g1', '2026-10-06')];
  const events = [
    { id: 'e1', title: '수업', load: 9, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-03' },
    { id: 'e2', title: '알바', load: 5, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-05' },
  ];
  const steps = [step({ id: 's1', load: 3, minutes: 30 })];
  const result = placeSteps({ steps, goals, events, today: '2026-10-03', ...defaultSettings, placeMode: 'fill' });
  assert.equal(result[0].date, '2026-10-04');
});

test('채우기 우선: 같은 할 일의 단계를 옮겨도 남은 단계가 빈 날을 두고 뒤로 밀리지 않는다', () => {
  const goals = [goal('g1', '2026-10-20')];
  const events = [
    { id: 'e1', title: '수업', load: 5, start: '09:00', end: '10:00', repeat: 'none', date: '2026-10-05' },
  ];
  const steps = [
    step({ id: 's1', order: 0, load: 3, minutes: 30 }),
    step({ id: 's2', order: 1, load: 3, minutes: 30, pinnedDate: '2026-10-02' }),
    step({ id: 's3', order: 2, load: 3, minutes: 30 }),
  ];
  const result = placeSteps({ steps, goals, events, today: '2026-10-01', ...defaultSettings, placeMode: 'fill' });
  // 앞 단계(s1)가 깔린 날 이후의 가장 이른 날에 이어서 깔린다. 일정이 있는 10/05로 건너뛰지 않는다
  const s1 = result[0].date, s3 = result[2].date;
  assert.equal(s1, '2026-10-01');
  assert.ok(s3 <= '2026-10-02', `s3=${s3}`);
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

test('완료된 단계는 완료일의 부하와 시간으로 들어가 배치에 영향을 준다', () => {
  const goals = [goal('g1', '2026-10-10')];
  // 오늘 이미 부하 8(안전선)을 완료로 채움 -> 새 단계(3)는 오늘 못 들어가고 다음 날로
  const doneSteps = [{ load: 5, minutes: 60, doneDate: '2026-10-01' }, { load: 3, minutes: 60, doneDate: '2026-10-01' }];
  const steps = [step({ id: 's1' })];
  const result = placeSteps({ steps, doneSteps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(result.length, 1); // 결과에는 완료된 단계가 나오지 않는다
  assert.equal(result[0].date, '2026-10-02');
});

test('완료된 단계: 깔린 날보다 먼저 했으면 완료일에 속하고 깔린 날에서는 빠진다', () => {
  const done = [{ id: 'd1', load: 4, minutes: 90, doneDate: '2026-10-01' }];
  const at = date => dayStats({ date, steps: [], doneSteps: done, placements: [], events: [], ...defaultSettings });
  assert.equal(at('2026-10-01').load, 4);
  assert.equal(at('2026-10-01').minutesLeft, 720 - 90);
  assert.equal(at('2026-10-01').doneSteps.length, 1);
  assert.equal(at('2026-10-05').load, 0); // 원래 깔렸던 날
});

test('doneSteps를 안 넘기면 기존과 같다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const r = placeSteps({ steps: [step({})], goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-01');
});

test('earliestDate(오늘 안 함)가 내일이면 오늘에 깔리지 않는다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const r = placeSteps({ steps: [step({ earliestDate: '2026-10-02' })], goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-02');
});

test('고정된 단계는 그 날짜에 남고 다른 단계 배치에 부하로 반영된다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const steps = [step({ id: 'p', load: 5, pinnedDate: '2026-10-01' }), step({ id: 'a', load: 4, order: 1 })];
  const r = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-01');
  assert.equal(r[0].pinned, true);
  assert.equal(r[1].date, '2026-10-02'); // 5+4=9 > 8
});

test('autoPush: 깔린 날이 어제 이전인 미완료 단계만 오늘부터로 민다', () => {
  const steps = [
    step({ id: 'y', placedDate: '2026-09-30' }),
    step({ id: 't', placedDate: '2026-10-01' }),
    step({ id: 'f', placedDate: '2026-10-02' }),
    step({ id: 'n' }),
    step({ id: 'd', placedDate: '2026-09-01', done: true, doneDate: '2026-09-01' }),
  ];
  const r = autoPush({ steps, today: '2026-10-01' });
  assert.deepEqual(r.pushedIds, ['y']);
  assert.equal(r.steps[0].earliestDate, '2026-10-01');
  assert.equal(r.steps[0].placedDate, undefined);
  assert.equal(r.steps[1], steps[1]);
  assert.equal(r.steps[3], steps[3]);
  assert.equal(r.steps[4], steps[4]);
  assert.equal(steps[0].placedDate, '2026-09-30'); // 원본 그대로
});

test('autoPush: 연말 경계, 이미 있던 earliestDate가 오늘보다 이르면 오늘로, 고정은 풀린다', () => {
  const r = autoPush({ steps: [step({ placedDate: '2026-12-31', earliestDate: '2026-12-31', pinnedDate: '2026-12-31' })], today: '2027-01-01' });
  assert.equal(r.steps[0].earliestDate, '2027-01-01');
  assert.equal('pinnedDate' in r.steps[0], false);
  assert.deepEqual(autoPush({ steps: [], today: '2026-10-01' }), { steps: [], pushedIds: [] });
});

test('autoPush 뒤에 다시 깔면 오늘 이후에 깔린다', () => {
  const goals = [goal('g1', '2026-10-10')];
  const { steps } = autoPush({ steps: [step({ placedDate: '2026-09-30' })], today: '2026-10-01' });
  const r = placeSteps({ steps, goals, events: [], today: '2026-10-01', ...defaultSettings });
  assert.equal(r[0].date, '2026-10-01');
});

const evOn = (ev, from, to) => dateRange(from, to).filter(d => eventsOnDate([ev], d).length > 0);
const rep = (o) => ({ id: 'e', load: 3, start: '09:00', end: '10:00', ...o });

test('매주: 시작일이 있으면 그 이전에는 없고, 시작일이 없는 옛 데이터는 예전처럼 있다', () => {
  // 2026-10-01은 목요일(3)
  const withStart = rep({ repeat: 'weekly', weekday: 0, date: '2026-10-05' });
  assert.deepEqual(evOn(withStart, '2026-09-28', '2026-10-12'), ['2026-10-05', '2026-10-12']);
  const legacy = rep({ repeat: 'weekly', weekday: 0 });
  assert.deepEqual(evOn(legacy, '2026-09-28', '2026-10-06'), ['2026-09-28', '2026-10-05']);
  assert.deepEqual(evOn(rep({ repeat: 'weekly', weekday: 0, date: '2026-10-05', repeatUntil: '2026-10-12' }), '2026-09-28', '2026-10-30'), ['2026-10-05', '2026-10-12']);
});

test('격주: 시작일과 같은 요일에 2주마다. 사이 주와 시작 전에는 없다 (연말 경계 포함)', () => {
  const e = rep({ repeat: 'biweekly', date: '2026-10-01' });
  assert.deepEqual(evOn(e, '2026-09-17', '2026-10-31'), ['2026-10-01', '2026-10-15', '2026-10-29']);
  const y = rep({ repeat: 'biweekly', date: '2026-12-28' });
  assert.deepEqual(evOn(y, '2026-12-21', '2027-01-31'), ['2026-12-28', '2027-01-11', '2027-01-25']);
  assert.deepEqual(evOn(rep({ repeat: 'biweekly', date: '2026-10-01', repeatUntil: '2026-10-15' }), '2026-10-01', '2026-12-01'), ['2026-10-01', '2026-10-15']);
});

test('매월: 시작일의 일에 매달. 그 날이 없는 달은 말일 (31일, 윤년 2월)', () => {
  const m15 = rep({ repeat: 'monthly', date: '2026-10-15' });
  assert.deepEqual(evOn(m15, '2026-09-01', '2027-01-31'), ['2026-10-15', '2026-11-15', '2026-12-15', '2027-01-15']);
  const m31 = rep({ repeat: 'monthly', date: '2026-01-31' });
  assert.deepEqual(evOn(m31, '2026-01-01', '2026-06-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
  assert.deepEqual(evOn(m31, '2028-02-01', '2028-02-29'), ['2028-02-29']); // 윤년
  const m30 = rep({ repeat: 'monthly', date: '2026-04-30' });
  assert.deepEqual(evOn(m30, '2027-02-01', '2027-03-31'), ['2027-02-28', '2027-03-30']);
  assert.deepEqual(evOn(rep({ repeat: 'monthly', date: '2026-10-15', repeatUntil: '2026-11-15' }), '2026-10-01', '2027-01-31'), ['2026-10-15', '2026-11-15']);
});

test('nextWeekday: 오늘 포함, 월말·연말 경계', () => {
  assert.equal(nextWeekday('2026-10-01', 3), '2026-10-01'); // 목 -> 같은 날
  assert.equal(nextWeekday('2026-10-01', 0), '2026-10-05'); // 월
  assert.equal(nextWeekday('2026-12-31', 0), '2027-01-04');
});

test('일정 부하는 반복 종류와 상관없이 그날 부하에 들어간다', () => {
  const stats = dayStats({ date: '2026-10-15', steps: [], placements: [], events: [rep({ repeat: 'biweekly', date: '2026-10-01', load: 4 })], capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4 });
  assert.equal(stats.load, 4);
});

const settings = { capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4 };
test('반복 예외: skipDates의 날만 빠지고 다음 회차는 남는다 (매주·격주·매월)', () => {
  const weekly = rep({ repeat: 'weekly', weekday: 0, date: '2026-10-05', skipDates: ['2026-10-12'] });
  assert.deepEqual(evOn(weekly, '2026-10-01', '2026-10-26'), ['2026-10-05', '2026-10-19', '2026-10-26']);
  const bi = rep({ repeat: 'biweekly', date: '2026-10-01', skipDates: ['2026-10-15'] });
  assert.deepEqual(evOn(bi, '2026-10-01', '2026-11-12'), ['2026-10-01', '2026-10-29', '2026-11-12']);
  const mo = rep({ repeat: 'monthly', date: '2026-01-31', skipDates: ['2026-02-28'] });
  assert.deepEqual(evOn(mo, '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-03-31', '2026-04-30']);
});

test('반복 예외: 빈 목록·없는 목록은 영향 없고, 뺀 날은 그 날 부하에서 빠진다', () => {
  assert.deepEqual(evOn(rep({ repeat: 'weekly', weekday: 0, date: '2026-10-05', skipDates: [] }), '2026-10-01', '2026-10-12'), ['2026-10-05', '2026-10-12']);
  const mk = skip => dayStats({ date: '2026-10-15', steps: [], placements: [], events: [rep({ repeat: 'biweekly', date: '2026-10-01', load: 4, skipDates: skip })], capacity: 10, safeRatio: 0.8, sleepHours: 8, lifeHours: 4 });
  assert.equal(mk([]).load, 4);
  assert.equal(mk(['2026-10-15']).load, 0);
  assert.equal(mk(['2026-10-15']).minutesLeft, 720);
  assert.equal(mk(['2026-10-01']).load, 4); // 다른 날을 뺐으면 그대로
});

test('canDropPin: 같은 날은 조용히 무시, 지난 날은 이유와 함께 불가, 오늘·미래는 가능 (월말·연말 경계)', () => {
  const today = '2026-10-01';
  assert.deepEqual(canDropPin({ fromDate: today, toDate: today, today }), { ok: false, reason: null });
  assert.deepEqual(canDropPin({ fromDate: '2026-10-03', toDate: '2026-10-03', today }), { ok: false, reason: null });
  const past = canDropPin({ fromDate: '2026-10-03', toDate: '2026-09-30', today });
  assert.equal(past.ok, false);
  assert.ok(past.reason.includes('지난'));
  assert.deepEqual(canDropPin({ fromDate: '2026-10-03', toDate: today, today }), { ok: true, reason: null });
  assert.deepEqual(canDropPin({ fromDate: today, toDate: '2026-10-02', today }), { ok: true, reason: null });
  assert.equal(canDropPin({ fromDate: '2026-12-31', toDate: '2026-12-30', today: '2027-01-01' }).ok, false);
  assert.equal(canDropPin({ fromDate: '2026-12-30', toDate: '2027-01-01', today: '2026-12-31' }).ok, true);
});

test('isGoalDone: 단계가 1개 이상이고 전부 완료일 때만 완료', () => {
  assert.equal(isGoalDone([]), false);
  assert.equal(isGoalDone([{ done: true }, { done: false }]), false);
  assert.equal(isGoalDone([{ done: true }, {}]), false);
  assert.equal(isGoalDone([{ done: true }, { done: true }]), true);
});

test('isEventOver: 반복 없는 일정은 날짜가 지났을 때, 오늘은 아직 지난 것이 아니다', () => {
  assert.equal(isEventOver({ repeat: 'none', date: '2026-10-09' }, '2026-10-10'), true);
  assert.equal(isEventOver({ repeat: 'none', date: '2026-10-10' }, '2026-10-10'), false);
  assert.equal(isEventOver({ repeat: 'none', date: '2026-10-11' }, '2026-10-10'), false);
  assert.equal(isEventOver({ date: '2026-10-09' }, '2026-10-10'), true); // repeat 없는 옛 데이터
});

test('isEventOver: 반복 일정은 반복 종료일이 지났을 때만. 종료일이 없으면 끝나지 않는다', () => {
  for (const repeat of ['weekly', 'biweekly', 'monthly']) {
    assert.equal(isEventOver({ repeat, date: '2026-01-01', repeatUntil: '2026-10-09' }, '2026-10-10'), true);
    assert.equal(isEventOver({ repeat, date: '2026-01-01', repeatUntil: '2026-10-10' }, '2026-10-10'), false);
    assert.equal(isEventOver({ repeat, date: '2026-01-01' }, '2026-10-10'), false);
  }
});

test('weekNumbers: 목요일이 속한 해·달 기준의 몇 주차', () => {
  assert.deepEqual(weekNumbers('2026-10-05'), { year: 2026, yearWeek: 41, month: 10, monthWeek: 2 });
  assert.deepEqual(weekNumbers('2026-09-28'), { year: 2026, yearWeek: 40, month: 10, monthWeek: 1 }); // 목요일이 10/1이라 10월 1주차
  assert.deepEqual(weekNumbers('2026-09-21'), { year: 2026, yearWeek: 39, month: 9, monthWeek: 4 });
});

test('weekNumbers: 연말·연초는 목요일의 해를 따른다(ISO 8601과 같다)', () => {
  assert.deepEqual(weekNumbers('2025-12-29'), { year: 2026, yearWeek: 1, month: 1, monthWeek: 1 });
  assert.deepEqual(weekNumbers('2024-12-30'), { year: 2025, yearWeek: 1, month: 1, monthWeek: 1 });
  assert.deepEqual(weekNumbers('2027-01-04'), { year: 2027, yearWeek: 1, month: 1, monthWeek: 1 });
  assert.deepEqual(weekNumbers('2020-12-28'), { year: 2020, yearWeek: 53, month: 12, monthWeek: 5 }); // 53주까지 있는 해
});

test('weekNumbers: 한 달의 주차는 1부터 5까지, 한 해의 주차는 1부터 53까지이고 주마다 하나씩 늘어난다', () => {
  let prev = null;
  for (let d = '2026-01-05'; d < '2027-01-04'; d = addDays(d, 7)) {
    const w = weekNumbers(d);
    assert.ok(w.monthWeek >= 1 && w.monthWeek <= 5, d);
    assert.ok(w.yearWeek >= 1 && w.yearWeek <= 53, d);
    if (prev) assert.equal(w.yearWeek, prev.yearWeek + 1, d);
    prev = w;
  }
});
