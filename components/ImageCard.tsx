"use client";

import Image from "next/image";
import { Check, Download, Heart } from "lucide-react";
import { type ImageAsset, cn, isRemoteUrl, shimmerBlurDataUrl } from "@/lib/utils";

type ImageCardProps = {
  image: ImageAsset;
  isWishlisted?: boolean;
  isSelected?: boolean;
  priority?: boolean;
  onOpen?: (image: ImageAsset) => void;
  onToggleWishlist?: (image: ImageAsset) => void;
  onToggleSelect?: (image: ImageAsset) => void;
  selectable?: boolean;
};

export default function ImageCard({
  image,
  isSelected = false,
  isWishlisted = false,
  priority,
  onOpen,
  onToggleSelect,
  onToggleWishlist,
  selectable = false
}: ImageCardProps) {
  const aspectRatio = `${image.width || 4} / ${image.height || 5}`;
  const src = image.thumbnailUrl || image.url;

  return (
    <article className="masonry-item mb-3 sm:mb-4">
      <div className="group relative overflow-hidden rounded-xl bg-slate-200 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-soft">
        {selectable ? (
          <button
            type="button"
            className={cn(
              "absolute left-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 shadow-sm backdrop-blur transition",
              isSelected ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-white/85 text-slate-700 hover:bg-white"
            )}
            aria-label={isSelected ? "Deselect image" : "Select image"}
            title={isSelected ? "Deselect image" : "Select image"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect?.(image);
            }}
          >
            <Check className={cn("h-4 w-4", isSelected && "stroke-[2.8]")} aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="button"
          className={cn(
            "absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/85 text-slate-700 shadow-sm backdrop-blur transition",
            "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900",
            isWishlisted ? "border-rose-200 bg-rose-500 text-white hover:bg-rose-400" : "hover:bg-white hover:text-rose-500"
          )}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleWishlist?.(image);
          }}
        >
          <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onOpen?.(image)}
          className="block w-full cursor-zoom-in text-left"
          aria-label="Open image"
        >
          <div className="relative w-full" style={{ aspectRatio }}>
            <Image
              src={src}
              alt={image.tags.length ? `${image.tags.join(", ")} wedding moment` : "Wedding gallery photo"}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition duration-500 group-hover:scale-[1.025]"
              placeholder="blur"
              blurDataURL={image.blurDataUrl || shimmerBlurDataUrl}
              unoptimized={isRemoteUrl(src)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          </div>
        </button>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="flex min-w-0 flex-wrap gap-1">
            {image.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium capitalize text-slate-800 shadow-sm">
                {tag === "top" ? "Top" : tag}
              </span>
            ))}
          </div>
          <a
            href={image.url}
            download
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm transition",
              "hover:bg-slate-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            )}
            aria-label="Download image"
            title="Download"
            onClick={(event) => event.stopPropagation()}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
