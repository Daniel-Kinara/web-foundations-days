// ---------- Elements ----------
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const MAX_CHARS = 200;
const WARNING_AT = 180;

// ---------- Counters ----------
function updateCounts() {
  const text = noteText.value;
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = `${chars} / ${MAX_CHARS} characters`;
  wordCount.textContent = words === 1 ? "1 word" : `${words} words`;

  // Remove both classes first, then add the one that applies
  charCount.classList.remove("warning", "over");
  if (chars > MAX_CHARS) {
    charCount.classList.add("over");
  } else if (chars > WARNING_AT) {
    charCount.classList.add("warning");
  }
}
// ---------- Draft saving ----------
function saveDraft() {
  localStorage.setItem("draft", noteText.value);
}

noteText.addEventListener("input", function () {
  updateCounts();
  saveDraft();
});
// ---------- Theme ----------
function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
  }
}

// ---------- Restore on load ----------
const savedDraft = localStorage.getItem("draft");
if (savedDraft !== null) {
  noteText.value = savedDraft;
}
applyTheme(localStorage.getItem("theme"));
updateCounts();
// ---------- Clear ----------
function clearNote() {
  noteText.value = "";
  localStorage.removeItem("draft");
  updateCounts();
}

clearBtn.addEventListener("click", clearNote);

noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearNote();
  }
});
// ---------- Theme toggle ----------
themeToggle.addEventListener("click", function () {
  const isDark = document.body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("theme", newTheme);
});
