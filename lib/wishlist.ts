import { type ImageAsset } from "@/lib/utils";

const wishlistEventName = "snapcull:wishlist-change";

type WishlistChangeDetail = {
  eventId: string;
  images: ImageAsset[];
};

export function getWishlistStorageKey(eventId: string) {
  return `snapcull:wishlist:${eventId}`;
}

export function readWishlistImages(eventId: string) {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(getWishlistStorageKey(eventId));
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isImageAssetLike);
  } catch {
    window.localStorage.removeItem(getWishlistStorageKey(eventId));
    return [];
  }
}

export function writeWishlistImages(eventId: string, images: ImageAsset[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getWishlistStorageKey(eventId), JSON.stringify(images));
  window.dispatchEvent(new CustomEvent<WishlistChangeDetail>(wishlistEventName, { detail: { eventId, images } }));
}

export function toggleWishlistImage(eventId: string, image: ImageAsset) {
  const current = readWishlistImages(eventId);
  const next = current.some((item) => item.id === image.id)
    ? current.filter((item) => item.id !== image.id)
    : [image, ...current.filter((item) => item.id !== image.id)];

  writeWishlistImages(eventId, next);
  return next;
}

export function subscribeToWishlist(eventId: string, onChange: (images: ImageAsset[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<WishlistChangeDetail>).detail;
    if (detail?.eventId === eventId) {
      onChange(detail.images);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === getWishlistStorageKey(eventId)) {
      onChange(readWishlistImages(eventId));
    }
  };

  window.addEventListener(wishlistEventName, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(wishlistEventName, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

function isImageAssetLike(value: unknown): value is ImageAsset {
  if (!value || typeof value !== "object") return false;

  const image = value as Partial<ImageAsset>;
  return typeof image.id === "string" && typeof image.url === "string" && typeof image.thumbnailUrl === "string";
}
