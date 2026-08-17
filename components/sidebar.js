// ============================================================
// SIDEBAR — project navigation (desktop sidebar / mobile bottom nav)
// ============================================================

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", href: "dashboard.html" },
  { key: "tasks", label: "Tasks", icon: "📋", href: "tasks.html" },
  { key: "calendar", label: "Calendar", icon: "📅", href: "calendar.html" },
  { key: "notes", label: "Notes", icon: "📝", href: "notes.html" },
  { key: "settings", label: "Settings", icon: "⚙️", href: "settings.html" },
];

function renderSidebar({ activeKey, projectId, projectName }) {
  const target = document.getElementById("sidebar-root");
  if (!target) return;

  const linkHTML = (item) => `
    <a class="sidebar__link ${item.key === activeKey ? "sidebar__link--active" : ""}"
       href="${item.href}?project=${encodeURIComponent(projectId)}">
      <span class="sidebar__icon">${item.icon}</span>
      <span class="sidebar__label">${item.label}</span>
    </a>
  `;

  target.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar__project">
        <span class="sidebar__project-icon">🎯</span>
        <span class="sidebar__project-name"></span>
      </div>
      <nav class="sidebar__nav">
        ${NAV_ITEMS.map(linkHTML).join("")}
      </nav>
      <div class="sidebar__footer">
        <a class="sidebar__link" href="projects.html">
          <span class="sidebar__icon">←</span>
          <span class="sidebar__label">All Projects</span>
        </a>
        <button class="sidebar__link sidebar__link--button" id="logout-btn">
          <span class="sidebar__icon">🚪</span>
          <span class="sidebar__label">Logout</span>
        </button>
      </div>
    </aside>

    <nav class="bottom-nav">
      ${NAV_ITEMS.map(
        (item) => `
        <a class="bottom-nav__link ${item.key === activeKey ? "bottom-nav__link--active" : ""}"
           href="${item.href}?project=${encodeURIComponent(projectId)}">
          <span class="bottom-nav__icon">${item.icon}</span>
          <span class="bottom-nav__label">${item.label}</span>
        </a>`
      ).join("")}
    </nav>
  `;

  target.querySelector(".sidebar__project-name").textContent = projectName || "Project";

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}
