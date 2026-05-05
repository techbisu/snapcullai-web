"use client";

import { Heart, Images, Play, Sparkles } from "lucide-react";
import { dispatchExperienceEvent, experienceEvents } from "@/lib/experience";
import { type GalleryFilter, cn } from "@/lib/utils";

type MobileActionBarProps = {
  activeFilter: GalleryFilter;
  wishlistCount: number;
};

export default function MobileActionBar({ activeFilter, wishlistCount }: MobileActionBarProps) {
  const items = [
    {
      icon: Images,
      label: "Gallery",
      isActive: activeFilter !== "wishlist",
      onClick: () => {
        dispatchExperienceEvent(experienceEvents.setGalleryFilter, { filter: "all" satisfies GalleryFilter });
        dispatchExperienceEvent(experienceEvents.scrollGallery);
      }
    },
    {
      icon: Heart,
      label: "Wishlist",
      badge: wishlistCount,
      isActive: activeFilter === "wishlist",
      onClick: () => dispatchExperienceEvent(experienceEvents.setGalleryFilter, { filter: "wishlist" satisfies GalleryFilter })
    },
    {
      icon: Sparkles,
      label: "Find",
      onClick: () => dispatchExperienceEvent(experienceEvents.openSelfieSearch)
    },
    {
      icon: Play,
      label: "Slideshow",
      onClick: () => dispatchExperienceEvent(experienceEvents.openSlideshow)
    }
  ];

  return (
    <div className="fixed inset-x-0 bottom-3 z-30 px-4 sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-full border border-white/60 bg-white/92 px-3 py-2 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative inline-flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 text-[11px] font-medium text-slate-500 transition",
                item.isActive ? "bg-rose-50 text-rose-700" : "hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 ? (
                <span className="absolute right-3 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
