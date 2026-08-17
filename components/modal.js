// ============================================================
// MODAL — generic modal helper
// ============================================================

function openModal(innerHTML, { onClose } = {}) {
  closeModal(); // ensure only one modal at a time

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "active-modal";
  overlay.innerHTML = `<div class="modal-card">${innerHTML}</div>`;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", escListener);

  function escListener(e) {
    if (e.key === "Escape") closeModal();
  }

  overlay.dataset.escListenerAttached = "true";
  overlay._escListener = escListener;
  overlay._onClose = onClose;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("modal-overlay--visible"));

  return overlay;
}

function closeModal() {
  const overlay = document.getElementById("active-modal");
  if (!overlay) return;
  document.removeEventListener("keydown", overlay._escListener);
  overlay.classList.remove("modal-overlay--visible");
  setTimeout(() => overlay.remove(), 200);
  if (typeof overlay._onClose === "function") overlay._onClose();
}

// Simple confirm dialog. Returns a Promise<boolean>.
function confirmModal({ title = "Xác nhận", message, confirmLabel = "Xác nhận", danger = false }) {
  return new Promise((resolve) => {
    const overlay = openModal(`
      <h3 class="modal-title">${title}</h3>
      <p class="modal-message"></p>
      <div class="modal-actions">
        <button class="btn btn--ghost" data-action="cancel">Hủy</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"}" data-action="confirm">${confirmLabel}</button>
      </div>
    `);
    overlay.querySelector(".modal-message").textContent = message;

    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      closeModal();
      resolve(false);
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => {
      closeModal();
      resolve(true);
    });
  });
}
