-- ============================================
-- school.sql : students, courses and enrolments
-- ============================================
PRAGMA foreign_keys = ON;
-- Drop in this order so the script can be re-run safely
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
-- ---------- Tables ----------
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL
);
CREATE TABLE enrolments (
  enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  FOREIGN KEY (student_id) REFERENCES students (student_id),
  FOREIGN KEY (course_id) REFERENCES courses (course_id),
  UNIQUE (student_id, course_id)
);
-- ---------- Sample data ----------
INSERT INTO students (name, email)
VALUES ('Amina Wanjiru', 'amina@example.com'),
  ('Brian Otieno', 'brian@example.com'),
  ('Grace Mwangi', 'grace@example.com'),
  ('David Kamau', 'david@example.com'),
  ('Faith Njeri', 'faith@example.com');
INSERT INTO courses (title, credits)
VALUES ('Web Development', 4),
  ('Databases', 3),
  ('Data Structures', 4);
INSERT INTO enrolments (student_id, course_id, grade)
VALUES (1, 1, 'A'),
  (1, 2, 'B'),
  (2, 1, 'B'),
  (2, 3, 'C'),
  (3, 2, 'A'),
  (3, 1, NULL),
  (4, 3, 'B');
-- ---------- Queries ----------
-- Query 1: all courses for one student (by name)
SELECT s.name,
  c.title,
  e.grade
FROM students s
  JOIN enrolments e ON e.student_id = s.student_id
  JOIN courses c ON c.course_id = e.course_id
WHERE s.name = 'Amina Wanjiru';
-- Expected: Web Development (A) and Databases (B)
-- Query 2: all students on one course
SELECT c.title,
  s.name,
  s.email
FROM courses c
  JOIN enrolments e ON e.course_id = c.course_id
  JOIN students s ON s.student_id = e.student_id
WHERE c.title = 'Web Development';
-- Expected: Amina Wanjiru, Brian Otieno, Grace Mwangi
-- Query 3: number of students per course
SELECT c.title,
  COUNT(e.enrolment_id) AS student_count
FROM courses c
  LEFT JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.course_id,
  c.title;
-- Expected: Web Development 3, Databases 2, Data Structures 2
-- Query 4: students who have no enrolments
SELECT s.student_id,
  s.name
FROM students s
  LEFT JOIN enrolments e ON e.student_id = s.student_id
WHERE e.enrolment_id IS NULL;
-- Expected: Faith Njeri
-- Query 5: update one enrolment's grade (Grace's Web Development grade)
UPDATE enrolments
SET grade = 'B'
WHERE student_id = 3
  AND course_id = 1;
-- Check the update worked
SELECT s.name,
  c.title,
  e.grade
FROM enrolments e
  JOIN students s ON s.student_id = e.student_id
  JOIN courses c ON c.course_id = e.course_id
WHERE s.name = 'Grace Mwangi';
-- Expected: Databases (A) and Web Development (B)