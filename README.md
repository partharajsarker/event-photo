# Event Photography Web Application

Production-ready event photography platform optimized for Vercel deployment. Photos from a Wi-Fi camera appear in a web gallery within seconds. Guests scan a QR code to view and download photos — no account required.

## Features

- **Admin dashboard** — create events, view photos, download/print QR codes, delete photos, view download stats
- **Public gallery** — responsive grid, infinite scroll (cursor-based pagination), lazy loading, fullscreen viewer, one-tap download
- **Camera upload API** — HTTP POST compatible with direct camera uploads or presigned URLs for large files
- **Image processing** — Sharp generates 400px-wide thumbnails in background
- **Cloudflare R2 storage** — fast, affordable object storage with global CDN
- **Security** — Upstash Redis rate limiting, Zod validation, XSS protection, file type checks
- **Authentication** — NextAuth.js session-based admin authentication

## Tech Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Frontend      | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend       | Next.js API Routes (Vercel Serverless)            |
| Database      | Neon PostgreSQL or Supabase PostgreSQL            |
| Storage       | Cloudflare R2                                     |
| Rate Limiting | Upstash Redis                                     |
| Auth          | NextAuth.js v5 (beta)                             |
| QR Codes      | `qrcode` package                                  |
| Deployment    | Vercel                                            |

## Quick Start

### Prerequisites

1. **Vercel Account** - [vercel.com](https://vercel.com)
2. **Neon PostgreSQL** - [neon.tech](https://neon.tech) (free tier)
3. **Cloudflare R2** - [cloudflare.com](https://cloudflare.com) (10GB free)
4. **Upstash Redis** - [upstash.com](https://upstash.com) (free tier)

### Local Development

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy environment file and configure:

```bash
cp .env.example .env
```

3. Set up your environment variables (see `.env.example` for details)

4. Run database migrations:

```bash
npm run db:migrate
```

5. Start the development server:

```bash
npm run dev
```

Open http://localhost:3000

### Admin Access

1. Navigate to http://localhost:3000/admin/login
2. Enter the `ADMIN_PASSWORD` from your environment variables

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/event-photography)

### Manual Deployment

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy:

```bash
vercel
```

3. Set environment variables in Vercel dashboard or via CLI:

```bash
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET
vercel env add R2_PUBLIC_URL
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add ADMIN_PASSWORD
```

4. Run migrations:

```bash
DATABASE_URL="your-direct-url" npx prisma migrate deploy
```

## Environment Variables

| Variable                         | Description                                                   | Required |
| -------------------------------- | ------------------------------------------------------------- | -------- |
| `NEXT_PUBLIC_APP_URL`            | Public base URL for QR codes and links                        | Yes      |
| `DATABASE_URL`                   | PostgreSQL pooled connection string (for app)                 | Yes      |
| `DIRECT_URL`                     | PostgreSQL direct connection (for migrations)                 | Yes      |
| `R2_ACCOUNT_ID`                  | Cloudflare account ID                                         | Yes      |
| `R2_ACCESS_KEY_ID`               | R2 access key                                                 | Yes      |
| `R2_SECRET_ACCESS_KEY`           | R2 secret key                                                 | Yes      |
| `R2_BUCKET`                      | R2 bucket name                                                | Yes      |
| `R2_PUBLIC_URL`                  | Public URL for R2 (custom domain or pub-xxx.r2.dev)           | Yes      |
| `UPSTASH_REDIS_REST_URL`         | Upstash Redis REST URL                                        | Yes      |
| `UPSTASH_REDIS_REST_TOKEN`       | Upstash Redis token                                           | Yes      |
| `NEXTAUTH_SECRET`                | Secret for NextAuth (generate with `openssl rand -base64 32`) | Yes      |
| `NEXTAUTH_URL`                   | Your app's URL                                                | Yes      |
| `ADMIN_PASSWORD`                 | Password for admin dashboard                                  | Yes      |
| `MAX_UPLOAD_SIZE_MB`             | Max upload size (default: 50)                                 | No       |
| `RATE_LIMIT_WINDOW_MS`           | Rate limit window (default: 60000)                            | No       |
| `RATE_LIMIT_MAX_REQUESTS`        | Max requests per window (default: 100)                        | No       |
| `RATE_LIMIT_UPLOAD_MAX_REQUESTS` | Max uploads per window (default: 30)                          | No       |

## API Reference

### Admin (requires authentication)

| Method | Endpoint          | Description                               |
| ------ | ----------------- | ----------------------------------------- |
| GET    | `/api/events`     | List all events with stats                |
| POST   | `/api/events`     | Create event `{ "name": "Wedding 2026" }` |
| GET    | `/api/events/:id` | Event details + photos                    |
| DELETE | `/api/events/:id` | Delete event and all photos               |
| DELETE | `/api/photos/:id` | Delete a photo                            |
| GET    | `/api/upload`     | Get presigned upload URL                  |

### Public

| Method | Endpoint                                              | Description                      |
| ------ | ----------------------------------------------------- | -------------------------------- |
| GET    | `/api/photos?eventSlug=wedding-2026&cursor=&limit=20` | Paginated gallery photos         |
| POST   | `/api/photos/:id/download`                            | Track download, return URL       |
| POST   | `/api/upload`                                         | Upload callback or direct upload |
| GET    | `/api/health`                                         | Health check                     |

### Camera Upload

**Direct Upload (small files < 4.5MB):**

```bash
curl -X POST "http://your-app.vercel.app/api/upload?eventSlug=wedding-2026" \
  -F "file=@photo.jpg"
```

**Presigned URL Upload (large files):**

1. Get presigned URL:

```bash
curl "http://your-app.vercel.app/api/upload?eventSlug=wedding-2026&filename=photo.jpg&contentType=image/jpeg" \
  -H "Cookie: next-auth.session-token=..."
```

2. Upload directly to R2:

```bash
curl -X PUT "presigned-url" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

3. Notify server:

```bash
curl -X POST "http://your-app.vercel.app/api/upload" \
  -H "Content-Type: application/json" \
  -d '{"photoId": "...", "originalUrl": "...", "filename": "photo.jpg"}'
```

## Database Schema

- **Event** — `id`, `name`, `slug`, `qrCodeUrl`, `createdAt`
- **Photo** — `id`, `eventId`, `filename`, `thumbnail`, `originalUrl`, `uploadedAt`, `downloadCount`, `status`
- **Download** — `id`, `photoId`, `ipAddress`, `downloadedAt`

## Cost Optimization (Free Tier)

| Service       | Free Tier                          |
| ------------- | ---------------------------------- |
| Vercel        | Hobby plan - unlimited deployments |
| Neon          | 0.5 GiB storage, 190 compute hours |
| Cloudflare R2 | 10 GB storage, 10M reads/month     |
| Upstash       | 10,000 commands/day                |

## Migration from v1 (Docker)

1. Export data from existing PostgreSQL database
2. Import into Neon PostgreSQL
3. Migrate files from MinIO/S3 to Cloudflare R2 using `rclone`:
   ```bash
   rclone sync minio:event-photos r2:event-photos
   ```
4. Update environment variables
5. Deploy to Vercel

## License

MIT
