# School Database Design

## Tables

### students
Stores one row per student.
- `student_id`: primary key
- `name`: the student's full name (required)
- `email`: the student's email (required and unique, so no two students share one)

### courses
Stores one row per course offered.
- `course_id`: primary key
- `title`: the course name (required)
- `credits`: the credit value (required)

### enrolments
Records that a student is taking a course, and the grade they received.
- `enrolment_id`: primary key
- `student_id`: foreign key to `students`
- `course_id`: foreign key to `courses`
- `grade`: the result (can be empty until the student is graded)
- A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments:** one-to-many. One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments:** one-to-many. One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses:** many-to-many. A student can take many courses, and a course can have many students.

### Why a join table is needed
A relational table cannot store a list of values in one cell, so a student's courses (or a course's students) cannot sit in a single column. The `enrolments` table solves this by turning the many-to-many relationship into two one-to-many relationships. Each row pairs one student with one course, and it is also the natural place for data about the pairing itself, such as the grade.

## Index

I would add an index on `enrolments (course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

The `UNIQUE (student_id, course_id)` rule already creates an index that speeds up searches by student. Searches by course alone, such as "all students on this course" or "students per course", cannot use it efficiently, so this index keeps those queries fast as the number of enrolments grows.

## SQL or NoSQL?

I would choose SQL for this system. The data is highly structured and relational: students, courses and enrolments are linked by clear relationships, and the system needs rules enforced by the database itself, such as unique emails, no duplicate enrolments, and foreign keys that stop an enrolment pointing at a student who does not exist. Reports like "students per course" or "students with no enrolments" are also natural joins and aggregates in SQL. A NoSQL document store could work for flexible or rapidly changing data, but here the structure is stable and data integrity matters more than flexibility.