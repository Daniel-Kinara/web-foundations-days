# TicketHub Design Document

TicketHub is a website that sells tickets for concerts and events. This document follows the six-part framework: requirements, estimates, API, data model, architecture and trade-offs. It also explains how the design stops two people buying the same seat.

## 1. Requirements

### Functional requirements

- Users can register, log in and log out.
- Users can browse and search upcoming events.
- Users can view an event's seat map and see which seats are available.
- Users can hold one or more seats for a short time (5 minutes) while they pay.
- Users can pay for held seats and receive their tickets.
- Users can view their purchased tickets.
- Held seats that are not paid for are released automatically.

### Non-functional requirements

- **Correctness (most important):** a seat must never be sold to two people, and a customer must never be charged twice for the same order. This matters more than speed.
- **Speed:** browsing pages load in under 500 ms; holding a seat responds in under 1 second, even during a big sale.
- **Fairness:** during a big sale, access should not be decided by who has the fastest connection or by bots. Each person has a limit of 4 tickets per event and a fair place in line.
- **Scalability:** the system handles normal days and the sudden spike when a popular concert goes on sale (about 600 times normal traffic).
- **Availability:** browsing stays up even if part of the system fails, and no payment or ticket is lost.
- **Security:** passwords are hashed, traffic uses HTTPS and card details are handled by a payment provider, not stored by us.

## 2. Estimates

### Facts used

- 2,000,000 registered users
- Normal day: 50,000 visitors, each viewing 10 pages; 5,000 tickets sold
- Big sale: 200,000 people try to buy 20,000 seats in the first 10 minutes
- 1 day = 86,400 seconds; 10 minutes = 600 seconds
- Normal peak = 5 times the average

### Normal traffic

| Measure | Calculation | Result |
| --------- | ------------- | -------- |
| Page views per day | 50,000 x 10 | 500,000 |
| Page views per second (average) | 500,000 / 86,400 | about 6 |
| Page views per second (peak) | 6 x 5 | about 29 |
| Tickets sold per second (average) | 5,000 / 86,400 | about 0.06 (one every 17 seconds) |
| Tickets sold per second (peak) | 0.06 x 5 | about 0.3 |
| Ticket rows per year | 5,000 x 365 | about 1.8 million (under 1 GB) |

### Big sale (first 10 minutes)

Assumptions: each person views about 10 pages, there is a 3x burst in the first minute, and each person makes about 2 attempts to hold a seat.

| Measure | Calculation | Result |
| --------- | ------------- | -------- |
| People arriving per second | 200,000 / 600 | about 333 |
| Page views per second (average) | 200,000 x 10 / 600 | about 3,300 |
| Page views per second (first-minute burst) | 3,300 x 3 | about 10,000 |
| Seat hold attempts per second | 200,000 x 2 / 600 | about 670 |
| Seats sold per second | 20,000 / 600 | about 33 |
| Share of buyers who get a seat | 20,000 / 200,000 | 10% |

### Comparison

| | Normal day (average) | Big sale (average) | Difference |
| --- | --- | --- | --- |
| Page views per second | 6 | 3,300 | about 575 times more |
| Tickets sold per second | 0.06 | 33 | about 575 times more |
| Competition for the same seats | almost none | extreme | |

**Conclusions:**

- A system built for a normal day would collapse during a big sale, so the design must handle a spike of about 600 times normal load, not just the average.
- Even in the big sale, only 33 seats per second are actually sold, so the **writes are small**. The real danger is thousands of people reading the seat map and hundreds trying to grab the same seats at the same moment.
- 90% of buyers will not get a seat, so fairness and clear messages matter as much as speed.

## 3. API

Base URL: `https://api.tickethub.example/v1`. All endpoints use JSON. Every endpoint except browsing events and logging in needs `Authorization: Bearer <token>`.

| Method | Path | Description | Success status |
| -------- | ------ | ------------- | ---------------- |
| POST | `/auth/login` | Log in and receive a token | 200 OK |
| GET | `/events` | Browse and search upcoming events (`?q=`, `?page=`) | 200 OK |
| GET | `/events/{id}` | Get the details of one event | 200 OK |
| GET | `/events/{id}/seats` | View the seat map and which seats are available | 200 OK |
| POST | `/events/{id}/holds` | Hold seats for 5 minutes | 201 Created |
| DELETE | `/holds/{id}` | Release a hold early | 204 No Content |
| POST | `/orders` | Pay for held seats | 201 Created |
| GET | `/me/tickets` | View my purchased tickets | 200 OK |

### Hold seats: `POST /events/7/holds`

Request:

```json
{
  "seat_ids": [101, 102]
}
```

Response (201 Created):

```json
{
  "hold_id": "h_8f3a",
  "event_id": 7,
  "seat_ids": [101, 102],
  "expires_at": "2026-11-20T18:05:00Z"
}
```

### Pay: `POST /orders`

The `Idempotency-Key` header makes sure a retried request never charges the customer twice.

Request:

```json
{
  "hold_id": "h_8f3a",
  "payment_token": "tok_visa_123"
}
```

Response (201 Created):

```json
{
  "order_id": 900,
  "status": "paid",
  "tickets": [
    { "ticket_id": 5001, "seat_id": 101, "section": "A", "row": "C", "seat": 12 },
    { "ticket_id": 5002, "seat_id": 102, "section": "A", "row": "C", "seat": 13 }
  ]
}
```

### Error codes

| Status | When it happens |
| -------- | ----------------- |
| 400 Bad Request | Invalid input, for example asking to hold more than 4 seats |
| 401 Unauthorized | No token, or the token has expired |
| 402 Payment Required | The payment was declined |
| 404 Not Found | The event, seat or hold does not exist |
| 409 Conflict | **Someone else already holds or bought one of the seats** |
| 410 Gone | The hold has expired before payment |
| 429 Too Many Requests | The user or IP is sending requests too fast |
| 500 Internal Server Error | Something failed on our side |

## 4. Data model

### Tables

**users**: `id` (PK), `email` (unique), `name`, `password_hash`, `created_at`

**events**: `id` (PK), `name`, `venue`, `starts_at`, `on_sale_at`, `total_seats`

**seats**: `id` (PK), `event_id` (FK to events), `section`, `row_label`, `seat_number`, `price_cents`, `status` (available, held or sold), `held_by_user_id` (FK to users, empty unless held), `hold_expires_at`

**orders**: `id` (PK), `user_id` (FK to users), `event_id` (FK to events), `total_cents`, `status` (pending, paid or failed), `payment_ref`, `idempotency_key` (unique), `created_at`

**tickets**: `id` (PK), `order_id` (FK to orders), `seat_id` (FK to seats, **unique**), `created_at`

### Relationships

- **events to seats: one-to-many.** An event has many seats, and each seat belongs to one event.
- **users to orders: one-to-many.** A user can place many orders, and each order belongs to one user.
- **orders to tickets: one-to-many.** An order can contain several tickets, and each ticket belongs to one order.
- **seats to tickets: one-to-one at most.** A seat can have at most one ticket, which is enforced by the unique constraint on `tickets.seat_id`.
- **users to events: many-to-many**, through orders and tickets. A user can attend many events, and an event has many buyers.

### CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  venue       VARCHAR(200) NOT NULL,
  starts_at   TIMESTAMP NOT NULL,
  on_sale_at  TIMESTAMP NOT NULL,
  total_seats INTEGER NOT NULL
);

CREATE TABLE seats (
  id               BIGSERIAL PRIMARY KEY,
  event_id         BIGINT NOT NULL REFERENCES events (id),
  section          VARCHAR(20) NOT NULL,
  row_label        VARCHAR(5) NOT NULL,
  seat_number      INTEGER NOT NULL,
  price_cents      INTEGER NOT NULL,
  status           VARCHAR(10) NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'held', 'sold')),
  held_by_user_id  BIGINT REFERENCES users (id),
  hold_expires_at  TIMESTAMP,
  UNIQUE (event_id, section, row_label, seat_number)
);

CREATE TABLE orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users (id),
  event_id        BIGINT NOT NULL REFERENCES events (id),
  total_cents     INTEGER NOT NULL,
  status          VARCHAR(10) NOT NULL
                  CHECK (status IN ('pending', 'paid', 'failed')),
  payment_ref     VARCHAR(100),
  idempotency_key VARCHAR(100) NOT NULL UNIQUE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders (id),
  seat_id    BIGINT NOT NULL UNIQUE REFERENCES seats (id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_seats_event_status ON seats (event_id, status);
CREATE INDEX idx_orders_user ON orders (user_id);
```

- `seats (event_id, status)` makes "show the available seats for this event" fast, which is the most common query during a sale.
- `orders (user_id)` makes "show my tickets" fast.

### SQL or NoSQL?

SQL (PostgreSQL). Selling seats needs **transactions and constraints**, which relational databases provide: several changes succeed together or not at all, and unique constraints make double-selling impossible. The write rate is small (about 33 sales per second at the peak), so a single primary database is enough.

## 5. Preventing two people from buying the same seat

### The problem

Imagine two people click the same seat at the same moment. If the server first **reads** "is the seat free?" and then **writes** "mark it as taken" in two separate steps, both requests can read "free" before either one writes. Both succeed, and the seat is sold twice. This is called a race condition.

### The solution: one atomic step in a transaction

The check and the change happen in a **single SQL statement** inside a transaction on the **primary database**. The database locks the row while it updates it, so concurrent requests for the same seat are handled one at a time.

**Step 1: Hold the seats (`POST /events/{id}/holds`)**

```sql
BEGIN;

UPDATE seats
SET status = 'held',
    held_by_user_id = 42,
    hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE event_id = 7
  AND id IN (101, 102)
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < NOW()));

-- The app checks how many rows were updated.
-- 2 rows (all requested seats): COMMIT and return 201 Created.
-- Fewer than 2: ROLLBACK and return 409 Conflict.
COMMIT;
```

If two users run this at the same moment, the database makes the second one wait for the first. When the second continues, it re-checks the condition, sees that the seat is now held and unexpired, and updates **zero rows**. Only one user wins, and the other gets a clear 409.

**Step 2: Pay and confirm (`POST /orders`)**

```sql
BEGIN;

-- Lock the seats and confirm this user still holds them
SELECT id FROM seats
WHERE id IN (101, 102)
  AND held_by_user_id = 42
  AND status = 'held'
  AND hold_expires_at > NOW()
FOR UPDATE;
-- Must return 2 rows, otherwise ROLLBACK and return 410 Gone.

INSERT INTO orders (user_id, event_id, total_cents, status, payment_ref, idempotency_key)
VALUES (42, 7, 15000, 'paid', 'pay_abc123', 'key-9f2c');

INSERT INTO tickets (order_id, seat_id) VALUES (900, 101), (900, 102);

UPDATE seats
SET status = 'sold', held_by_user_id = NULL, hold_expires_at = NULL
WHERE id IN (101, 102);

COMMIT;
```

Because this is a transaction, either the order, the tickets and the seat updates all happen, or none of them do.

### Extra layers of protection

1. **Unique constraint on `tickets.seat_id`.** Even if there were a bug in the code, the database refuses to create a second ticket for the same seat. This is the last line of defence.
2. **Holds expire.** If someone abandons checkout, the 5-minute hold runs out. The hold query treats expired holds as available, and a background worker also cleans them up.
3. **Idempotency key (unique).** If a payment request is retried (for example after a network timeout), the unique `idempotency_key` stops a second order and a double charge.
4. **Payment timing.** Payment only starts if at least a minute remains on the hold, and the hold is extended briefly while payment is processing, so a hold cannot expire in the middle of a payment.
5. **The cache never decides.** The seat map shown to users may be a second or two out of date, so someone may click a seat that was just taken. That is fine, because the primary database makes the final decision and the user simply gets a 409 and is asked to choose another seat. Holds and purchases are never done against the cache or the read replica.

## 6. Architecture

```text
 +--------+     +-------+     +-------+
 | Client | --> |  DNS  | --> |  CDN  |   (static files + cached event pages)
 +---+----+     +-------+     +-------+
     |
     | API requests
     v
+----------------+
| Waiting Room   |   (virtual queue: lets users in at a controlled rate)
| + Rate Limiter |
+-------+--------+
        |
        v
+----------------+
| Load Balancer  |   (two instances)
+-------+--------+
        |
  +-----+-----------+-----------+
  |                 |           |
  v                 v           v
+---------+   +---------+   +---------+
|  App    |   |  App    |   |  App    |   (many, stateless, autoscaled)
| Server  |   | Server  |   | Server  |
+----+----+   +----+----+   +----+----+
     |             |             |
     +------+------+------+------+
            |             |             |
            v             v             v
      +-----------+  +-----------+  +-----------+
      |   Cache   |  | Primary   |  |   Queue   |
      |  (Redis)  |  | Database  |  |           |
      +-----------+  | (holds,   |  +-----+-----+
                     |  orders)  |        |
                     +-----+-----+        v
                           |        +-----------+      +-----------------+
                           |        |  Workers  | ---> | Payment provider|
                           v        | (tickets, |      |   (external)    |
                     +-----------+  |  emails,  |      +-----------------+
                     |   Read    |  |  expired  |
                     |  Replica  |  |  holds)   |
                     | (browse)  |  +-----------+
                     +-----------+
```

### What each component does

- **Client:** the browser or app where users browse events, pick seats and pay.
- **DNS:** turns the TicketHub name into the address of our servers.
- **CDN:** solves slow, heavy page loads by serving images, scripts and cached event pages from locations close to the user, so most traffic never reaches our servers.
- **Waiting room:** solves the sale-day stampede by putting arriving users in a fair virtual line and letting them in a few thousand at a time, which protects the servers and gives everyone a fair chance.
- **Rate limiter:** solves bots and abuse by limiting how many requests one user or IP address can send.
- **Load balancer:** solves overloaded or failed servers by spreading requests across many app servers and skipping unhealthy ones.
- **App servers:** run the API logic (login, seat maps, holds, orders), and because they keep no state, we can add many more before a big sale.
- **Cache (Redis):** solves repeated database reads by keeping event details and the seat map in memory with a very short life (1 to 2 seconds), so thousands of people viewing the same seat map cost one database query.
- **Primary database:** the single source of truth for seats, holds, orders and tickets, and the only place where seats are held and sold, using transactions and constraints.
- **Read replica:** solves read overload by answering browsing and search queries so the primary can focus on holds and purchases.
- **Queue:** solves slow requests by holding follow-up jobs so the API can reply immediately after a purchase.
- **Workers:** take jobs from the queue (send confirmation emails, generate ticket PDFs, release expired holds) without slowing down buyers.
- **Payment provider:** an external service that takes the card payment, so we never store card details.

### How it survives the big sale

1. **Absorb the spike:** the CDN and cache serve most of the roughly 3,300 to 10,000 page views per second, so the database only sees a small fraction.
2. **Control the flow:** the waiting room admits users in batches (for example 2,000 at a time), so the app servers and database never see all 200,000 people at once.
3. **Scale the stateless part:** before the sale, we add more app servers ahead of time instead of waiting for the spike to arrive.
4. **Keep the database load small and simple:** only about 33 sales per second and a few hundred hold attempts per second reach the primary, and each is a short, indexed transaction. This is comfortably within reach of a well-provisioned primary.
5. **Do slow work in the background:** emails and PDFs go through the queue, so buyers are never waiting for them.
6. **Fail safely:** if the cache or read replica fails, browsing slows down but no seat can be double-sold, because correctness depends only on the primary database. The primary has a standby copy ready to take over.

## 7. Trade-offs

1. **Waiting room: fairness and stability vs. a longer wait.** The waiting room protects the system and gives everyone a fair place in line, but customers wait before they can even pick seats, and it adds another component to build and run. I accept this because a crashed website during a sale is worse for everyone.
2. **Short cache on the seat map: speed vs. accuracy.** Caching the seat map for 1 to 2 seconds takes huge load off the database, but users sometimes see a seat as available when it was just taken and get a 409 error. This is acceptable because the database makes the final decision, and the app shows a friendly message and suggests other seats.
3. **Seat holds: a good checkout experience vs. seats being locked.** A 5-minute hold means nobody loses their seat while paying, but abandoned checkouts keep seats unavailable for a few minutes. A shorter hold releases seats faster but risks cutting off people who are still paying.
4. **One primary database: strong correctness vs. limited write scaling.** Having one primary for writes makes double-booking impossible and keeps the design simple. The downside is that writes cannot be spread across many databases. At about 33 sales per second this is not a limit, and for much bigger events we could split data by event.
5. **Background jobs for emails and PDFs: fast checkout vs. a short delay.** Buyers get their confirmation instantly on screen, but the email and PDF may arrive a few seconds later.
