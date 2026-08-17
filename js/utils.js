// ============================================================
// UTILS — shared helpers used across pages
// ============================================================

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const STATUS_LABELS = { todo: "Todo", in_progress: "In Progress", completed: "Completed" };

/**
 * Deadline status logic:
 * - deadline in the past AND not completed -> overdue
 * - deadline within 24h AND not completed -> due soon
 * - completed -> completed
 * - otherwise -> upcoming
 */
function getDeadlineStatus(deadline, status) {
  if (status === "completed") {
    return { key: "completed", emoji: "🟢", label: "Completed" };
  }
  if (!deadline) {
    return { key: "upcoming", emoji: "🔵", label: "No deadline" };
  }

  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs < 0) {
    return { key: "overdue", emoji: "🔴", label: "Overdue" };
  }
  if (diffMs <= oneDayMs) {
    return { key: "due_soon", emoji: "🟠", label: "Due soon" };
  }
  return { key: "upcoming", emoji: "🔵", label: "Upcoming" };
}

function formatDate(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Converts a Date to the value expected by <input type="datetime-local">
function toDateTimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
