// ============================================================
// CALENDAR — calendar.html
// ============================================================

let projectId = null;
let calendarTasks = [];
let viewDate = new Date(); // month currently displayed

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  projectId = await requireProjectAccess();
  if (!projectId) return;

  try {
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    renderSidebar({ activeKey: "calendar", projectId, projectName: project.name });
    document.getElementById("project-title").textContent = project.name;
  } catch (err) {
    showErrorToast(err, "Không thể tải project");
  }

  await loadCalendarTasks();
  renderCalendar();

  document.getElementById("cal-prev").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("cal-next").addEventListener("click", () => shiftMonth(1));
  document.getElementById("cal-today").addEventListener("click", () => {
    viewDate = new Date();
    renderCalendar();
  });
});

async function loadCalendarTasks() {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, deadline, status, priority")
      .eq("project_id", projectId)
      .not("deadline", "is", null);
    if (error) throw error;
    calendarTasks = data || [];
  } catch (err) {
    showErrorToast(err, "Không thể tải deadline");
  }
}

function shiftMonth(delta) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("calendar-month-label");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  label.textContent = viewDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const firstOfMonth = new Date(year, month, 1);
  // Monday-first grid: convert Sunday(0)->6, Monday(1)->0, etc.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  grid.innerHTML = "";

  for (let i = 0; i < startOffset; i++) {
    const filler = document.createElement("div");
    filler.className = "calendar-cell calendar-cell--empty";
    grid.appendChild(filler);
  }

  const todayStr = new Date().toDateString();

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const dayTasks = calendarTasks.filter((t) => sameDay(new Date(t.deadline), cellDate));

    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (cellDate.toDateString() === todayStr) cell.classList.add("calendar-cell--today");

    cell.innerHTML = `
      <span class="calendar-cell__day">${day}</span>
      <div class="calendar-cell__dots"></div>
    `;

    const dotsEl = cell.querySelector(".calendar-cell__dots");
    dayTasks.slice(0, 3).forEach((t) => {
      const status = getDeadlineStatus(t.deadline, t.status);
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      dot.textContent = status.emoji;
      dotsEl.appendChild(dot);
    });
    if (dayTasks.length > 3) {
      const more = document.createElement("span");
      more.className = "calendar-dot calendar-dot--more";
      more.textContent = `+${dayTasks.length - 3}`;
      dotsEl.appendChild(more);
    }

    cell.addEventListener("click", () => openDayModal(cellDate, dayTasks));
    grid.appendChild(cell);
  }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function openDayModal(date, dayTasks) {
  const dateLabel = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const overlay = openModal(`
    <h3 class="modal-title">${dateLabel}</h3>
    <div class="day-modal-list">
      ${
        dayTasks.length === 0
          ? `<p class="empty-hint">Không có task nào</p>`
          : dayTasks
              .map((t) => {
                const status = getDeadlineStatus(t.deadline, t.status);
                return `<div class="day-modal-item"><span>${status.emoji}</span><span class="day-modal-item__title"></span></div>`;
              })
              .join("")
      }
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn--ghost" data-action="cancel">Đóng</button>
      <button type="button" class="btn btn--primary" id="day-add-task">+ Add Task</button>
    </div>
  `);

  overlay.querySelectorAll(".day-modal-item__title").forEach((el, i) => {
    el.textContent = dayTasks[i].title;
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);
  overlay.querySelector("#day-add-task").addEventListener("click", () => {
    closeModal();
    window.location.href = `tasks.html?project=${projectId}`;
  });
}
