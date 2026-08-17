// ============================================================
// GUARD — must run before any page content is usable
// 1. Redirect to login.html if not authenticated
// 2. For project pages, redirect to projects.html if the project
//    hasn't been unlocked with its password in this browser session
// ============================================================

const PROJECT_PAGES = ["dashboard.html", "tasks.html", "calendar.html", "notes.html", "settings.html"];

/**
 * Call this at the top of every protected page.
 * Returns the current session's user, or redirects and returns null.
 */
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  // React to logout happening in another tab
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") window.location.href = "login.html";
  });

  return session.user;
}

/**
 * Call this at the top of every project-scoped page (dashboard, tasks, calendar, notes, settings).
 * Confirms the project id is present, valid, and unlocked for this session.
 * Returns the project id, or redirects and returns null.
 */
async function requireProjectAccess() {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");

  if (!projectId) {
    window.location.href = "projects.html";
    return null;
  }

  const unlocked = sessionStorage.getItem(`project_unlock_${projectId}`);
  if (unlocked !== "true") {
    showToast("Project chưa được mở khóa", "warning");
    window.location.href = "projects.html";
    return null;
  }

  return projectId;
}

function markProjectUnlocked(projectId) {
  sessionStorage.setItem(`project_unlock_${projectId}`, "true");
  sessionStorage.setItem("current_project_id", projectId);
}
