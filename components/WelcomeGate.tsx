"use client";

import { useEffect, useState } from "react";
import { ArrowRight, HeartHandshake, LockKeyhole, Sparkles } from "lucide-react";
import { dispatchExperienceEvent, experienceEvents } from "@/lib/experience";

type WelcomeGateProps = {
  eventId: string;
  eventName: string;
};

export default function WelcomeGate({ eventId, eventName }: WelcomeGateProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const key = `snapcull:gate:${eventId}`;
    const seen = window.sessionStorage.getItem(key);
    if (!seen) {
      setIsOpen(true);
    }
  }, [eventId]);

  const closeGate = () => {
    window.sessionStorage.setItem(`snapcull:gate:${eventId}`, "seen");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(145deg,rgba(72,26,39,0.97),rgba(133,45,70,0.94),rgba(33,17,27,0.98))] p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.38)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),transparent_28%),linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)]" />
        <div className="relative flex flex-col items-center gap-5 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber-100">
            <HeartHandshake className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/80">Private Wedding Gallery</p>
            <h2 className="font-display mt-3 text-4xl leading-none tracking-tight">{eventName}</h2>
            <p className="mt-3 text-sm leading-6 text-rose-50/85">
              Enter the guest experience to browse curated moments, save favorites, and find your photos with AI search.
            </p>
          </div>

          <div className="grid w-full gap-2 rounded-[1.5rem] border border-white/12 bg-white/10 p-3 text-left text-sm text-rose-50/85">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-amber-100" aria-hidden="true" />
              Invite-only gallery access
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-100" aria-hidden="true" />
              Wishlist, slideshow, and guest photo search
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={closeGate}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-50"
            >
              Enter Gallery
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                closeGate();
                dispatchExperienceEvent(experienceEvents.scrollGallery);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/18 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Jump To Highlights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
