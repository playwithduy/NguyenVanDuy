// ============================================================
// PROJECTS — projects.html
// ============================================================

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.getElementById("user-email").textContent = currentUser.email;

  await loadProjects();

  document.getElementById("create-project-btn").addEventListener("click", openCreateProjectModal);
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
});

async function loadProjects() {
  const listEl = document.getElementById("projects-list");
  const emptyEl = document.getElementById("projects-empty");
  listEl.innerHTML = `<div class="loading-state">Đang tải projects...</div>`;

  try {
    // RLS guarantees this only returns projects the current user is a member of
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    listEl.innerHTML = "";

    if (!projects || projects.length === 0) {
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    for (const project of projects) {
      listEl.appendChild(renderProjectCard(project));
    }
  } catch (err) {
    listEl.innerHTML = "";
    showErrorToast(err, "Không thể tải danh sách project");
  }
}

function renderProjectCard(project) {
  const card = document.createElement("div");
  card.className = "project-card";
  card.innerHTML = `
    <div class="project-card__body">
      <h3 class="project-card__name"></h3>
      <p class="project-card__desc"></p>
      <span class="project-card__badge">🔐 Protected</span>
    </div>
    <button class="btn btn--primary project-card__open">Mở Project</button>
  `;
  card.querySelector(".project-card__name").textContent = project.name;
  card.querySelector(".project-card__desc").textContent = project.description || "";
  card.querySelector(".project-card__open").addEventListener("click", () => openUnlockModal(project));
  return card;
}

// ------------------------------------------------------------
// CREATE PROJECT
// ------------------------------------------------------------
function openCreateProjectModal() {
  const overlay = openModal(`
    <h3 class="modal-title">+ Tạo Project mới</h3>
    <form id="create-project-form" class="modal-form">
      <label>Tên project</label>
      <input type="text" id="new-project-name" required maxlength="80" placeholder="VD: Đồ án tốt nghiệp" />

      <label>Mô tả</label>
      <textarea id="new-project-desc" rows="3" placeholder="Mô tả ngắn gọn về project"></textarea>

      <label>Mật khẩu Project (tối thiểu 4 ký tự)</label>
      <input type="password" id="new-project-password" required minlength="4" placeholder="Mật khẩu riêng cho project" />

      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-action="cancel">Hủy</button>
        <button type="submit" class="btn btn--primary" id="create-project-submit">Tạo Project</button>
      </div>
    </form>
  `);

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);

  overlay.querySelector("#create-project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("new-project-name").value.trim();
    const description = document.getElementById("new-project-desc").value.trim();
    const password = document.getElementById("new-project-password").value;
    const submitBtn = document.getElementById("create-project-submit");

    submitBtn.disabled = true;
    submitBtn.textContent = "Đang tạo...";

    try {
      const { error } = await supabase.rpc("create_project", {
        p_name: name,
        p_description: description,
        p_password: password,
      });
      if (error) throw error;

      showToast("Tạo project thành công", "success");
      closeModal();
      await loadProjects();
    } catch (err) {
      showErrorToast(err, "Không thể tạo project");
      submitBtn.disabled = false;
      submitBtn.textContent = "Tạo Project";
    }
  });
}

// ------------------------------------------------------------
// UNLOCK PROJECT (password check via secure RPC)
// ------------------------------------------------------------
function openUnlockModal(project) {
  const overlay = openModal(`
    <h3 class="modal-title">🔐 Project Protected</h3>
    <p class="modal-message">Project này yêu cầu mật khẩu</p>
    <form id="unlock-form" class="modal-form">
      <label>Password</label>
      <input type="password" id="unlock-password" required autofocus placeholder="Nhập mật khẩu project" />
      <p class="form-error" id="unlock-error"></p>
      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-action="cancel">Hủy</button>
        <button type="submit" class="btn btn--primary" id="unlock-submit">Xác nhận</button>
      </div>
    </form>
  `);

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);

  overlay.querySelector("#unlock-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("unlock-password").value;
    const errorEl = document.getElementById("unlock-error");
    const submitBtn = document.getElementById("unlock-submit");

    errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang kiểm tra...";

    try {
      const { data: isValid, error } = await supabase.rpc("verify_project_password", {
        p_project_id: project.id,
        p_password: password,
      });
      if (error) throw error;

      if (!isValid) {
        errorEl.textContent = "❌ Mật khẩu không chính xác";
        submitBtn.disabled = false;
        submitBtn.textContent = "Xác nhận";
        return;
      }

      markProjectUnlocked(project.id);
      closeModal();
      window.location.href = `dashboard.html?project=${project.id}`;
    } catch (err) {
      showErrorToast(err, "Không thể kiểm tra mật khẩu");
      submitBtn.disabled = false;
      submitBtn.textContent = "Xác nhận";
    }
  });
}
