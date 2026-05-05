import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type GalleryFilter = "all" | "top" | "face" | "selfie" | "haldi" | "reception" | "wishlist";

export type ImageAsset = {
  id: string;
  eventId: string;
  key?: string;
  thumbnailKey?: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  score: number;
  hasFace?: boolean;
  selfieCandidate?: boolean;
  width: number;
  height: number;
  blurDataUrl?: string;
  capturedAt?: string;
};

export type ImagePage = {
  images: ImageAsset[];
  nextCursor?: string;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function normalizeFilter(filter: unknown): GalleryFilter {
  const value = Array.isArray(filter) ? filter[0] : filter;

  if (value === "top" || value === "top20") {
    return "top";
  }

  if (value === "haldi" || value === "reception" || value === "face" || value === "selfie") {
    return value;
  }

  return "all";
}

export function formatEventName(eventId: string) {
  return decodeURIComponent(eventId)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function stableImageId(key: string) {
  return key
    .replace(/^events\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

export function tagsFromKey(key: string) {
  const lower = key.toLowerCase();
  const tags = new Set<string>();

  if (lower.includes("haldi")) tags.add("haldi");
  if (lower.includes("reception")) tags.add("reception");
  if (lower.includes("top") || lower.includes("highlight")) tags.add("top");

  return Array.from(tags);
}

export function matchesFilter(image: ImageAsset, filter: GalleryFilter) {
  if (filter === "all") return true;
  if (filter === "wishlist") return false;
  if (filter === "top") return image.tags.includes("top") || image.score >= 0.85;
  if (filter === "face") return image.hasFace === true;
  if (filter === "selfie") return image.selfieCandidate === true;
  return image.tags.includes(filter);
}

export function paginateImages(images: ImageAsset[], limit: number, cursor?: string): ImagePage {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const start = cursor ? Math.max(images.findIndex((image) => image.id === cursor) + 1, 0) : 0;
  const page = images.slice(start, start + safeLimit);
  const next = images[start + safeLimit]?.id;

  return {
    images: page,
    nextCursor: next
  };
}

export const shimmerBlurDataUrl =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNDAwJyBoZWlnaHQ9JzMwMCcgdmlld0JveD0nMCAwIDQwMCAzMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PGZpbHRlciBpZD0nYicgY29sb3JJbnRlcnBvbGF0aW9uRmlsdGVycz0nc1JHQic+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0nMjAnLz48ZmVDb21wb25lbnRUcmFuc2Zlcj48ZmVGdW5jUiB0eXBlPSdsaW5lYXInIHNsb3BlPScxLjInLz48ZmVGdW5jRyB0eXBlPSdsaW5lYXInIHNsb3BlPScxLjInLz48ZmVGdW5jQiB0eXBlPSdsaW5lYXInIHNsb3BlPScxLjInLz48L2ZlQ29tcG9uZW50VHJhbnNmZXI+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSczMDAnIGZpbGw9JyNlMmU4ZjAnLz48ZyBmaWx0ZXI9J3VybCgjYiknPjxjaXJjbGUgY3g9JzgwJyBjeT0nNzAnIHI9JzgwJyBmaWxsPScjZmJhNWE1Jy8+PGNpcmNsZSBjeD0nMzEwJyBjeT0nMTIwJyByPScxMDA nIGZpbGw9JyM5NGEzYjgnLz48Y2lyY2xlIGN4PScyMDAnIGN5PScyMzAnIHI9JzkwJyBmaWxsPScjZjhmYWZjJy8+PC9nPjwvc3ZnPg==".replace(
    /\s/g,
    ""
  );
