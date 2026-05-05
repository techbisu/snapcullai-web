"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Facebook, Instagram, MessageCircleHeart, Music2, Youtube } from "lucide-react";
import { cn, isRemoteUrl } from "@/lib/utils";

type EventHeroProps = {
  eventName: string;
  photoCount: number;
  heroImageUrl?: string;
};

const socialIcons = [Instagram, Facebook, Youtube, Music2, MessageCircleHeart];

export default function EventHero({ eventName, photoCount, heroImageUrl }: EventHeroProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    setIsEntered(true);

    const handleScroll = () => {
      setScrollProgress(Math.min(window.scrollY / 260, 1));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <section className="relative -mx-4 -mt-5 min-h-[135svh] sm:hidden">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {heroImageUrl ? (
            <div
              style={{
                transform: `scale(${1 + scrollProgress * 0.08}) translate3d(0, ${scrollProgress * 18}px, 0)`,
                opacity: 1 - scrollProgress * 0.25
              }}
              className="absolute inset-0 transition-[transform,opacity] duration-700 ease-out"
            >
              <Image
                src={heroImageUrl}
                alt={`${eventName} event cover`}
                fill
                sizes="100vw"
                className="object-cover"
                priority
                unoptimized={isRemoteUrl(heroImageUrl)}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,12,20,0.28),rgba(32,12,20,0.50),rgba(20,12,18,0.88))]" />
            </div>
          ) : null}

          <div
            style={{
              transform: `translate3d(0, ${scrollProgress * -84}px, 0) scale(${1 - scrollProgress * 0.1})`,
              opacity: 1 - scrollProgress * 0.94,
              filter: `blur(${scrollProgress * 9}px)`
            }}
            className={cn(
              "wedding-lattice relative flex h-full flex-col justify-center overflow-hidden px-6 py-8 text-white transition-[transform,opacity,filter] duration-700 ease-out",
              heroImageUrl
                ? "bg-[linear-gradient(145deg,rgba(72,26,39,0.52),rgba(133,45,70,0.34),rgba(33,17,27,0.64)),radial-gradient(circle_at_top,rgba(251,191,36,0.20),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(253,224,71,0.10),transparent_38%)]"
                : "bg-[linear-gradient(145deg,rgba(72,26,39,0.98),rgba(133,45,70,0.95),rgba(33,17,27,0.99)),radial-gradient(circle_at_top,rgba(251,191,36,0.34),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(253,224,71,0.16),transparent_38%)]",
              isEntered ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)]" />
            <div className="relative mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
              <div className="inline-flex rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-100 backdrop-blur">
                SnapCull Wedding
              </div>
              <div className="max-w-[18rem]">
                <p className="text-[10px] uppercase tracking-[0.36em] text-amber-100/80">Wedding Gallery</p>
                <h1 className="font-display mt-7 text-[3.2rem] leading-[0.88] tracking-tight text-white">{eventName}</h1>
                <div className="mt-4 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-amber-100/75">
                  <span className="h-px w-9 bg-gradient-to-r from-transparent to-amber-100/60" />
                  Forever Starts Here
                  <span className="h-px w-9 bg-gradient-to-l from-transparent to-amber-100/60" />
                </div>
                <p className="mt-4 text-sm leading-7 text-rose-50/88">
                  Save favorites, browse the wedding story, and find your moments with selfie search.
                </p>
              </div>
              {heroImageUrl ? (
                <div
                  style={{
                    transform: `translate3d(0, ${scrollProgress * -18}px, 0) rotate(${scrollProgress * -2.5}deg)`,
                    opacity: 1 - scrollProgress * 0.7
                  }}
                  className="relative w-full max-w-[15rem] transition-[transform,opacity] duration-700 ease-out"
                >
                  <div className="rounded-[1.8rem] border border-white/18 bg-white/12 p-2 shadow-[0_24px_50px_rgba(15,23,42,0.30)] backdrop-blur">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem]">
                      <Image
                        src={heroImageUrl}
                        alt={`${eventName} preview`}
                        fill
                        sizes="240px"
                        className="object-cover"
                        unoptimized={isRemoteUrl(heroImageUrl)}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(20,12,18,0.22))]" />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid w-full grid-cols-2 gap-3">
                <HeroStat label="Photos" value={`${photoCount}`} />
                <HeroStat label="Guest Search" value="AI Ready" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {socialIcons.map((Icon, index) => (
                  <span
                    key={index}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber-50 backdrop-blur"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {["Haldi", "Reception", "Couple", "Candids"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-50/95 backdrop-blur"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
              <div className="rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-100/80 backdrop-blur">
                Scroll to reveal the gallery
              </div>
            </div>
          </div>
        </div>
      </section>

      <header className="wedding-lattice relative hidden overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(72,26,39,0.97),rgba(133,45,70,0.94),rgba(33,17,27,0.98)),radial-gradient(circle_at_top,rgba(251,191,36,0.28),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(253,224,71,0.16),transparent_34%)] px-8 py-8 text-white shadow-[0_28px_90px_rgba(88,28,40,0.24)] sm:block lg:px-10 lg:py-10">
        {heroImageUrl ? (
          <div className="absolute inset-y-0 right-0 w-[34%] overflow-hidden opacity-70">
            <Image
              src={heroImageUrl}
              alt={`${eventName} event cover`}
              fill
              sizes="34vw"
              className="object-cover"
              unoptimized={isRemoteUrl(heroImageUrl)}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(72,26,39,0.92),rgba(72,26,39,0.35),rgba(72,26,39,0.15))]" />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_26%),linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)]" />
        <div className={cn("relative mx-auto flex gap-8", heroImageUrl ? "max-w-6xl items-center text-left lg:grid lg:grid-cols-[minmax(0,1.15fr),minmax(280px,0.85fr)]" : "max-w-5xl flex-col items-center text-center")}>
          <div className={cn(heroImageUrl ? "max-w-3xl" : "flex flex-col items-center")}>
            <div className={cn("inline-flex rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100 backdrop-blur", heroImageUrl ? "" : "self-center")}>
              SnapCull Wedding Gallery
            </div>

            <div className={cn("mt-6 flex flex-wrap gap-2", heroImageUrl ? "" : "items-center justify-center")}>
              {socialIcons.map((Icon, index) => (
                <span
                  key={index}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber-50 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ))}
            </div>

            <div className={cn("mt-6", heroImageUrl ? "" : "max-w-3xl")}>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-100/80 sm:text-xs">A Wedding Celebration</p>
              <h1 className={cn("font-display mt-4 text-[2.8rem] leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl", heroImageUrl ? "text-left" : "text-center")}>
                {eventName}
              </h1>
              <div className={cn("mt-4 flex gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-amber-100/80 sm:text-xs", heroImageUrl ? "items-center" : "items-center justify-center")}>
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-100/60 sm:w-16" />
                Forever Starts Here
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-100/60 sm:w-16" />
              </div>
              <p className={cn("mt-4 max-w-2xl text-sm leading-7 text-rose-50/88 sm:text-base", heroImageUrl ? "" : "mx-auto")}>
                A wedding story framed in warm light, candid smiles, sacred rituals, and late-night celebration. Browse the
                gallery, save your favorite frames, and search your moments with a selfie whenever you want.
              </p>
            </div>

            <div className={cn("mt-6 grid w-full gap-3", heroImageUrl ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
              <HeroStat label="Opening set" value={`${photoCount} Photos`} />
              <HeroStat label="Access" value="Private Gallery" />
              <HeroStat label="Wishlist" value="Save Favorites" />
              <HeroStat label="Guest search" value="Selfie Enabled" />
            </div>

            <div className={cn("mt-6 flex flex-wrap gap-2", heroImageUrl ? "" : "justify-center")}>
              {["Haldi highlights", "Reception glow", "Couple portraits", "Guest candids"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-50/95 backdrop-blur sm:text-xs"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {heroImageUrl ? (
            <div className="relative hidden lg:flex lg:justify-end">
              <div className="relative w-full max-w-[22rem] rounded-[2rem] border border-white/14 bg-white/10 p-3 shadow-[0_26px_60px_rgba(15,23,42,0.28)] backdrop-blur">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                  <Image
                    src={heroImageUrl}
                    alt={`${eventName} spotlight`}
                    fill
                    sizes="352px"
                    className="object-cover"
                    unoptimized={isRemoteUrl(heroImageUrl)}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(20,12,18,0.20))]" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/12 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-amber-100/70 sm:text-[11px]">{label}</p>
      <p className="font-display mt-2 text-base tracking-wide text-white sm:text-lg lg:text-xl">{value}</p>
    </div>
  );
}
