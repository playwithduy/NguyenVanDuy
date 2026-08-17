// ============================================================
// TOAST — lightweight notification component
// Usage: showToast("Saved successfully", "success")
// types: success | error | warning | info
// ============================================================

function ensureToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

const TOAST_ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "🔐",
};

function showToast(message, type = "info", duration = 3500) {
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast__message"></span>
  `;
  toast.querySelector(".toast__message").textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Friendly wrapper for turning raw errors into a safe, user-facing toast
function showErrorToast(error, fallback = "Something went wrong") {
  console.error(error);
  const message =
    error && error.message && typeof error.message === "string"
      ? humanizeError(error.message)
      : fallback;
  showToast(message, "error");
}

function humanizeError(message) {
  if (/network|fetch/i.test(message)) return "Không có kết nối mạng. Vui lòng thử lại.";
  if (/invalid login credentials/i.test(message)) return "Email hoặc mật khẩu không đúng.";
  if (/access denied/i.test(message)) return "Bạn không có quyền truy cập.";
  if (/jwt|session/i.test(message)) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
