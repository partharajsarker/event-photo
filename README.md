# Event Photography Web Application

Production-ready event photography platform. Photos from a Wi-Fi camera appear in a web gallery within seconds. Guests scan a QR code to view and download photos — no account required.

## Features

- **Admin dashboard** — create events, view photos, download/print QR codes, delete photos, view download stats
- **Public gallery** — responsive grid, infinite scroll, lazy loading, fullscreen viewer, one-tap download
- **Camera upload API** — HTTP POST compatible with direct camera uploads (multipart or raw bytes)
- **Image processing** — Sharp generates 400px-wide thumbnails
- **S3 storage** — MinIO locally, any S3-compatible provider in production
- **Security** — rate limiting, input validation, file type checks, 50MB max upload, path traversal prevention

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Storage | AWS S3 compatible (MinIO locally) |
| QR Codes | `qrcode` package |
| Deployment | Docker + Docker Compose |

## Quick Start (Docker)

```bash
cd event-photography
docker compose up --build
```

Services:

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Admin | http://localhost:3000/admin |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| PostgreSQL | localhost:5432 |

Default admin key: `dev-admin-key-change-in-production`

## Local Development (without Docker for the app)

1. Start infrastructure only:

```bash
docker compose up postgres minio minio-init -d
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Install and migrate:

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Default (local) |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_APP_URL` | Public base URL for QR codes and links | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | See `.env.example` |
| `S3_ENDPOINT` | S3 API endpoint (internal) | `http://localhost:9000` |
| `S3_PUBLIC_ENDPOINT` | Public URL for stored files | `http://localhost:9000` |
| `S3_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET` | Bucket name | `event-photos` |
| `S3_ACCESS_KEY_ID` | S3 access key | `minioadmin` |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | `minioadmin` |
| `S3_FORCE_PATH_STYLE` | Required for MinIO | `true` |
| `ADMIN_API_KEY` | Admin API key (`X-Admin-Key` header) | Change in production |
| `MAX_UPLOAD_SIZE_MB` | Max upload size | `50` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per IP | `100` |

## API Reference

### Admin (requires `X-Admin-Key` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events with stats |
| POST | `/api/events` | Create event `{ "name": "Wedding 2026" }` |
| GET | `/api/events/:id` | Event details + photos |
| DELETE | `/api/events/:id` | Delete event and all photos |
| DELETE | `/api/photos/:id` | Delete a photo |

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/photos?eventSlug=wedding-2026&cursor=&limit=20` | Paginated gallery photos |
| POST | `/api/photos/:id/download` | Track download, return URL |
| GET | `/api/health` | Health check |

### Camera Upload

```
POST /api/upload?eventSlug=wedding-2026
```

**Multipart (recommended):**

```bash
curl -X POST "http://localhost:3000/api/upload?eventSlug=wedding-2026" \
  -F "file=@photo.jpg"
```

**Raw bytes (camera HTTP POST):**

```bash
curl -X POST "http://localhost:3000/api/upload?eventSlug=wedding-2026" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

Allowed types: `jpg`, `jpeg`, `png`, `webp`. Max size: 50MB.

### FTP Integration

Cameras with FTP upload can use an FTP-to-HTTP bridge (e.g. `curlftpfs`, `rclone`, or a small sidecar service) to forward files to `POST /api/upload?eventSlug=...`. The upload endpoint is designed for HTTP POST compatibility; FTP support is via bridge/proxy.

## Project Structure

```
event-photography/
├── docker-compose.yml      # PostgreSQL + MinIO + App
├── Dockerfile
├── prisma/
│   ├── schema.prisma       # Event, Photo, Download models
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── admin/          # Admin dashboard
│   │   ├── event/[slug]/   # Public gallery
│   │   └── api/            # REST endpoints
│   ├── components/
│   │   ├── admin/
│   │   └── gallery/
│   └── lib/
│       ├── storage.ts      # S3/MinIO client
│       ├── thumbnail.ts    # Sharp processing
│       ├── qrcode.ts       # QR generation
│       ├── security.ts     # Validation & sanitization
│       └── rate-limit.ts
└── .env.example
```

## Database Schema

- **Event** — `id`, `name`, `slug`, `qrCodeUrl`, `createdAt`
- **Photo** — `id`, `eventId`, `filename`, `thumbnail`, `originalUrl`, `uploadedAt`, `downloadCount`
- **Download** — `id`, `photoId`, `ipAddress`, `downloadedAt`

## User Roles

| Role | Capabilities |
|------|--------------|
| Admin | Create/delete events, view photos, QR codes, download stats |
| Guest | Scan QR, view gallery, download photos (no login) |

## Production Notes

1. Change `ADMIN_API_KEY` to a strong secret
2. Use a managed PostgreSQL and S3 (AWS S3, Cloudflare R2, etc.)
3. Set `S3_PUBLIC_ENDPOINT` to your CDN or public bucket URL
4. Set `NEXT_PUBLIC_APP_URL` to your production domain
5. Put the app behind HTTPS (reverse proxy / load balancer)
6. Consider Redis-backed rate limiting for multi-instance deployments

## License

MIT
