// ============================================================
// DASHBOARD — dashboard.html
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  const projectId = await requireProjectAccess();
  if (!projectId) return;

  try {
    const project = await fetchProject(projectId);
    renderSidebar({ activeKey: "dashboard", projectId, projectName: project.name });
    document.getElementById("project-title").textContent = project.name;
    document.getElementById("user-email").textContent = user.email;

    await Promise.all([renderStats(projectId), renderUpcomingDeadlines(projectId), renderRecentNotes(projectId)]);
  } catch (err) {
    showErrorToast(err, "Không thể tải dashboard");
  }
});

async function fetchProject(projectId) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (error) throw error;
  return data;
}

async function renderStats(projectId) {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, status, deadline")
    .eq("project_id", projectId);
  if (error) throw error;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.deadline && new Date(t.deadline) < now
  ).length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-completed").textContent = completed;
  document.getElementById("stat-overdue").textContent = overdue;
}

async function renderUpcomingDeadlines(projectId) {
  const container = document.getElementById("upcoming-deadlines");
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, deadline, status")
    .eq("project_id", projectId)
    .neq("status", "completed")
    .not("deadline", "is", null)
    .order("deadline", { ascending: true })
    .limit(5);
  if (error) throw error;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `<p class="empty-hint">Không có deadline sắp tới 🎉</p>`;
    return;
  }

  container.innerHTML = tasks
    .map((t) => {
      const status = getDeadlineStatus(t.deadline, t.status);
      return `
        <div class="deadline-row">
          <span class="deadline-dot">${status.emoji}</span>
          <span class="deadline-title"></span>
          <span class="deadline-date">${formatDate(t.deadline)}</span>
        </div>`;
    })
    .join("");

  // Set titles safely (avoid injection) after building the row shells
  container.querySelectorAll(".deadline-title").forEach((el, i) => {
    el.textContent = tasks[i].title;
  });
}

async function renderRecentNotes(projectId) {
  const container = document.getElementById("recent-notes");
  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, content, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(3);
  if (error) throw error;

  if (!notes || notes.length === 0) {
    container.innerHTML = `<p class="empty-hint">Chưa có note nào</p>`;
    return;
  }

  container.innerHTML = notes
    .map(
      () => `
      <div class="note-preview">
        <h4 class="note-preview__title"></h4>
        <p class="note-preview__excerpt"></p>
      </div>`
    )
    .join("");

  container.querySelectorAll(".note-preview").forEach((el, i) => {
    el.querySelector(".note-preview__title").textContent = notes[i].title;
    el.querySelector(".note-preview__excerpt").textContent = (notes[i].content || "").slice(0, 100);
  });
}
