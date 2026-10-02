// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// Trims, collapses repeated spaces and lower-cases, so comparisons ignore case and extra spaces
function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
// ---------- 1. searchNotes ----------
function searchNotes(word) {
  const target = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(target));
}

console.log(searchNotes("the"));
// [ {id: 2, text: "Finish the Day 3 assignment", ...}, {id: 3, text: "Email the project report to Grace", ...} ]
console.log(searchNotes("JAVASCRIPT"));
// [ {id: 4, text: "Revise JavaScript arrays", category: "study"} ]  (case is ignored)
console.log(searchNotes("zebra"));
// []  (no results)
// ---------- 2. longestNote ----------
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

console.log(longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }

// Edge case: no notes (temporarily empty the array, then restore it)
const savedNotes = notes;
notes = [];
console.log(longestNote()); // null
notes = savedNotes;
// ---------- 3. countByCategory ----------
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category] += 1;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

console.log(countByCategory());
// { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory()); // {}  (edge case: no notes)
notes = savedNotes;
// ---------- 4. getSummary ----------
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";

  if (total === 0) {
    return "0 notes.";
  }

  // Fixed order so the sentence always reads personal, work, study
  const parts = [];
  for (const category of VALID_CATEGORIES) {
    if (counts[category]) {
      parts.push(`${counts[category]} ${category}`);
    }
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

console.log(getSummary());
// "5 notes: 2 personal, 1 work, 2 study."

notes = [savedNotes[0]];
console.log(getSummary()); // "1 note: 1 personal."  (singular edge case)
notes = [];
console.log(getSummary()); // "0 notes."
notes = savedNotes;
// ---------- 5. isDuplicate ----------
function isDuplicate(text) {
  const target = normalizeText(text);
  return notes.some((note) => normalizeText(note.text) === target);
}

console.log(isDuplicate("buy milk and bread"));      // true  (different case)
console.log(isDuplicate("  CALL    mum  "));          // true  (extra spaces and case)
console.log(isDuplicate("Buy eggs"));                // false (not in the list)
// ---------- 6. addNote ----------
function addNote(text, category) {
  if (typeof text !== "string" || text.trim().length < 1 || text.trim().length > 200) {
    console.log("Cannot add note: text must be between 1 and 200 characters.");
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log("Cannot add note: category must be personal, work or study.");
    return false;
  }
  if (isDuplicate(text)) {
    console.log("Cannot add note: a note with the same text already exists.");
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1;
  notes.push({ id: newId, text: text.trim(), category: category });
  console.log(`Note added with id ${newId}.`);
  return true;
}
// ---------- addNote tests ----------
console.log(addNote("Book dentist appointment", "personal"));
// logs "Note added with id 6." then true

console.log(addNote("call MUM", "personal"));
// logs "Cannot add note: a note with the same text already exists." then false

console.log(addNote("", "work"));
// logs "Cannot add note: text must be between 1 and 200 characters." then false

console.log(addNote("x".repeat(201), "work"));
// logs "Cannot add note: text must be between 1 and 200 characters." then false (201 is too long)

console.log(addNote("Water the plants", "home"));
// logs "Cannot add note: category must be personal, work or study." then false

console.log(addNote("y".repeat(200), "study"));
// logs "Note added with id 7." then true (exactly 200 is allowed)

console.log(getSummary());
// "7 notes: 3 personal, 1 work, 3 study."
