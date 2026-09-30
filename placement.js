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

  function eventMatchesDate(ev, dateStr) {
    if (ev.repeat === 'weekly') {
      if (weekdayOf(dateStr) !== ev.weekday) return false;
      if (ev.repeatUntil && dateStr > ev.repeatUntil) return false;
      return true;
    }
    return ev.date === dateStr;
  }

  function eventsOnDate(events, dateStr) {
    return events.filter(ev => eventMatchesDate(ev, dateStr));
  }

  /**
   * @param {object} input
   * @param {Array} input.steps 미완료 중간 단계 전체 (고정 포함)
   * @param {Array} input.goals 할 일 목록 ({id, deadline})
   * @param {Array} input.events 일정 목록
   * @param {string} input.today 오늘 날짜 "YYYY-MM-DD"
   * @param {number} input.capacity 하루 예산
   * @param {number} input.safeRatio 안전선 비율 (0~1)
   * @param {number} input.sleepHours 수면 시간
   * @param {number} input.lifeHours 생활 시간
   * @param {string} input.placeMode "fill" | "even"
   * @returns {Array<{stepId:string, date:string|null, pinned:boolean, exceeded:boolean, overdue:boolean}>}
   */
  function placeSteps({ steps, goals, events, today, capacity, safeRatio, sleepHours, lifeHours, placeMode }) {
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

    function fitsOnDate(dateStr, step) {
      const loadOk = dayLoad(dateStr) + step.load <= safeLimit;
      const timeOk = availableMinutes - dayMinutesUsed(dateStr) - step.minutes >= 0;
      return loadOk && timeOk;
    }

    function pickByPlaceMode(candidates, step) {
      if (placeMode === 'even') {
        return candidates.slice().sort((a, b) => {
          const slackDiff = daySlack(b) - daySlack(a);
          if (slackDiff !== 0) return slackDiff;
          return a.localeCompare(b);
        })[0];
      }
      // fill (기본값)
      const withLoad = candidates.filter(d => dayLoad(d) > 0).sort((a, b) => a.localeCompare(b));
      if (withLoad.length) return withLoad[0];
      return candidates.slice().sort((a, b) => a.localeCompare(b))[0];
    }

    function pickOverflowDate(candidates) {
      return candidates.slice().sort((a, b) => {
        const slackDiff = daySlack(b) - daySlack(a);
        if (slackDiff !== 0) return slackDiff;
        return a.localeCompare(b);
      })[0];
    }

    // 1. 고정된 단계 먼저 반영 (규칙이 옮기지 않는다)
    const pinnedSteps = steps.filter(s => s.pinnedDate);
    const unpinnedSteps = steps.filter(s => !s.pinnedDate);

    const results = new Map();

    pinnedSteps.forEach(step => {
      addToLedger(step.pinnedDate, step.load, step.minutes);
      results.set(step.id, { stepId: step.id, date: step.pinnedDate, pinned: true, exceeded: false, overdue: false });
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

      // 7. 마감이 이미 지난 할 일의 단계는 지남으로 표시하고 깔지 않는다
      if (goal.deadline < today) {
        results.set(step.id, { stepId: step.id, date: null, pinned: false, exceeded: false, overdue: true });
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
      if (fitting.length) {
        chosenDate = pickByPlaceMode(fitting, step);
        exceeded = false;
      } else {
        // 6. 들어가는 날이 없으면 여유가 가장 큰 날에 깔고 초과 표시
        chosenDate = pickOverflowDate(candidates);
        exceeded = true;
      }

      addToLedger(chosenDate, step.load, step.minutes);
      lastPlacedDateByGoal.set(step.goalId, chosenDate);
      results.set(step.id, { stepId: step.id, date: chosenDate, pinned: false, exceeded, overdue: false });
    });

    return steps.map(s => results.get(s.id));
  }

  return {
    placeSteps,
    addDays,
    weekdayOf,
    dateRange,
    eventsOnDate,
    eventDurationMinutes,
  };
});
