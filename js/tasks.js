// ============================================================
// TASKS — tasks.html
// ============================================================

let projectId = null;
let allTasks = [];
let currentFilters = { search: "", status: "all", priority: "all", sort: "deadline_asc" };

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  projectId = await requireProjectAccess();
  if (!projectId) return;

  try {
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    renderSidebar({ activeKey: "tasks", projectId, projectName: project.name });
    document.getElementById("project-title").textContent = project.name;
  } catch (err) {
    showErrorToast(err, "Không thể tải project");
  }

  await loadTasks();
  bindToolbar();

  document.getElementById("add-task-btn").addEventListener("click", () => openTaskForm());
});

function bindToolbar() {
  document.getElementById("search-input").addEventListener(
    "input",
    debounce((e) => {
      currentFilters.search = e.target.value.trim().toLowerCase();
      renderTasks();
    }, 250)
  );

  document.getElementById("filter-status").addEventListener("change", (e) => {
    currentFilters.status = e.target.value;
    renderTasks();
  });

  document.getElementById("filter-priority").addEventListener("change", (e) => {
    currentFilters.priority = e.target.value;
    renderTasks();
  });

  document.getElementById("sort-select").addEventListener("change", (e) => {
    currentFilters.sort = e.target.value;
    renderTasks();
  });
}

async function loadTasks() {
  const listEl = document.getElementById("tasks-list");
  listEl.innerHTML = `<div class="loading-state">Đang tải tasks...</div>`;
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("deadline", { ascending: true });
    if (error) throw error;
    allTasks = data || [];
    renderTasks();
  } catch (err) {
    listEl.innerHTML = "";
    showErrorToast(err, "Không thể tải tasks");
  }
}

function renderTasks() {
  const listEl = document.getElementById("tasks-list");
  const emptyEl = document.getElementById("tasks-empty");

  let filtered = allTasks.filter((t) => {
    if (currentFilters.search && !t.title.toLowerCase().includes(currentFilters.search)) return false;
    if (currentFilters.status !== "all" && t.status !== currentFilters.status) return false;
    if (currentFilters.priority !== "all" && t.priority !== currentFilters.priority) return false;
    return true;
  });

  filtered = sortTasks(filtered, currentFilters.sort);

  listEl.innerHTML = "";
  if (filtered.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  for (const task of filtered) {
    listEl.appendChild(renderTaskRow(task));
  }
}

function sortTasks(tasks, sort) {
  const copy = [...tasks];
  const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
  switch (sort) {
    case "deadline_asc":
      return copy.sort((a, b) => new Date(a.deadline || 8640000000000000) - new Date(b.deadline || 8640000000000000));
    case "deadline_desc":
      return copy.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
    case "priority":
      return copy.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    default:
      return copy;
  }
}

function renderTaskRow(task) {
  const status = getDeadlineStatus(task.deadline, task.status);
  const row = document.createElement("div");
  row.className = "task-row";
  row.innerHTML = `
    <label class="task-row__checkbox">
      <input type="checkbox" ${task.status === "completed" ? "checked" : ""} />
    </label>
    <div class="task-row__main">
      <div class="task-row__title-line">
        <span class="task-row__status-dot">${status.emoji}</span>
        <span class="task-row__title"></span>
        <span class="badge badge--priority-${task.priority}"></span>
      </div>
      <div class="task-row__meta">
        <span class="task-row__deadline">${task.deadline ? formatDateTime(task.deadline) : "Không có deadline"}</span>
        <span class="task-row__status-label">${STATUS_LABELS[task.status]}</span>
      </div>
    </div>
    <div class="task-row__actions">
      <button class="icon-btn" data-action="edit" title="Sửa">✏️</button>
      <button class="icon-btn" data-action="delete" title="Xóa">🗑️</button>
    </div>
  `;

  row.querySelector(".task-row__title").textContent = task.title;
  row.querySelector(".badge").textContent = PRIORITY_LABELS[task.priority];

  row.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
    toggleTaskComplete(task, e.target.checked);
  });
  row.querySelector('[data-action="edit"]').addEventListener("click", () => openTaskForm(task));
  row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTask(task));

  return row;
}

async function toggleTaskComplete(task, checked) {
  const newStatus = checked ? "completed" : "todo";
  try {
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (error) throw error;
    task.status = newStatus;
    renderTasks();
    showToast(checked ? "Đã hoàn thành task" : "Đã bỏ đánh dấu hoàn thành", "success");
  } catch (err) {
    showErrorToast(err, "Không thể cập nhật task");
  }
}

async function deleteTask(task) {
  const confirmed = await confirmModal({
    title: "Xóa task",
    message: `Xóa task "${task.title}"? Hành động này không thể hoàn tác.`,
    confirmLabel: "Xóa",
    danger: true,
  });
  if (!confirmed) return;

  try {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) throw error;
    allTasks = allTasks.filter((t) => t.id !== task.id);
    renderTasks();
    showToast("Đã xóa task", "success");
  } catch (err) {
    showErrorToast(err, "Không thể xóa task");
  }
}

// ------------------------------------------------------------
// CREATE / EDIT FORM
// ------------------------------------------------------------
function openTaskForm(task = null) {
  const isEdit = Boolean(task);
  const overlay = openModal(`
    <h3 class="modal-title">${isEdit ? "Sửa task" : "+ Thêm task"}</h3>
    <form id="task-form" class="modal-form">
      <label>Tên task</label>
      <input type="text" id="task-title" required maxlength="120" placeholder="VD: Nộp báo cáo thực tập" />

      <label>Mô tả</label>
      <textarea id="task-description" rows="3" placeholder="Chi tiết task (tùy chọn)"></textarea>

      <label>Deadline</label>
      <input type="datetime-local" id="task-deadline" />

      <div class="form-row">
        <div>
          <label>Priority</label>
          <select id="task-priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select id="task-status">
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-action="cancel">Cancel</button>
        <button type="submit" class="btn btn--primary" id="task-submit">Save</button>
      </div>
    </form>
  `);

  if (isEdit) {
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-deadline").value = toDateTimeLocalValue(task.deadline);
    document.getElementById("task-priority").value = task.priority;
    document.getElementById("task-status").value = task.status;
  } else {
    document.getElementById("task-priority").value = "medium";
    document.getElementById("task-status").value = "todo";
  }

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);

  overlay.querySelector("#task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("task-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const payload = {
      title: document.getElementById("task-title").value.trim(),
      description: document.getElementById("task-description").value.trim(),
      deadline: document.getElementById("task-deadline").value
        ? new Date(document.getElementById("task-deadline").value).toISOString()
        : null,
      priority: document.getElementById("task-priority").value,
      status: document.getElementById("task-status").value,
    };

    try {
      if (isEdit) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task.id);
        if (error) throw error;
        showToast("Đã cập nhật task", "success");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("tasks")
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
        showToast("Đã thêm task", "success");
      }
      closeModal();
      await loadTasks();
    } catch (err) {
      showErrorToast(err, "Không thể lưu task");
      submitBtn.disabled = false;
      submitBtn.textContent = "Save";
    }
  });
}
