import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
  type _Object
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  type GalleryFilter,
  type ImageAsset,
  type ImagePage,
  formatEventName,
  matchesFilter,
  paginateImages,
  shimmerBlurDataUrl,
  stableImageId,
  tagsFromKey
} from "@/lib/utils";

type GetImagesInput = {
  eventId: string;
  filter?: GalleryFilter;
  limit?: number;
  cursor?: string;
};

export type StoredEmbedding = {
  imageId: string;
  embedding: number[];
};

type R2ManifestItem = Partial<ImageAsset> & {
  key: string;
  thumbnailKey?: string;
  embedding?: number[];
};

type R2Manifest = {
  eventId?: string;
  eventName?: string;
  images: R2ManifestItem[];
};

const DEMO_EVENT_ID = "sample-wedding";

export type EventSummary = {
  eventId: string;
  eventName: string;
};

const bucket = process.env.CLOUDFLARE_R2_BUCKET;
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

let cachedClient: S3Client | null = null;

function hasR2Config() {
  return Boolean(bucket && endpoint && accessKeyId && secretAccessKey);
}

function getClient() {
  if (!hasR2Config()) return null;

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

export async function getImageUrl(key: string) {
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${encodeURI(key)}`;
  }

  const client = getClient();
  if (!client || !bucket) {
    throw new Error("R2 credentials or public base URL are required to sign private image URLs.");
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }),
    { expiresIn: 60 * 10 }
  );
}

export async function getImages({
  eventId,
  filter = "all",
  limit = 24,
  cursor
}: GetImagesInput): Promise<ImagePage> {
  const images = await readEventImages(eventId);
  const filtered = images
    .filter((image) => matchesFilter(image, filter))
    .sort((a, b) => {
      if (filter === "top" || filter === "face" || filter === "selfie") return b.score - a.score;
      return Number(new Date(b.capturedAt || 0)) - Number(new Date(a.capturedAt || 0));
    });

  return paginateImages(filtered, filter === "top" ? Math.min(limit, 20) : limit, cursor);
}

export async function hasEvent(eventId: string): Promise<boolean> {
  if (!hasR2Config()) {
    return eventId === DEMO_EVENT_ID;
  }

  const manifest = await readManifest(eventId).catch(() => null);
  if (manifest?.images?.length) {
    return true;
  }

  const images = await listImagesFromBucket(eventId);
  return images.length > 0;
}

export async function getEventSummary(eventId: string): Promise<EventSummary | null> {
  if (!(await hasEvent(eventId))) {
    return null;
  }

  if (!hasR2Config()) {
    return {
      eventId,
      eventName: eventId === DEMO_EVENT_ID ? "Sample Wedding" : formatEventName(eventId)
    };
  }

  const manifest = await readManifest(eventId).catch(() => null);
  return {
    eventId,
    eventName: manifest?.eventName?.trim() || formatEventName(eventId)
  };
}

export async function getEmbeddings(eventId: string): Promise<StoredEmbedding[]> {
  if (!hasR2Config()) {
    if (eventId !== DEMO_EVENT_ID) {
      return [];
    }

    return seedImages(eventId).map((image, index) => ({
      imageId: image.id,
      embedding: deterministicSeedEmbedding(index)
    }));
  }

  const manifest = await readManifest(eventId);
  if (manifest?.images.some((image) => image.embedding?.length)) {
    return manifest.images
      .filter((image): image is R2ManifestItem & { embedding: number[] } => Boolean(image.embedding?.length))
      .map((image) => ({
        imageId: image.id || stableImageId(image.key),
        embedding: image.embedding
      }));
  }

  const text = await readTextObject(`events/${eventId}/embeddings.json`).catch(() => null);
  if (!text) return [];

  const parsed = JSON.parse(text) as StoredEmbedding[];
  return parsed.filter((record) => record.imageId && Array.isArray(record.embedding));
}

async function readEventImages(eventId: string) {
  if (!hasR2Config()) {
    if (eventId !== DEMO_EVENT_ID) {
      return [];
    }
    return seedImages(eventId);
  }

  const manifest = await readManifest(eventId).catch(() => null);
  if (manifest?.images?.length) {
    return Promise.all(manifest.images.map((image) => normalizeManifestImage(eventId, image)));
  }

  return listImagesFromBucket(eventId);
}

async function readManifest(eventId: string) {
  const text = await readTextObject(`events/${eventId}/manifest.json`);
  return JSON.parse(text) as R2Manifest;
}

async function readTextObject(key: string) {
  const client = getClient();
  if (!client || !bucket) {
    throw new Error("R2 is not configured.");
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );

  return response.Body?.transformToString() ?? "";
}

async function normalizeManifestImage(eventId: string, image: R2ManifestItem): Promise<ImageAsset> {
  const id = image.id || stableImageId(image.key);
  const thumbnailKey = image.thumbnailKey || image.key.replace("/images/", "/thumbs/");
  const [url, thumbnailUrl] = await Promise.all([getImageUrl(image.key), getImageUrl(thumbnailKey)]);

  return {
    id,
    eventId,
    key: image.key,
    thumbnailKey,
    url,
    thumbnailUrl,
    tags: image.tags || tagsFromKey(image.key),
    score: typeof image.score === "number" ? image.score : 0,
    hasFace: image.hasFace ?? false,
    selfieCandidate: image.selfieCandidate ?? false,
    width: image.width || 1400,
    height: image.height || 1800,
    blurDataUrl: image.blurDataUrl || shimmerBlurDataUrl,
    capturedAt: image.capturedAt
  };
}

async function listImagesFromBucket(eventId: string) {
  const client = getClient();
  if (!client || !bucket) {
    return eventId === DEMO_EVENT_ID ? seedImages(eventId) : [];
  }

  const objects: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `events/${eventId}/images/`,
        ContinuationToken: continuationToken
      })
    );

    objects.push(...(response.Contents || []));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const imageObjects = objects.filter((object) => object.Key && /\.(jpe?g|png|webp|avif)$/i.test(object.Key));

  return Promise.all(
    imageObjects.map(async (object, index): Promise<ImageAsset> => {
      const key = object.Key!;
      const thumbnailKey = key.replace("/images/", "/thumbs/");

      return {
        id: stableImageId(key),
        eventId,
        key,
        thumbnailKey,
        url: await getImageUrl(key),
        thumbnailUrl: await getImageUrl(thumbnailKey),
        tags: tagsFromKey(key),
        score: Math.max(0, 1 - index / Math.max(imageObjects.length, 1)),
        hasFace: false,
        selfieCandidate: false,
        width: 1400,
        height: 1800,
        blurDataUrl: shimmerBlurDataUrl,
        capturedAt: object.LastModified?.toISOString()
      };
    })
  );
}

function seedImages(eventId: string): ImageAsset[] {
  const urls = [
    ["https://images.unsplash.com/photo-1519741497674-611481863552", ["top", "reception"], 0.98, 1600, 2200],
    ["https://images.unsplash.com/photo-1606800052052-a08af7148866", ["haldi"], 0.91, 1800, 1200],
    ["https://images.unsplash.com/photo-1511285560929-80b456fea0bc", ["reception"], 0.87, 1600, 2100],
    ["https://images.unsplash.com/photo-1469371670807-013ccf25f16a", ["top"], 0.96, 1600, 1067],
    ["https://images.unsplash.com/photo-1523438885200-e635ba2c371e", ["haldi", "top"], 0.93, 1600, 2000],
    ["https://images.unsplash.com/photo-1520854221256-17451cc331bf", ["reception"], 0.82, 1600, 1067],
    ["https://images.unsplash.com/photo-1519225421980-715cb0215aed", ["top"], 0.95, 1600, 1067],
    ["https://images.unsplash.com/photo-1537633552985-df8429e8048b", ["reception"], 0.81, 1600, 2000]
  ] as const;

  return urls.map(([url, tags, score, width, height], index) => {
    const baseUrl = `${url}?auto=format&fit=crop&w=1600&q=82`;

    return {
      id: `${eventId}-seed-${index + 1}`,
      eventId,
      url: baseUrl,
      thumbnailUrl: `${url}?auto=format&fit=crop&w=640&q=70`,
      tags: [...tags],
      score,
      hasFace: true,
      selfieCandidate: index % 3 === 0,
      width,
      height,
      blurDataUrl: shimmerBlurDataUrl,
      capturedAt: new Date(Date.now() - index * 3600_000).toISOString()
    };
  });
}

function deterministicSeedEmbedding(index: number) {
  const vector = Array.from({ length: 256 }, (_, i) => Math.sin((index + 1) * (i + 11)) * 0.5 + 0.5);
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}
