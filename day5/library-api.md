# Library API Design: Books

A REST API for a library's `books` resource. All requests and responses use JSON.

Base path: `/books`

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**
```json
  {
    "title": "Weep Not, Child",
    "author": "Ngugi wa Thiong'o",
    "year": 1964,
    "isbn": "9780435908300"
  }
```
- **Success status:** 201 Created

### 4. Update a book
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**
```json
  {
    "title": "Weep Not, Child",
    "author": "Ngugi wa Thiong'o",
    "year": 1964,
    "isbn": "9780435908300"
  }
```
- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author
- **Method:** GET
- **Path:** `/books?author=Ngugi%20wa%20Thiong'o`
- **Description:** Returns only the books written by the author given in the `author` query parameter.
- **Request body:** none
- **Success status:** 200 OK

## Error codes

### 400 Bad Request
- The request is invalid or incomplete.
- **Example:** `POST /books` with a body that has no `title`, or a `year` that is text instead of a number.

### 404 Not Found
- The requested resource does not exist.
- **Example:** `GET /books/9999` when no book has the id 9999, or `DELETE /books/9999` for a book that was already removed.