// ============================================================
// AUTH — Supabase Auth login handling (login.html)
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // If already logged in, skip straight to the projects page
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "projects.html";
    return;
  }

  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      showToast("Vui lòng nhập email và mật khẩu", "warning");
      return;
    }

    setButtonLoading(submitBtn, true, "Đang đăng nhập...");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      showToast("Đăng nhập thành công", "success");
      window.location.href = "projects.html";
    } catch (err) {
      showErrorToast(err, "Đăng nhập thất bại");
    } finally {
      setButtonLoading(submitBtn, false, "Đăng nhập");
    }
  });
});

function setButtonLoading(btn, isLoading, label) {
  btn.disabled = isLoading;
  btn.textContent = label;
}
