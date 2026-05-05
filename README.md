# SnapCull Gallery

Production-oriented QR wedding gallery built with Next.js App Router, TypeScript, Tailwind CSS, Vercel serverless APIs, and Cloudflare R2.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/event/sample-wedding`.

## Cloudflare R2 layout

The app first looks for a manifest:

```text
events/{eventId}/manifest.json
events/{eventId}/images/...
events/{eventId}/thumbs/...
events/{eventId}/embeddings.json
```

Recommended `manifest.json`:

```json
{
  "eventId": "sample-wedding",
  "images": [
    {
      "id": "img-001",
      "key": "events/sample-wedding/images/reception/img-001.jpg",
      "thumbnailKey": "events/sample-wedding/thumbs/reception/img-001.jpg",
      "tags": ["reception", "top"],
      "score": 0.94,
      "hasFace": true,
      "selfieCandidate": false,
      "width": 1600,
      "height": 2200,
      "capturedAt": "2026-02-14T18:30:00.000Z",
      "embedding": [0.012, 0.034]
    }
  ]
}
```

If the manifest is missing, `/lib/r2.ts` lists objects under `events/{eventId}/images/` and derives thumbnails from the matching `thumbs` path.

## Environment

Copy `.env.example` to `.env.local` and fill the R2 credentials:

```bash
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=snapcull-gallery
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://cdn.example.com
FACE_MATCH_THRESHOLD=0.82
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Selfies are parsed in `/api/search`, processed in memory from a temporary upload file, and deleted in the request `finally` block.
