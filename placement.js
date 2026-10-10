// 배치 규칙 (SPEC.md 5장). 순수 함수. DOM, localStorage, 현재 시각을 직접 읽지 않는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Placement = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return { y, m, d };
  }

  function dateToUTCms(dateStr) {
    const { y, m, d } = parseDate(dateStr);
    return Date.UTC(y, m - 1, d);
  }

  function formatDate(ms) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(dateStr, n) {
    return formatDate(dateToUTCms(dateStr) + n * 86400000);
  }

  // 0=월 .. 6=일 (Event.weekday와 같은 인코딩)
  function weekdayOf(dateStr) {
    const jsDay = new Date(dateToUTCms(dateStr)).getUTCDay(); // 0=일..6=토
    return (jsDay + 6) % 7;
  }

  function dateRange(startStr, endStr) {
    if (startStr > endStr) return [];
    const dates = [];
    let cur = startStr;
    while (cur <= endStr) {
      dates.push(cur);
      cur = addDays(cur, 1);
    }
    return dates;
  }

  function maxDateStr(...dates) {
    return dates.filter(Boolean).reduce((a, b) => (a > b ? a : b));
  }

  function minutesOf(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function eventDurationMinutes(ev) {
    return Math.max(0, minutesOf(ev.end) - minutesOf(ev.start));
  }

  function daysInMonth(y, m) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  }

  // dateStr 또는 그 뒤에서 처음 오는 weekday(0=월..6=일)인 날
  function nextWeekday(dateStr, weekday) {
    return addDays(dateStr, (weekday - weekdayOf(dateStr) + 7) % 7);
  }

  /**
   * 일정이 그 날에 있는가. 반복은 시작일(ev.date) 이전에는 없고, skipDates에 든 날도 없다. 날짜는 전부 YYYY-MM-DD 문자열로 다룬다.
   * - weekly: ev.weekday 요일마다. 시작일은 선택 (옛 데이터에는 없다 -> 처음부터 있는 것으로 본다)
   * - biweekly: 시작일과 같은 요일, 2주마다
   * - monthly: 시작일의 '일'마다. 그 달에 그 날이 없으면 그 달의 마지막 날 (31일 -> 4월 30일, 2월 28/29일)
   */
  function eventMatchesDate(ev, dateStr) {
    if (ev.repeat === 'none' || !ev.repeat) return ev.date === dateStr;
    if (ev.skipDates && ev.skipDates.includes(dateStr)) return false; // 반복 예외: 이 날만 뺀다
    if (ev.date && dateStr < ev.date) return false;
    if (ev.repeatUntil && dateStr > ev.repeatUntil) return false;
    if (ev.repeat === 'weekly') return weekdayOf(dateStr) === ev.weekday;
    if (ev.repeat === 'biweekly') {
      return Math.round((dateToUTCms(dateStr) - dateToUTCms(ev.date)) / 86400000) % 14 === 0;
    }
    if (ev.repeat === 'monthly') {
      const anchor = parseDate(ev.date);
      const cur = parseDate(dateStr);
      return cur.d === Math.min(anchor.d, daysInMonth(cur.y, cur.m));
    }
    return false;
  }

  function eventsOnDate(events, dateStr) {
    return events.filter(ev => eventMatchesDate(ev, dateStr));
  }

  /**
   * @param {object} input
   * @param {Array} input.steps 미완료 중간 단계 전체 (고정 포함)
   * @param {Array} input.doneSteps 완료된 단계 ({load, minutes, doneDate}). 배치 대상이 아니고 완료일의 부하·시간으로만 센다 (SPEC 6장)
   * @param {Array} input.goals 할 일 목록 ({id, deadline})
   * @param {Array} input.events 일정 목록
   * @param {string} input.today 오늘 날짜 "YYYY-MM-DD"
   * @param {number} input.capacity 하루 예산
   * @param {number} input.safeRatio 안전선 비율 (0~1)
   * @param {number} input.sleepHours 수면 시간
   * @param {number} input.lifeHours 생활 시간
   * @param {string} input.placeMode "fill" | "even"
   * @returns {Array<{stepId:string, date:string, pinned:boolean, exceeded:boolean, overLoad:boolean, overTime:boolean, overdue:boolean}>}
   * overLoad: 초과가 부하(안전선) 때문인지, overTime: 초과가 시간 때문인지. 둘 다 true일 수 있다.
   * overdue: 할 일의 마감이 지났는데 끝내지 못한 단계(지남). 완료하거나 마감을 고칠 때까지 오늘 칸에 따라오고 오늘의 부하·시간으로 센다(고정된 단계는 고정한 날에 둔다).
   */
  function placeSteps({ steps, doneSteps = [], goals, events, today, capacity, safeRatio, sleepHours, lifeHours, placeMode }) {
    const goalById = new Map(goals.map(g => [g.id, g]));
    const safeLimit = capacity * safeRatio;
    const availableMinutes = (24 - sleepHours - lifeHours) * 60;

    const stepLoadLedger = new Map(); // dateStr -> 부하 합
    const stepMinutesLedger = new Map(); // dateStr -> 예상시간 합(분)

    function addToLedger(dateStr, load, minutes) {
      stepLoadLedger.set(dateStr, (stepLoadLedger.get(dateStr) || 0) + load);
      stepMinutesLedger.set(dateStr, (stepMinutesLedger.get(dateStr) || 0) + minutes);
    }

    function dayLoad(dateStr) {
      const eventLoad = eventsOnDate(events, dateStr).reduce((sum, ev) => sum + ev.load, 0);
      return eventLoad + (stepLoadLedger.get(dateStr) || 0);
    }

    function dayMinutesUsed(dateStr) {
      const eventMinutes = eventsOnDate(events, dateStr).reduce((sum, ev) => sum + eventDurationMinutes(ev), 0);
      return eventMinutes + (stepMinutesLedger.get(dateStr) || 0);
    }

    function daySlack(dateStr) {
      return capacity - dayLoad(dateStr);
    }

    function overLoadOnDate(dateStr, step) {
      return dayLoad(dateStr) + step.load > safeLimit;
    }

    function overTimeOnDate(dateStr, step) {
      return availableMinutes - dayMinutesUsed(dateStr) - step.minutes < 0;
    }

    function fitsOnDate(dateStr, step) {
      return !overLoadOnDate(dateStr, step) && !overTimeOnDate(dateStr, step);
    }

    function pickByPlaceMode(candidates, step) {
      if (placeMode === 'even') {
        return candidates.slice().sort((a, b) => {
          const slackDiff = daySlack(b) - daySlack(a);
          if (slackDiff !== 0) return slackDiff;
          return a.localeCompare(b);
        })[0];
      }
      // fill (기본값): 들어가는 날 중 가장 이른 날. 비어 있는 이른 날을 건너뛰고 일정이 있는 먼 날로 가지 않는다
      return candidates.slice().sort((a, b) => a.localeCompare(b))[0];
    }

    function pickOverflowDate(candidates) {
      return candidates.slice().sort((a, b) => {
        const slackDiff = daySlack(b) - daySlack(a);
        if (slackDiff !== 0) return slackDiff;
        return a.localeCompare(b);
      })[0];
    }

    // 완료된 단계는 실제로 한 날에 속한다
    doneSteps.forEach(step => addToLedger(step.doneDate, step.load, step.minutes));

    // 1. 고정된 단계 먼저 반영 (규칙이 옮기지 않는다)
    const pinnedSteps = steps.filter(s => s.pinnedDate);
    const unpinnedSteps = steps.filter(s => !s.pinnedDate);

    const results = new Map();

    pinnedSteps.forEach(step => {
      addToLedger(step.pinnedDate, step.load, step.minutes);
      const pinnedGoal = goalById.get(step.goalId);
      results.set(step.id, { stepId: step.id, date: step.pinnedDate, pinned: true, exceeded: false, overLoad: false, overTime: false, overdue: Boolean(pinnedGoal) && pinnedGoal.deadline < today });
    });

    // 2. 할 일 마감 빠른 순, 같은 할 일 안에서는 순서대로
    const ordered = unpinnedSteps.slice().sort((a, b) => {
      const goalA = goalById.get(a.goalId);
      const goalB = goalById.get(b.goalId);
      if (goalA.deadline !== goalB.deadline) return goalA.deadline.localeCompare(goalB.deadline);
      if (a.goalId !== b.goalId) return a.goalId.localeCompare(b.goalId);
      return a.order - b.order;
    });

    const lastPlacedDateByGoal = new Map();

    ordered.forEach(step => {
      const goal = goalById.get(step.goalId);

      // 7. 마감이 이미 지난 할 일의 단계는 지남으로 표시하고 오늘 칸에 깐다. 들어가는지 따지지 않고 오늘의 부하·시간으로 센다.
      // 마감 빠른 순으로 처리하므로 다른 단계보다 먼저 깔려서, 나머지 단계들이 그 부하를 피해 들어간다
      if (goal.deadline < today) {
        addToLedger(today, step.load, step.minutes);
        lastPlacedDateByGoal.set(step.goalId, today);
        results.set(step.id, { stepId: step.id, date: today, pinned: false, exceeded: false, overLoad: false, overTime: false, overdue: true });
        return;
      }

      // 3. 후보 날짜 = [시작 가능일, 마감일]
      const startDate = maxDateStr(today, lastPlacedDateByGoal.get(step.goalId), step.earliestDate);
      let candidates = dateRange(startDate, goal.deadline);
      if (candidates.length === 0) candidates = [goal.deadline];

      // 4. 들어가는 날
      const fitting = candidates.filter(d => fitsOnDate(d, step));

      let chosenDate;
      let exceeded;
      let overLoad = false;
      let overTime = false;
      if (fitting.length) {
        chosenDate = pickByPlaceMode(fitting, step);
        exceeded = false;
      } else {
        // 6. 들어가는 날이 없으면 여유가 가장 큰 날에 깔고 초과 표시
        chosenDate = pickOverflowDate(candidates);
        exceeded = true;
        overLoad = overLoadOnDate(chosenDate, step);
        overTime = overTimeOnDate(chosenDate, step);
      }

      addToLedger(chosenDate, step.load, step.minutes);
      lastPlacedDateByGoal.set(step.goalId, chosenDate);
      results.set(step.id, { stepId: step.id, date: chosenDate, pinned: false, exceeded, overLoad, overTime, overdue: false });
    });

    return steps.map(s => results.get(s.id));
  }

  // 월요일 시작 주의 첫 날
  function weekStart(dateStr) {
    return addDays(dateStr, -weekdayOf(dateStr));
  }

  /**
   * 카펫에서 단계를 끌어 놓았을 때 고정할 수 있는가 (SPEC 10장 드래그로 옮기기).
   * 같은 날은 아무 일도 없다(reason 없음). 지난 날짜에는 고정할 수 없다. 마감 이후 날은 기존 고정 규칙처럼 막지 않는다.
   * @returns {{ok:boolean, reason:string|null}}
   */
  function canDropPin({ fromDate, toDate, today }) {
    if (toDate === fromDate) return { ok: false, reason: null };
    if (toDate < today) return { ok: false, reason: '지난 날짜에는 고정할 수 없습니다.' };
    return { ok: true, reason: null };
  }

  /**
   * 하루치 집계 (SPEC 4장). placeSteps 결과를 받아 그날의 부하, 여유, 남은 시간을 계산한다.
   * @param {object} input
   * @param {string} input.date "YYYY-MM-DD"
   * @param {Array} input.steps placeSteps에 넣은 단계들
   * @param {Array} input.placements placeSteps 결과
   * @param {Array} input.doneSteps 완료된 단계. doneDate가 그날이면 그날에 속한다
   * @param {Array} input.events 일정 목록
   */
  function dayStats({ date, steps, doneSteps = [], placements, events, capacity, safeRatio, sleepHours, lifeHours }) {
    const stepById = new Map(steps.map(s => [s.id, s]));
    const dayEvents = eventsOnDate(events, date);
    const daySteps = placements
      .filter(p => p.date === date)
      .map(p => ({ step: stepById.get(p.stepId), placement: p }));

    const dayDone = doneSteps.filter(st => st.doneDate === date);

    const eventLoad = dayEvents.reduce((sum, ev) => sum + ev.load, 0);
    const stepLoad = daySteps.reduce((sum, x) => sum + x.step.load, 0) + dayDone.reduce((sum, st) => sum + st.load, 0);
    const load = eventLoad + stepLoad;
    const eventMinutes = dayEvents.reduce((sum, ev) => sum + eventDurationMinutes(ev), 0);
    const stepMinutes = daySteps.reduce((sum, x) => sum + x.step.minutes, 0) + dayDone.reduce((sum, st) => sum + st.minutes, 0);
    const availableMinutes = (24 - sleepHours - lifeHours) * 60;
    const minutesLeft = availableMinutes - eventMinutes - stepMinutes;

    return {
      date,
      events: dayEvents,
      steps: daySteps,
      doneSteps: dayDone,
      load,
      capacity,
      safeLimit: capacity * safeRatio,
      slack: capacity - load,
      minutesLeft,
      availableMinutes,
      overSafe: load > capacity * safeRatio,
      overBudget: load > capacity,
      overTime: minutesLeft < 0,
    };
  }

  /**
   * 앱을 열었을 때: 깔린 날이 오늘보다 이전인데 미완료인 단계는 밀린 것으로 처리한다 (SPEC 5장 밀림).
   * 시작 가능일 = 오늘. 고정된 단계는 고정을 풀고 같이 처리한다.
   * 깔린 날을 모르는 단계(placedDate 없음)와 완료된 단계는 건드리지 않는다.
   * @returns {{steps: object[], pushedIds: string[]}} 원본은 바꾸지 않는다
   */
  function autoPush({ steps, today }) {
    const pushedIds = [];
    const next = steps.map(step => {
      if (step.done || !step.placedDate || step.placedDate >= today) return step;
      pushedIds.push(step.id);
      const { pinnedDate, ...rest } = step;
      return { ...rest, earliestDate: maxDateStr(today, step.earliestDate), placedDate: undefined };
    });
    return { steps: next, pushedIds };
  }

  /**
   * 완료된 할 일인가. 단계가 1개 이상이고 전부 완료일 때만 완료다 (단계가 없는 할 일은 끝난 것으로 보지 않는다)
   * @param {Array} goalSteps 그 할 일에 속한 단계들
   */
  function isGoalDone(goalSteps) {
    return goalSteps.length > 0 && goalSteps.every(s => s.done);
  }

  /**
   * 더 이상 생기지 않는 일정인가. 반복 없는 일정은 날짜가 오늘 이전, 반복 일정은 반복 종료일이 오늘 이전일 때다.
   * 오늘 일어나는 일정은 아직 지난 것이 아니다. 반복 종료일이 없는 반복 일정은 끝나지 않는다
   */
  function isEventOver(ev, today) {
    if (ev.repeat === 'none' || !ev.repeat) return Boolean(ev.date) && ev.date < today;
    return Boolean(ev.repeatUntil) && ev.repeatUntil < today;
  }

  return {
    isGoalDone,
    isEventOver,
    placeSteps,
    autoPush,
    dayStats,
    weekStart,
    canDropPin,
    addDays,
    weekdayOf,
    nextWeekday,
    dateRange,
    eventsOnDate,
    eventDurationMinutes,
  };
});
