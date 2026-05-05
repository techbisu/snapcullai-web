"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, Heart, X } from "lucide-react";
import { type ImageAsset, cn, isRemoteUrl, shimmerBlurDataUrl } from "@/lib/utils";

type ImageModalProps = {
  image: ImageAsset | null;
  images?: ImageAsset[];
  isWishlisted: boolean;
  onNavigate?: (nextIndex: number) => void;
  onClose: () => void;
  onToggleWishlist: (image: ImageAsset) => void;
};

export default function ImageModal({ image, images = [], isWishlisted, onNavigate, onClose, onToggleWishlist }: ImageModalProps) {
  const currentIndex = image ? images.findIndex((item) => item.id === image.id) : -1;
  const canNavigate = images.length > 1 && currentIndex >= 0;

  useEffect(() => {
    if (!image) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && canNavigate) {
        onNavigate?.((currentIndex + 1) % images.length);
      }
      if (event.key === "ArrowLeft" && canNavigate) {
        onNavigate?.((currentIndex - 1 + images.length) % images.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, currentIndex, image, images.length, onClose, onNavigate]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm" role="dialog" aria-modal="true">
      {canNavigate ? (
        <>
          <button
            type="button"
            onClick={() => onNavigate?.((currentIndex - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] backdrop-blur transition hover:bg-slate-950/75 sm:left-5"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.((currentIndex + 1) % images.length)}
            className="absolute right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] backdrop-blur transition hover:bg-slate-950/75 sm:right-5"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
          </button>
        </>
      ) : null}

      <div className="absolute right-3 top-3 z-10 flex gap-2 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={() => onToggleWishlist(image)}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition",
            isWishlisted ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-white/95 text-slate-950 hover:bg-white"
          )}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} aria-hidden="true" />
        </button>
        <a
          href={image.url}
          download
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm transition hover:bg-white"
          aria-label="Download image"
          title="Download"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-sm transition hover:bg-white"
          aria-label="Close image preview"
          title="Close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <button type="button" className="absolute inset-0 cursor-zoom-out" onClick={onClose} aria-label="Close image preview" />
      <div className="pointer-events-none relative flex h-full w-full items-center justify-center p-3 sm:p-8">
        <div className="relative h-full max-h-[92vh] w-full max-w-6xl">
          <Image
            src={image.url}
            alt={image.tags.length ? `${image.tags.join(", ")} wedding moment` : "Wedding gallery photo"}
            fill
            sizes="100vw"
            className="object-contain"
            placeholder="blur"
            blurDataURL={image.blurDataUrl || shimmerBlurDataUrl}
            unoptimized={isRemoteUrl(image.url)}
          />
        </div>
      </div>
      {canNavigate ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      ) : null}
    </div>
  );
}
