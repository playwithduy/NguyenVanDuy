// ============================================================
// NOTES — notes.html
// ============================================================

let projectId = null;
let allNotes = [];
let noteSearch = "";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireAuth();
  if (!user) return;

  projectId = await requireProjectAccess();
  if (!projectId) return;

  try {
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    renderSidebar({ activeKey: "notes", projectId, projectName: project.name });
    document.getElementById("project-title").textContent = project.name;
  } catch (err) {
    showErrorToast(err, "Không thể tải project");
  }

  await loadNotes();

  document.getElementById("add-note-btn").addEventListener("click", () => openNoteForm());
  document.getElementById("note-search").addEventListener(
    "input",
    debounce((e) => {
      noteSearch = e.target.value.trim().toLowerCase();
      renderNotes();
    }, 250)
  );
});

async function loadNotes() {
  const grid = document.getElementById("notes-grid");
  grid.innerHTML = `<div class="loading-state">Đang tải notes...</div>`;
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    allNotes = data || [];
    renderNotes();
  } catch (err) {
    grid.innerHTML = "";
    showErrorToast(err, "Không thể tải notes");
  }
}

function renderNotes() {
  const grid = document.getElementById("notes-grid");
  const emptyEl = document.getElementById("notes-empty");

  const filtered = allNotes.filter((n) => {
    if (!noteSearch) return true;
    return (
      n.title.toLowerCase().includes(noteSearch) || (n.content || "").toLowerCase().includes(noteSearch)
    );
  });

  grid.innerHTML = "";
  if (filtered.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  for (const note of filtered) {
    grid.appendChild(renderNoteCard(note));
  }
}

function renderNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";
  card.innerHTML = `
    <h3 class="note-card__title">📝 </h3>
    <p class="note-card__content"></p>
    <div class="note-card__footer">
      <span class="note-card__date">${formatDate(note.updated_at)}</span>
      <div class="note-card__actions">
        <button class="icon-btn" data-action="edit" title="Edit">✏️</button>
        <button class="icon-btn" data-action="delete" title="Delete">🗑️</button>
      </div>
    </div>
  `;
  card.querySelector(".note-card__title").append(document.createTextNode(note.title));
  card.querySelector(".note-card__content").textContent = note.content || "";

  card.querySelector('[data-action="edit"]').addEventListener("click", () => openNoteForm(note));
  card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteNote(note));

  return card;
}

async function deleteNote(note) {
  const confirmed = await confirmModal({
    title: "Xóa note",
    message: `Xóa note "${note.title}"?`,
    confirmLabel: "Xóa",
    danger: true,
  });
  if (!confirmed) return;

  try {
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) throw error;
    allNotes = allNotes.filter((n) => n.id !== note.id);
    renderNotes();
    showToast("Đã xóa note", "success");
  } catch (err) {
    showErrorToast(err, "Không thể xóa note");
  }
}

function openNoteForm(note = null) {
  const isEdit = Boolean(note);
  const overlay = openModal(`
    <h3 class="modal-title">${isEdit ? "Sửa note" : "+ Note mới"}</h3>
    <form id="note-form" class="modal-form">
      <label>Tiêu đề</label>
      <input type="text" id="note-title" required maxlength="120" placeholder="VD: Ý tưởng project" />

      <label>Nội dung</label>
      <textarea id="note-content" rows="8" placeholder="Viết note của bạn ở đây..."></textarea>

      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-action="cancel">Cancel</button>
        <button type="submit" class="btn btn--primary" id="note-submit">Save</button>
      </div>
    </form>
  `);

  if (isEdit) {
    document.getElementById("note-title").value = note.title;
    document.getElementById("note-content").value = note.content || "";
  }

  overlay.querySelector('[data-action="cancel"]').addEventListener("click", closeModal);

  overlay.querySelector("#note-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("note-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const payload = {
      title: document.getElementById("note-title").value.trim(),
      content: document.getElementById("note-content").value.trim(),
    };

    try {
      if (isEdit) {
        const { error } = await supabase.from("notes").update(payload).eq("id", note.id);
        if (error) throw error;
        showToast("Đã cập nhật note", "success");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("notes")
          .insert({ ...payload, project_id: projectId, created_by: user.id });
        if (error) throw error;
        showToast("Đã thêm note", "success");
      }
      closeModal();
      await loadNotes();
    } catch (err) {
      showErrorToast(err, "Không thể lưu note");
      submitBtn.disabled = false;
      submitBtn.textContent = "Save";
    }
  });
}
