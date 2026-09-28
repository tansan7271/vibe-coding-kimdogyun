const STORAGE_KEY = "autoplan.tasks.v1";

const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskDeadlineDateInput = document.getElementById("taskDeadlineDate");
const taskDeadlineTimeInput = document.getElementById("taskDeadlineTime");
const taskDurationInput = document.getElementById("taskDuration");
const taskPriorityInput = document.getElementById("taskPriority");

const taskListEl = document.getElementById("taskList");
const emptyTasksMsg = document.getElementById("emptyTasksMsg");

const workStartInput = document.getElementById("workStart");
const workEndInput = document.getElementById("workEnd");
const includeWeekendInput = document.getElementById("includeWeekend");

const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const scheduleOutput = document.getElementById("scheduleOutput");

let tasks = loadTasks();

taskDeadlineDateInput.valueAsDate = new Date();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function priorityLabel(p) {
  return { 1: "낮음", 2: "보통", 3: "높음" }[p] || "보통";
}

function renderTasks() {
  taskListEl.innerHTML = "";
  emptyTasksMsg.style.display = tasks.length ? "none" : "block";

  tasks
    .slice()
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";

      const deadlineDate = new Date(task.deadline);
      const deadlineStr = deadlineDate.toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML = `
        <div class="task-info">
          <strong>${escapeHtml(task.title)}
            <span class="priority-badge priority-${task.priority}">${priorityLabel(task.priority)}</span>
          </strong>
          <span>마감: ${deadlineStr} · 예상 ${task.duration}시간</span>
        </div>
        <button class="delete-btn" data-id="${task.id}">삭제</button>
      `;

      taskListEl.appendChild(li);
    });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

taskListEl.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
});

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const date = taskDeadlineDateInput.value;
  const time = taskDeadlineTimeInput.value || "18:00";
  const duration = parseFloat(taskDurationInput.value);
  const priority = parseInt(taskPriorityInput.value, 10);

  if (!title || !date || !duration || duration <= 0) return;

  const deadline = new Date(`${date}T${time}`);

  tasks.push({
    id: crypto.randomUUID(),
    title,
    deadline: deadline.toISOString(),
    duration,
    priority,
  });

  saveTasks();
  renderTasks();
  taskForm.reset();
  taskDeadlineDateInput.valueAsDate = new Date();
  taskDeadlineTimeInput.value = "18:00";
  taskDurationInput.value = 1;
  taskPriorityInput.value = 2;
  taskTitleInput.focus();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("모든 할 일과 일정을 삭제할까요?")) return;
  tasks = [];
  saveTasks();
  renderTasks();
  scheduleOutput.innerHTML = `<p class="schedule-empty">일정을 생성하면 여기에 표시됩니다.</p>`;
});

generateBtn.addEventListener("click", () => {
  const schedule = buildSchedule(tasks, {
    workStart: workStartInput.value || "09:00",
    workEnd: workEndInput.value || "22:00",
    includeWeekend: includeWeekendInput.checked,
  });
  renderSchedule(schedule);
});

/**
 * Greedy earliest-deadline-first scheduler.
 * Tasks are sorted by deadline (then priority, then shorter duration first),
 * and each task's remaining duration is packed into the earliest free
 * work-hour slots before its deadline. If a task cannot fully fit before
 * its deadline, the unplaced remainder is flagged as overdue risk.
 */
function buildSchedule(taskInput, { workStart, workEnd, includeWeekend }) {
  const [startH, startM] = workStart.split(":").map(Number);
  const [endH, endM] = workEnd.split(":").map(Number);
  const dailyMinutes = (endH * 60 + endM) - (startH * 60 + startM);

  if (dailyMinutes <= 0) {
    return { days: [], overdue: [], error: "종료 시간이 시작 시간보다 늦어야 합니다." };
  }

  const sorted = taskInput
    .slice()
    .sort((a, b) => {
      const dl = new Date(a.deadline) - new Date(b.deadline);
      if (dl !== 0) return dl;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.duration - b.duration;
    });

  const now = new Date();
  const dayCursors = new Map(); // dateKey -> minutes already used
  const days = []; // ordered list of dateKeys we've touched
  const overdue = [];

  function isWorkDay(d) {
    const day = d.getDay();
    if (includeWeekend) return true;
    return day !== 0 && day !== 6;
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function nextWorkDay(d) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + 1);
    nd.setHours(0, 0, 0, 0);
    while (!isWorkDay(nd)) {
      nd.setDate(nd.getDate() + 1);
    }
    return nd;
  }

  // cursor: { date: Date at midnight, usedMinutes }
  let cursorDate = new Date(now);
  cursorDate.setHours(0, 0, 0, 0);
  if (!isWorkDay(cursorDate)) cursorDate = nextWorkDay(cursorDate);

  let usedMinutesToday = (() => {
    const workStartToday = new Date(cursorDate);
    workStartToday.setHours(startH, startM, 0, 0);
    if (now > workStartToday) {
      const diff = Math.min(dailyMinutes, Math.round((now - workStartToday) / 60000));
      return Math.max(0, diff);
    }
    return 0;
  })();

  const daySlots = new Map(); // dateKey -> [{title, priority, startMin, endMin}]

  function ensureDay(key) {
    if (!daySlots.has(key)) {
      daySlots.set(key, []);
      days.push(key);
    }
  }

  for (const task of sorted) {
    let remaining = Math.round(task.duration * 60); // minutes
    const deadline = new Date(task.deadline);

    while (remaining > 0) {
      if (usedMinutesToday >= dailyMinutes) {
        cursorDate = nextWorkDay(cursorDate);
        usedMinutesToday = 0;
      }

      const key = dateKey(cursorDate);
      const workStartToday = new Date(cursorDate);
      workStartToday.setHours(startH, startM, 0, 0);
      const slotStartMin = usedMinutesToday;
      const availableToday = dailyMinutes - usedMinutesToday;

      // Check deadline: does this day's slot start after the deadline?
      const slotStartTime = new Date(workStartToday.getTime() + slotStartMin * 60000);
      if (slotStartTime >= deadline) {
        overdue.push({
          ...task,
          unplacedMinutes: remaining,
          alreadyPassed: deadline <= now,
        });
        remaining = 0;
        break;
      }

      const allocate = Math.min(remaining, availableToday);
      const slotEndMin = slotStartMin + allocate;

      ensureDay(key);
      daySlots.get(key).push({
        title: task.title,
        priority: task.priority,
        startMin: slotStartMin,
        endMin: slotEndMin,
      });

      usedMinutesToday += allocate;
      remaining -= allocate;

      if (remaining > 0) {
        cursorDate = nextWorkDay(cursorDate);
        usedMinutesToday = 0;
      }
    }
  }

  const formattedDays = days.map((key) => {
    const slots = daySlots.get(key).map((s) => ({
      ...s,
      startLabel: minutesToLabel(startH, startM, s.startMin),
      endLabel: minutesToLabel(startH, startM, s.endMin),
    }));
    return { key, label: formatDayLabel(key), slots };
  });

  return { days: formattedDays, overdue };
}

function minutesToLabel(baseH, baseM, offsetMin) {
  const total = baseH * 60 + baseM + offsetMin;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDayLabel(key) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function renderSchedule({ days, overdue, error }) {
  scheduleOutput.innerHTML = "";

  if (error) {
    scheduleOutput.innerHTML = `<p class="overdue-notice">${error}</p>`;
    return;
  }

  if (!days.length && !overdue.length) {
    scheduleOutput.innerHTML = `<p class="schedule-empty">할 일을 추가하고 '일정 자동 생성'을 눌러보세요.</p>`;
    return;
  }

  days.forEach((day) => {
    const block = document.createElement("div");
    block.className = "day-block";
    block.innerHTML = `<h3>${day.label}</h3>`;

    day.slots
      .sort((a, b) => a.startMin - b.startMin)
      .forEach((slot) => {
        const div = document.createElement("div");
        div.className = "slot";
        div.innerHTML = `
          <span>${escapeHtml(slot.title)} <span class="priority-badge priority-${slot.priority}">${priorityLabel(slot.priority)}</span></span>
          <span class="time">${slot.startLabel} - ${slot.endLabel}</span>
        `;
        block.appendChild(div);
      });

    scheduleOutput.appendChild(block);
  });

  if (overdue.length) {
    const notice = document.createElement("div");
    notice.className = "day-block";
    notice.innerHTML = `<h3 class="overdue-notice">⚠️ 마감 전에 다 끝내기 어려운 일</h3>`;
    overdue.forEach((task) => {
      const div = document.createElement("div");
      div.className = "slot overdue";
      const deadlineStr = new Date(task.deadline).toLocaleString("ko-KR", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const statusLabel = task.alreadyPassed
        ? `마감(${deadlineStr})이 이미 지났어요`
        : `마감(${deadlineStr})까지 ${(task.unplacedMinutes / 60).toFixed(2)}시간 부족`;
      div.innerHTML = `
        <span>${escapeHtml(task.title)}</span>
        <span class="time">${statusLabel}</span>
      `;
      notice.appendChild(div);
    });
    scheduleOutput.appendChild(notice);
  }
}

renderTasks();
scheduleOutput.innerHTML = `<p class="schedule-empty">할 일을 추가하고 '일정 자동 생성'을 눌러보세요.</p>`;
