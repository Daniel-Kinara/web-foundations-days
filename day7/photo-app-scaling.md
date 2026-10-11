# SnapShare Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from the people they follow.

## 1. Assumptions

- Registered users: 10,000,000
- Daily active users (DAU): 10% of registered users
- Each active user uploads 1 photo per day
- Each active user views 50 feed pages per day
- Average original photo: 2 MB
- Thumbnail for every photo: 50 KB
- 1 day = 86,400 seconds
- Peak traffic = 5 times the average
- Storage figures use decimal units (1 TB = 1,000,000 MB)

**Daily active users:** 10,000,000 x 10% = **1,000,000 DAU**
## 2. Estimates

### Uploads per second
- Uploads per day: 1,000,000 users x 1 photo = 1,000,000 uploads
- Average: 1,000,000 / 86,400 = about **12 uploads per second**
- Peak (5x): about **58 uploads per second**

### Feed views per second
- Feed views per day: 1,000,000 users x 50 pages = 50,000,000 views
- Average: 50,000,000 / 86,400 = about **579 views per second**
- Peak (5x): about **2,900 views per second**

### Storage per year
- Per photo: 2 MB original + 0.05 MB thumbnail = 2.05 MB
- Per day: 1,000,000 x 2.05 MB = 2,050,000 MB = about **2.05 TB per day**
- Per year: 2.05 TB x 365 = about **748 TB per year (roughly 0.75 PB)**
  - Originals: 730 TB per year
  - Thumbnails: about 18 TB per year
- This figure is photo files only. Database records (users, follows, photo metadata) are tiny by comparison.
## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. On average there are about 579 feed views per second against 12 uploads per second, a ratio of roughly **50 reads for every 1 write**.

What this means for the design:
- Most effort should go into making reads fast and cheap: caching, a CDN, and database read replicas.
- Reads can be spread across many copies of the data, but writes must be handled carefully, so the primary database stays small and focused on writes.
- Uploads are rare enough that slow work (like making thumbnails) can be moved out of the request and done in the background.
## 4. Where photos are stored

Photo files should **not** be stored inside the database. They should go in **object storage** (such as Amazon S3 or Google Cloud Storage), and the database should store only the file's URL and metadata.

Reasons:
- **Size:** about 750 TB per year would make the database enormous, slow to back up and very expensive to run.
- **Speed:** databases are built for small structured rows, and large binary files slow down the queries that matter most.
- **Cost:** object storage costs far less per terabyte than database storage.
- **Delivery:** object storage works directly with a CDN, so photos can be served from locations close to users without touching the database.
- **Scaling:** object storage grows almost without limit, while a single database does not.
## 5. Architecture diagram

```text
                          +-----------+
                          |   Users   |
                          | (app/web) |
                          +-----+-----+
                                |
              +-----------------+------------------+
              | (photos and thumbnails)            | (API requests)
              v                                    v
        +-----------+                      +---------------+
        |    CDN    |                      | Load Balancer |
        +-----+-----+                      +-------+-------+
              | (cache miss)                       |
              |                    +---------------+---------------+
              |                    |               |               |
              |                    v               v               v
              |              +-----------+   +-----------+   +-----------+
              |              | App Server|   | App Server|   | App Server|
              |              +-----+-----+   +-----+-----+   +-----+-----+
              |                    |               |               |
              |        +-----------+---------------+---------------+
              |        |                  |                        |
              |        v                  v                        v
              |  +-----------+     +---------------+        +-------------+
              |  |   Cache   |     |   Database    |        |    Queue    |
              |  |  (Redis)  |     |   (primary)   |        |  (upload    |
              |  +-----------+     +-------+-------+        |    jobs)    |
              |                            |                +------+------+
              |                            | replication           |
              |                            v                       v
              |                    +---------------+        +-------------+
              |                    |  Read Replica |        |   Worker    |
              |                    +---------------+        | (thumbnails)|
              |                                             +------+------+
              |                                                    |
              v                                                    v
        +-------------------------------------------------------------+
        |        Object Storage (original photos + thumbnails)        |
        +-------------------------------------------------------------+
```

Reads (feed views) go through the load balancer to the app servers, which check the cache first and then the read replica. Writes (uploads) go to the database primary, the queue and object storage.
## 6. What each component does

- **CDN:** solves slow photo loading by serving cached copies of photos and thumbnails from servers close to the user, so most image traffic never reaches our servers.
- **Load balancer:** solves the problem of one server being overwhelmed (or failing) by spreading incoming requests across many app servers.
- **App servers:** run the business logic (login, uploads, building the feed), and because they keep no state, we can add more of them as traffic grows.
- **Cache (Redis):** solves repeated database load by keeping popular data, such as recent feeds and photo metadata, in fast memory.
- **Database (primary):** stores users, follows and photo metadata reliably, and handles every write.
- **Read replica:** solves read overload by keeping a copy of the primary database that serves feed queries, leaving the primary free for writes.
- **Object storage:** solves the problem of storing hundreds of terabytes of photo files cheaply and durably.
- **Queue:** solves slow uploads by holding background jobs (like thumbnail creation) so the user does not have to wait for them.
- **Worker:** picks jobs off the queue and creates thumbnails, and can be scaled up or down depending on how many jobs are waiting.
## 7. Upload flow, step by step

1. The user picks a photo in the app and taps upload. The request goes to the **load balancer**.
2. The load balancer forwards it to an available **app server**.
3. The app server checks that the user is logged in and that the file is a valid image within the size limit.
4. The app server saves the original photo (about 2 MB) to **object storage** and receives its URL.
5. The app server writes a new row in the **database primary** with the user id, photo URL, timestamp and status "processing".
6. The app server puts a "create thumbnail" job on the **queue**, containing the photo id and its location.
7. The app server replies to the user straight away with "upload successful". The user is not kept waiting for the thumbnail.
8. A **worker** takes the job from the queue, downloads the original from object storage, and creates a 50 KB thumbnail.
9. The worker saves the thumbnail to object storage and updates the database row with the thumbnail URL and status "ready".
10. The worker clears or updates the cached feed entries for the uploader's followers, so the new photo appears.
11. When followers open their feed, the thumbnail is delivered through the **CDN**.
12. If the worker fails, the job returns to the queue and is retried, so no thumbnail is lost.
## 8. Trade-offs

1. **Caching: speed vs fresh data.** A cache makes feeds load much faster and protects the database, but cached data can be slightly out of date, so a new photo might take a few seconds to appear. For a social feed this delay is acceptable.
2. **Read replica: scale vs consistency.** Replicas let us handle thousands of feed views per second, but they copy data from the primary with a small delay (replication lag). A user might upload a photo and briefly not see it in their own feed, so we may read the user's own photos from the primary.
3. **Asynchronous thumbnails: fast uploads vs short delay.** A queue and worker make uploads feel instant, but the thumbnail is not ready for a few seconds, so the feed may need to show a placeholder. It also adds more components (queue and workers) to run and monitor.
4. **CDN: speed vs cost.** A CDN gives fast image loading worldwide and takes load off our servers, but it adds a monthly cost and means we must handle cache expiry when photos are deleted.
