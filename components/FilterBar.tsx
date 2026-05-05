"use client";

import { Heart } from "lucide-react";
import { type GalleryFilter, cn } from "@/lib/utils";

const filters: Array<{ value: GalleryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "top", label: "Top 20" },
  { value: "face", label: "Faces" },
  { value: "selfie", label: "Selfies" },
  { value: "haldi", label: "Haldi" },
  { value: "reception", label: "Reception" },
  { value: "wishlist", label: "Wishlist" }
];

type FilterBarProps = {
  activeFilter: GalleryFilter;
  onChange: (filter: GalleryFilter) => void;
  disabled?: boolean;
  wishlistCount?: number;
};

export default function FilterBar({ activeFilter, onChange, disabled, wishlistCount = 0 }: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white/85 p-1 shadow-sm backdrop-blur">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(filter.value)}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium text-slate-600 transition",
            "hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
            activeFilter === filter.value && "bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white"
          )}
          aria-pressed={activeFilter === filter.value}
        >
          {filter.value === "wishlist" ? <Heart className="h-4 w-4" aria-hidden="true" /> : null}
          <span>{filter.label}</span>
          {filter.value === "wishlist" ? (
            <span
              className={cn(
                "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                activeFilter === filter.value ? "bg-white/15 text-white" : "bg-rose-100 text-rose-700"
              )}
            >
              {wishlistCount}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
