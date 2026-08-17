// ============================================================
// SETTINGS — settings.html
// ============================================================

let projectId = null;
let currentProject = null;
let isOwner = false;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  projectId = await requireProjectAccess();
  if (!projectId) return;

  try {
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    currentProject = project;

    renderSidebar({ activeKey: "settings", projectId, projectName: project.name });
    document.getElementById("project-title").textContent = project.name;

    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();
    isOwner = membership && membership.role === "owner";

    populateForm(project);
    toggleOwnerOnlyUI(isOwner);
  } catch (err) {
    showErrorToast(err, "Không thể tải project");
  }

  document.getElementById("info-form").addEventListener("submit", saveProjectInfo);
  document.getElementById("password-form").addEventListener("submit", changePassword);
  document.getElementById("delete-project-btn").addEventListener("click", deleteProject);
});

function populateForm(project) {
  document.getElementById("settings-name").value = project.name;
  document.getElementById("settings-description").value = project.description || "";
}

function toggleOwnerOnlyUI(owner) {
  document.querySelectorAll("[data-owner-only]").forEach((el) => {
    el.style.display = owner ? "" : "none";
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON") {
      el.disabled = !owner;
    }
  });
  if (!owner) {
    document.getElementById("member-notice").style.display = "block";
  }
}

async function saveProjectInfo(e) {
  e.preventDefault();
  if (!isOwner) return;

  const submitBtn = document.getElementById("info-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  const name = document.getElementById("settings-name").value.trim();
  const description = document.getElementById("settings-description").value.trim();

  try {
    const { error } = await supabase.from("projects").update({ name, description }).eq("id", projectId);
    if (error) throw error;
    showToast("Đã cập nhật project", "success");
    document.getElementById("project-title").textContent = name;
  } catch (err) {
    showErrorToast(err, "Không thể cập nhật project");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save changes";
  }
}

async function changePassword(e) {
  e.preventDefault();
  if (!isOwner) return;

  const submitBtn = document.getElementById("password-submit");
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword.length < 4) {
    showToast("Mật khẩu phải có ít nhất 4 ký tự", "warning");
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast("Mật khẩu xác nhận không khớp", "warning");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating...";

  try {
    const { error } = await supabase.rpc("change_project_password", {
      p_project_id: projectId,
      p_new_password: newPassword,
    });
    if (error) throw error;
    showToast("Đã đổi mật khẩu project", "success");
    document.getElementById("password-form").reset();
  } catch (err) {
    showErrorToast(err, "Không thể đổi mật khẩu");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Change password";
  }
}

async function deleteProject() {
  if (!isOwner) return;

  const confirmed = await confirmModal({
    title: "Xóa project",
    message: `Xóa vĩnh viễn "${currentProject.name}" cùng toàn bộ tasks và notes? Hành động này không thể hoàn tác.`,
    confirmLabel: "Xóa project",
    danger: true,
  });
  if (!confirmed) return;

  try {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) throw error;
    sessionStorage.removeItem(`project_unlock_${projectId}`);
    showToast("Đã xóa project", "success");
    window.location.href = "projects.html";
  } catch (err) {
    showErrorToast(err, "Không thể xóa project");
  }
}
