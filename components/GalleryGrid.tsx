"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, Copy, Download, EyeOff, Heart, LayoutTemplate, Play, Printer, Sparkles } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import ImageCard from "@/components/ImageCard";
import ImageModal from "@/components/ImageModal";
import MobileActionBar from "@/components/MobileActionBar";
import SlideshowOverlay from "@/components/SlideshowOverlay";
import { experienceEvents } from "@/lib/experience";
import { addRequestIds, readEventRequests, subscribeToRequests, type EventRequests } from "@/lib/requests";
import { type GalleryFilter, type ImageAsset, cn } from "@/lib/utils";
import { readWishlistImages, subscribeToWishlist, toggleWishlistImage } from "@/lib/wishlist";

type GalleryGridProps = {
  eventId: string;
  initialImages: ImageAsset[];
  initialCursor?: string;
};

type ApiResponse = {
  images: ImageAsset[];
  nextCursor?: string;
};

export default function GalleryGrid({ eventId, initialImages, initialCursor }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("all");
  const [images, setImages] = useState(initialImages);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialCursor);
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [wishlistImages, setWishlistImages] = useState<ImageAsset[]>([]);
  const [requests, setRequests] = useState<EventRequests>({ albumIds: [], printIds: [] });
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<string[]>([]);
  const [hideSaved, setHideSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowStartIndex, setSlideshowStartIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const wishlistSet = new Set(wishlistImages.map((image) => image.id));
  const displayImages =
    activeFilter === "wishlist" ? wishlistImages : hideSaved ? images.filter((image) => !wishlistSet.has(image.id)) : images;
  const selectedWishlistImages = wishlistImages.filter((image) => selectedWishlistIds.includes(image.id));
  const recommendationSeed = selectedImage || wishlistImages[0] || images[0] || null;
  const recommendedImages = getRecommendedImages({
    availableImages: dedupeImages([...images, ...wishlistImages]),
    seed: recommendationSeed
  });

  const fetchImages = useCallback(
    async ({ filter, cursor }: { filter: GalleryFilter; cursor?: string }) => {
      const params = new URLSearchParams({
        eventId,
        filter,
        limit: "24"
      });

      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/images?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to load gallery images.");
      }

      return (await response.json()) as ApiResponse;
    },
    [eventId]
  );

  const handleFilterChange = useCallback(
    async (filter: GalleryFilter) => {
      setActiveFilter(filter);
      setError(null);

      if (filter === "wishlist") {
        setSelectedWishlistIds((current) => (current.length ? current : wishlistImages.map((image) => image.id)));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const data = await fetchImages({ filter });
        setImages(data.images);
        setNextCursor(data.nextCursor);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load gallery images.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchImages, wishlistImages]
  );

  const toggleWishlist = useCallback(
    (image: ImageAsset) => {
      setWishlistImages(toggleWishlistImage(eventId, image));
    },
    [eventId]
  );

  const loadMore = useCallback(async () => {
    if (activeFilter === "wishlist" || !nextCursor || isLoading || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const data = await fetchImages({ filter: activeFilter, cursor: nextCursor });
      setImages((current) => [...current, ...data.images]);
      setNextCursor(data.nextCursor);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load more images.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeFilter, fetchImages, isLoading, isLoadingMore, nextCursor]);

  useEffect(() => {
    setWishlistImages(readWishlistImages(eventId));
    return subscribeToWishlist(eventId, setWishlistImages);
  }, [eventId]);

  useEffect(() => {
    setRequests(readEventRequests(eventId));
    return subscribeToRequests(eventId, setRequests);
  }, [eventId]);

  useEffect(() => {
    if (activeFilter !== "wishlist") return;

    setSelectedWishlistIds((current) => {
      const next = current.filter((id) => wishlistImages.some((image) => image.id === id));

      if (next.length > 0) {
        return areSameIds(current, next) ? current : next;
      }

      const allIds = wishlistImages.map((image) => image.id);
      return areSameIds(current, allIds) ? current : allIds;
    });
  }, [activeFilter, wishlistImages]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || activeFilter === "wishlist") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "900px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeFilter, loadMore, nextCursor]);

  const toggleWishlistSelection = (image: ImageAsset) => {
    setSelectedWishlistIds((current) =>
      current.includes(image.id) ? current.filter((id) => id !== image.id) : [...current, image.id]
    );
  };

  const openSlideshow = useCallback((startImage?: ImageAsset) => {
    if (!displayImages.length) return;

    const startIndex = startImage ? Math.max(displayImages.findIndex((image) => image.id === startImage.id), 0) : 0;
    setSlideshowStartIndex(startIndex);
    setIsSlideshowOpen(true);
  }, [displayImages]);

  useEffect(() => {
    const handleFilterEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ filter?: GalleryFilter }>).detail;
      if (detail?.filter) {
        void handleFilterChange(detail.filter);
      }
    };

    const handleSlideshowEvent = () => {
      openSlideshow();
    };

    const handleScrollEvent = () => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.addEventListener(experienceEvents.setGalleryFilter, handleFilterEvent as EventListener);
    window.addEventListener(experienceEvents.openSlideshow, handleSlideshowEvent);
    window.addEventListener(experienceEvents.scrollGallery, handleScrollEvent);

    return () => {
      window.removeEventListener(experienceEvents.setGalleryFilter, handleFilterEvent as EventListener);
      window.removeEventListener(experienceEvents.openSlideshow, handleSlideshowEvent);
      window.removeEventListener(experienceEvents.scrollGallery, handleScrollEvent);
    };
  }, [handleFilterChange, openSlideshow]);

  const handleDownloadSelected = () => {
    if (!selectedWishlistImages.length) return;

    selectedWishlistImages.forEach((image) => {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `${image.id}.jpg`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    });

    setFeedback(`Downloading ${selectedWishlistImages.length} selected photos.`);
  };

  const handleShareSelected = async () => {
    if (!selectedWishlistImages.length) return;

    const shareText = [
      "SnapCull wedding gallery selection",
      ...selectedWishlistImages.slice(0, 6).map((image) => image.url)
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "SnapCull Gallery Selection",
          text: shareText
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }

      setFeedback(`Shared ${selectedWishlistImages.length} selected photos.`);
    } catch {
      setFeedback("Share was canceled or unavailable on this device.");
    }
  };

  const handleRequestAction = (type: "albumIds" | "printIds") => {
    if (!selectedWishlistImages.length) return;

    setRequests(addRequestIds(eventId, type, selectedWishlistImages));
    setFeedback(type === "printIds" ? "Added selection to print requests." : "Added selection to the album shortlist.");
  };

  return (
    <section ref={sectionRef} className="flex flex-col gap-5 pb-24 sm:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar activeFilter={activeFilter} onChange={handleFilterChange} disabled={isLoading} wishlistCount={wishlistImages.length} />
        <div className="flex items-center gap-2">
          {activeFilter !== "wishlist" ? (
            <button
              type="button"
              onClick={() => setHideSaved((value) => !value)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition",
                hideSaved ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50"
              )}
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              {hideSaved ? "Showing new only" : "Hide saved"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openSlideshow(selectedImage || displayImages[0])}
            className="hidden min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:inline-flex"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Memory Reel
          </button>
          <p className="hidden text-sm text-slate-500 sm:block">
            {displayImages.length} {activeFilter === "wishlist" ? "saved" : "photos"}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div>
      ) : null}

      {activeFilter === "wishlist" ? (
        <div className="rounded-[1.6rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Wishlist Studio</p>
                <h3 className="font-display mt-2 text-2xl text-slate-950">Curate your saved moments</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select favorites, download them in batches, share the set, or mark them for print and album delivery.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[15rem]">
                <RequestStat icon={Printer} label="Print requests" value={requests.printIds.length} />
                <RequestStat icon={LayoutTemplate} label="Album shortlist" value={requests.albumIds.length} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedWishlistIds(wishlistImages.map((image) => image.id))}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedWishlistIds([])}
                className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={!selectedWishlistImages.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download selected
              </button>
              <button
                type="button"
                onClick={() => void handleShareSelected()}
                disabled={!selectedWishlistImages.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Share selected
              </button>
              <button
                type="button"
                onClick={() => handleRequestAction("printIds")}
                disabled={!selectedWishlistImages.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Request prints
              </button>
              <button
                type="button"
                onClick={() => handleRequestAction("albumIds")}
                disabled={!selectedWishlistImages.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                Album shortlist
              </button>
            </div>

            <p className="text-sm text-slate-500">
              {selectedWishlistImages.length} selected from {wishlistImages.length} saved photos
            </p>
          </div>
        </div>
      ) : null}

      {recommendedImages.length > 0 ? (
        <div className="rounded-[1.6rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Recommended</p>
              <h3 className="text-lg font-semibold text-slate-950">You may also like these moments</h3>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recommendedImages.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedImage(image)}
                className="group min-w-[10rem] max-w-[10rem] text-left"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.tags.length ? `${image.tags.join(", ")} wedding moment` : "Wedding gallery photo"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-3">
                    <div className="flex flex-wrap gap-1">
                      {image.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium capitalize text-white backdrop-blur">
                          {tag === "top" ? "Top" : tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? <GallerySkeleton /> : null}

      {!isLoading && displayImages.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
          {activeFilter === "wishlist" ? "No wishlisted photos yet. Tap the heart on any image to save it here." : "No photos found for this filter."}
        </div>
      ) : null}

      {!isLoading && displayImages.length > 0 ? (
        <div className={cn("masonry-grid columns-2 sm:columns-3 lg:columns-4")}>
          {displayImages.map((image, index) => (
            <ImageCard
              key={image.id}
              image={image}
              isSelected={selectedWishlistIds.includes(image.id)}
              priority={index < 4}
              isWishlisted={wishlistSet.has(image.id)}
              onOpen={setSelectedImage}
              onToggleSelect={toggleWishlistSelection}
              onToggleWishlist={toggleWishlist}
              selectable={activeFilter === "wishlist"}
            />
          ))}
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-8" aria-hidden="true" />

      {activeFilter !== "wishlist" && isLoadingMore ? <GallerySkeleton compact /> : null}

      <ImageModal
        image={selectedImage}
        images={displayImages}
        isWishlisted={selectedImage ? wishlistSet.has(selectedImage.id) : false}
        onClose={() => setSelectedImage(null)}
        onNavigate={(nextIndex) => setSelectedImage(displayImages[nextIndex] || null)}
        onToggleWishlist={toggleWishlist}
      />
      <SlideshowOverlay
        images={displayImages}
        initialIndex={slideshowStartIndex}
        isOpen={isSlideshowOpen}
        onClose={() => setIsSlideshowOpen(false)}
      />
      <MobileActionBar activeFilter={activeFilter} wishlistCount={wishlistImages.length} />
    </section>
  );
}

function RequestStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Heart;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function dedupeImages(images: ImageAsset[]) {
  const map = new Map<string, ImageAsset>();

  images.forEach((image) => {
    if (!map.has(image.id)) {
      map.set(image.id, image);
    }
  });

  return Array.from(map.values());
}

function areSameIds(current: string[], next: string[]) {
  return current.length === next.length && current.every((value, index) => value === next[index]);
}

function getRecommendedImages({
  availableImages,
  seed
}: {
  availableImages: ImageAsset[];
  seed: ImageAsset | null;
}) {
  if (!seed) return [];

  return availableImages
    .filter((image) => image.id !== seed.id)
    .map((image) => ({
      image,
      score:
        image.tags.filter((tag) => seed.tags.includes(tag)).length * 10 +
        (seed.tags.includes("top") || image.tags.includes("top") ? 2 : 0) +
        image.score
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.image);
}

function GallerySkeleton({ compact = false }: { compact?: boolean }) {
  const items = compact ? 4 : 12;

  return (
    <div className="masonry-grid columns-2 sm:columns-3 lg:columns-4" aria-hidden="true">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="masonry-item mb-3 sm:mb-4">
          <div
            className="animate-pulse rounded-xl bg-slate-200"
            style={{ height: `${index % 3 === 0 ? 16 : index % 3 === 1 ? 22 : 28}rem` }}
          />
        </div>
      ))}
    </div>
  );
}
