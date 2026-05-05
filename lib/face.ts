import sharp from "sharp";
import { getEmbeddings, getImages } from "@/lib/r2";
import { type ImageAsset } from "@/lib/utils";

export type FaceMatch = ImageAsset & {
  similarity: number;
};

const VECTOR_SIZE = 16;

export async function extractFaceEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const raw = await sharp(imageBuffer, { failOn: "none" })
    .rotate()
    .resize(VECTOR_SIZE, VECTOR_SIZE, {
      fit: "cover",
      position: "centre"
    })
    .greyscale()
    .raw()
    .toBuffer();

  const values = Array.from(raw, (value) => value / 255);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);
  const magnitude = Math.hypot(...centered) || 1;

  return centered.map((value) => value / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;

  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    aMagnitude += a[index] * a[index];
    bMagnitude += b[index] * b[index];
  }

  const denominator = Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}

export async function searchMatches(eventId: string, selfieBuffer: Buffer): Promise<FaceMatch[]> {
  const [queryEmbedding, embeddings, imagePage] = await Promise.all([
    extractFaceEmbedding(selfieBuffer),
    getEmbeddings(eventId),
    getImages({ eventId, filter: "all", limit: 60 })
  ]);

  if (!embeddings.length) {
    const fallbackPage = await getImages({ eventId, filter: "selfie", limit: 24 });
    return fallbackPage.images.map((image, index) => ({
      ...image,
      similarity: Math.max(0.5, 0.95 - index * 0.02)
    }));
  }

  const imageById = new Map(imagePage.images.map((image) => [image.id, image]));
  const threshold = Number(process.env.FACE_MATCH_THRESHOLD || 0.82);

  return embeddings
    .map((record) => ({
      image: imageById.get(record.imageId),
      similarity: cosineSimilarity(queryEmbedding, record.embedding)
    }))
    .filter((match): match is { image: ImageAsset; similarity: number } => Boolean(match.image))
    .filter((match) => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 24)
    .map(({ image, similarity }) => ({
      ...image,
      similarity
    }));
}
