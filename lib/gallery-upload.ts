import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadPhotoDescriptor = {
  photoId: string;
  fileName: string;
  contentType: string;
  label: string;
  capturedAt: number;
  faceCount: number;
  hasFace: boolean;
  selfieCandidate: boolean;
  smileDetected: boolean;
  eyesOpen: boolean;
  overallScore: number;
  isDuplicate: boolean;
};

type UploadedPhotoPayload = {
  photoId: string;
  objectKey: string;
  imageUrl: string;
  label: string;
  capturedAt: number;
  faceCount: number;
  hasFace: boolean;
  selfieCandidate: boolean;
  smileDetected: boolean;
  eyesOpen: boolean;
  overallScore: number;
  isDuplicate: boolean;
};

type ManifestImage = {
  id: string;
  key: string;
  thumbnailKey: string;
  tags: string[];
  score: number;
  hasFace: boolean;
  selfieCandidate: boolean;
  width: number;
  height: number;
  capturedAt?: string;
};

type Manifest = {
  eventId: string;
  eventName?: string;
  images: ManifestImage[];
};

type UploadBatch = {
  eventId: string;
  eventName: string;
  uploadBatchId: string;
  createdAt: string;
};

const bucket = process.env.CLOUDFLARE_R2_BUCKET;
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
const fallbackAppUrl = "https://eventculling.vercel.app";

let cachedClient: S3Client | null = null;

function hasR2Config() {
  return Boolean(bucket && endpoint && accessKeyId && secretAccessKey);
}

function getClient() {
  if (!hasR2Config()) {
    throw new Error("Cloudflare R2 credentials are not configured.");
  }

  cachedClient ??= new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!
    }
  });

  return cachedClient;
}

function ensureBucket() {
  if (!bucket) {
    throw new Error("CLOUDFLARE_R2_BUCKET is not configured.");
  }
  return bucket;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackAppUrl).replace(/\/$/, "");
}

export function buildGalleryUrl(eventId: string) {
  return `${appUrl()}/event/${encodeURIComponent(eventId)}`;
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "photo";
}

function fileExtension(fileName: string, contentType: string) {
  const explicit = fileName.match(/\.[a-z0-9]+$/i)?.[0];
  if (explicit) return explicit.toLowerCase();

  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/avif") return ".avif";
  return ".jpg";
}

function publicAssetUrl(objectKey: string) {
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${encodeURI(objectKey)}`;
  }
  return `${appUrl()}/api/images?objectKey=${encodeURIComponent(objectKey)}`;
}

function labelTags(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "best") return ["top"];
  if (normalized === "review") return ["review"];
  if (normalized === "reject") return ["rejected"];
  return [];
}

export async function createUploadSession(input: {
  eventId: string;
  eventName: string;
  photos: UploadPhotoDescriptor[];
}) {
  const client = getClient();
  const resolvedBucket = ensureBucket();
  const uploadBatchId = randomUUID();
  const galleryUrl = buildGalleryUrl(input.eventId);

  const uploads = await Promise.all(
    input.photos.map(async (photo) => {
      const extension = fileExtension(photo.fileName, photo.contentType);
      const safeName = sanitizeSegment(photo.fileName.replace(/\.[a-z0-9]+$/i, ""));
      const labelFolder = sanitizeSegment(photo.label);
      const objectKey = `events/${input.eventId}/images/${labelFolder}/${photo.photoId}-${safeName}${extension}`;
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: resolvedBucket,
          Key: objectKey,
          ContentType: photo.contentType
        }),
        { expiresIn: 60 * 15 }
      );

      return {
        photoId: photo.photoId,
        objectKey,
        uploadUrl,
        publicUrl: publicAssetUrl(objectKey),
        headers: {
          "Content-Type": photo.contentType
        }
      };
    })
  );

  const uploadBatch: UploadBatch = {
    eventId: input.eventId,
    eventName: input.eventName,
    uploadBatchId,
    createdAt: new Date().toISOString()
  };

  await client.send(
    new PutObjectCommand({
      Bucket: resolvedBucket,
      Key: `events/${input.eventId}/upload-batches/${uploadBatchId}.json`,
      Body: JSON.stringify(uploadBatch, null, 2),
      ContentType: "application/json"
    })
  );

  return {
    galleryUrl,
    eventId: input.eventId,
    uploadBatchId,
    uploads
  };
}

async function readManifest(eventId: string): Promise<Manifest | null> {
  const client = getClient();
  const resolvedBucket = ensureBucket();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: resolvedBucket,
        Key: `events/${eventId}/manifest.json`
      })
    );
    const text = await response.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as Manifest;
  } catch {
    return null;
  }
}

async function readUploadBatch(eventId: string, uploadBatchId: string): Promise<UploadBatch | null> {
  const client = getClient();
  const resolvedBucket = ensureBucket();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: resolvedBucket,
        Key: `events/${eventId}/upload-batches/${uploadBatchId}.json`
      })
    );
    const text = await response.Body?.transformToString();
    if (!text) return null;
    return JSON.parse(text) as UploadBatch;
  } catch {
    return null;
  }
}

export async function completeUpload(eventId: string, uploadBatchId: string, uploadedPhotos: UploadedPhotoPayload[]) {
  const client = getClient();
  const resolvedBucket = ensureBucket();
  const currentManifest = await readManifest(eventId);
  const uploadBatch = await readUploadBatch(eventId, uploadBatchId);
  const existing = new Map((currentManifest?.images || []).map((image) => [image.id, image]));

  uploadedPhotos.forEach((photo) => {
    const tags = new Set(labelTags(photo.label));
    if (photo.hasFace) tags.add("face");
    if (photo.selfieCandidate) tags.add("selfie");

    existing.set(photo.photoId, {
      id: photo.photoId,
      key: photo.objectKey,
      thumbnailKey: photo.objectKey,
      tags: Array.from(tags),
      score: photo.overallScore,
      hasFace: photo.hasFace,
      selfieCandidate: photo.selfieCandidate,
      width: 1400,
      height: 1800,
      capturedAt: photo.capturedAt > 0 ? new Date(photo.capturedAt).toISOString() : undefined
    });
  });

  const manifest: Manifest = {
    eventId,
    eventName: currentManifest?.eventName || uploadBatch?.eventName || eventId,
    images: Array.from(existing.values()).sort((a, b) => {
      const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return bTime - aTime;
    })
  };

  await client.send(
    new PutObjectCommand({
      Bucket: resolvedBucket,
      Key: `events/${eventId}/manifest.json`,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: "application/json"
    })
  );

  return {
    galleryUrl: buildGalleryUrl(eventId)
  };
}
