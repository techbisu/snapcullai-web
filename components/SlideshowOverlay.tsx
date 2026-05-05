"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, Pause, Play, X } from "lucide-react";
import { type ImageAsset, cn, isRemoteUrl, shimmerBlurDataUrl } from "@/lib/utils";

type SlideshowOverlayProps = {
  images: ImageAsset[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
};

export default function SlideshowOverlay({ images, initialIndex = 0, isOpen, onClose }: SlideshowOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || images.length < 2) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % images.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [images.length, isOpen, isPlaying]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setCurrentIndex((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setCurrentIndex((index) => (index - 1 + images.length) % images.length);
      if (event.key === " ") {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, isOpen, onClose]);

  if (!isOpen || images.length === 0) return null;

  const image = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/96 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 text-white sm:px-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-100/75">Memory Reel</p>
          <p className="mt-1 text-sm text-white/80">
            {currentIndex + 1} / {images.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
          >
            {isPlaying ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
          </button>
          <a
            href={image.url}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Download current image"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Close slideshow"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative flex h-full w-full items-center justify-center p-5 sm:p-10">
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => (index - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] backdrop-blur transition hover:bg-slate-950/75 sm:left-5"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((index) => (index + 1) % images.length)}
              className="absolute right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-slate-950/55 text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] backdrop-blur transition hover:bg-slate-950/75 sm:right-5"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
            </button>
          </>
        ) : null}

        <div className="relative h-full w-full max-w-6xl overflow-hidden rounded-[2rem]">
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent p-6 text-white">
            <div className="flex flex-wrap gap-2">
              {image.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium capitalize backdrop-blur">
                  {tag === "top" ? "Top" : tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 backdrop-blur">
          {images.slice(0, Math.min(images.length, 6)).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn("h-2.5 w-2.5 rounded-full transition", index === currentIndex ? "bg-white" : "bg-white/35")}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
