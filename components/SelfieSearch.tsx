"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, RefreshCcw, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import ImageCard from "@/components/ImageCard";
import ImageModal from "@/components/ImageModal";
import { dispatchExperienceEvent, experienceEvents } from "@/lib/experience";
import { type ImageAsset, cn } from "@/lib/utils";
import { readWishlistImages, subscribeToWishlist, toggleWishlistImage } from "@/lib/wishlist";

type SelfieSearchProps = {
  eventId: string;
  variant?: "inline" | "floating";
};

type SearchResponse = {
  matches: ImageAsset[];
};

type Step = "choose" | "camera" | "preview" | "results";

export default function SelfieSearch({ eventId, variant = "inline" }: SelfieSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [matches, setMatches] = useState<ImageAsset[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [wishlistImages, setWishlistImages] = useState<ImageAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wishlistSet = new Set(wishlistImages.map((image) => image.id));

  useEffect(() => {
    if (!isOpen) {
      stopCamera(stream);
      setStream(null);
    }
  }, [isOpen, stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopCamera(stream);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, stream]);

  useEffect(() => {
    setWishlistImages(readWishlistImages(eventId));
    return subscribeToWishlist(eventId, setWishlistImages);
  }, [eventId]);

  useEffect(() => {
    const handleOpen = () => openModal();
    window.addEventListener(experienceEvents.openSelfieSearch, handleOpen);
    return () => window.removeEventListener(experienceEvents.openSelfieSearch, handleOpen);
  }, []);

  const openModal = () => {
    setIsOpen(true);
    setStep("choose");
    setError(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsSearching(false);
  };

  const resetSelfie = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelfieBlob(null);
    setMatches([]);
    setError(null);
  };

  const startCamera = async () => {
    setError(null);
    resetSelfie();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });

      setStream(mediaStream);
      setStep("camera");
    } catch {
      setError("Camera access was blocked. Upload a selfie instead.");
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    canvas.width = 640;
    canvas.height = 640;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, offsetX, offsetY, size, size, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
    stopCamera(stream);
    setStream(null);
    setSelfiePreview(blob);
    setStep("preview");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    resetSelfie();

    try {
      const blob = await resizeImage(file, 640);
      setSelfiePreview(blob);
      setStep("preview");
    } catch {
      setError("That image could not be processed. Try another selfie.");
    } finally {
      event.target.value = "";
    }
  };

  const setSelfiePreview = (blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextUrl;
    });
    setSelfieBlob(blob);
  };

  const runSearch = async () => {
    if (!selfieBlob) return;

    setIsSearching(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("image", selfieBlob, "selfie.jpg");

      const response = await fetch("/api/search", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Search failed.");
      }

      const data = (await response.json()) as SearchResponse;
      setMatches(data.matches);
      setStep("results");
    } catch {
      setError("We could not complete the search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleWishlist = (image: ImageAsset) => {
    setWishlistImages(toggleWishlistImage(eventId, image));
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "inline-flex items-center justify-center gap-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
          variant === "floating"
            ? "hidden min-h-14 rounded-full border border-white/25 bg-[linear-gradient(135deg,#7f1d35,#be185d,#881337)] px-5 shadow-[0_22px_60px_rgba(136,19,55,0.35)] hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(136,19,55,0.42)] sm:fixed sm:bottom-6 sm:right-6 sm:z-30 sm:inline-flex sm:px-6"
            : "min-h-11 rounded-xl bg-slate-950 px-4 shadow-sm hover:-translate-y-0.5 hover:bg-slate-800"
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            variant === "floating" ? "h-9 w-9 bg-white/16" : ""
          )}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex flex-col items-start leading-tight">
          {variant === "floating" ? <span className="text-[10px] uppercase tracking-[0.22em] text-rose-100/80">AI Guest Search</span> : null}
          <span>Find My Photos</span>
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.14),transparent_26%),rgba(15,23,42,0.72)] p-2 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_28px_90px_rgba(15,23,42,0.24)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.08),transparent_22%)]" />

              <div className="relative border-b border-slate-200/80 px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      AI Guest Search
                    </div>
                    <h2 className="font-display mt-3 text-3xl leading-none tracking-tight text-slate-950 sm:text-4xl">Find My Photos</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Upload or capture one selfie and let the gallery surface the moments you appear in.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
                    aria-label="Close selfie search"
                    title="Close"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex max-w-2xl items-center gap-2 text-sm text-slate-600">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    Your selfie is used only for this search and is not stored permanently.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StepChip label="Choose" active={step === "choose"} done={step !== "choose"} />
                    <StepChip label="Preview" active={step === "preview"} done={step === "results"} />
                    <StepChip label="Results" active={step === "results"} done={false} />
                  </div>
                </div>
              </div>

              <div className="relative p-4 sm:p-6">
                {error ? (
                  <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">{error}</div>
                ) : null}

                {step === "choose" ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(280px,0.9fr)]">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative flex min-h-52 flex-col justify-between overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.08),transparent_24%)] opacity-0 transition group-hover:opacity-100" />
                        <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                          <ImagePlus className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="relative">
                          <p className="text-lg font-semibold text-slate-950">Upload a selfie</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Best for images already saved on your phone with clear lighting and a centered face.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={startCamera}
                        className="group relative flex min-h-52 flex-col justify-between overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#fff7ed,#ffffff)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_28%)] opacity-0 transition group-hover:opacity-100" />
                        <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                          <Camera className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="relative">
                          <p className="text-lg font-semibold text-slate-950">Capture now</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Use your front camera for a quick live capture with a face-first crop.
                          </p>
                        </div>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </div>

                    <div className="rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Search Tips</p>
                      <div className="mt-4 grid gap-3">
                        <GuideItem title="Face centered" body="Keep your face visible and avoid heavy cropping for cleaner matches." />
                        <GuideItem title="Good light" body="Bright, even lighting helps the comparison produce stronger results." />
                        <GuideItem title="One person" body="Use a selfie with only you in frame for the most reliable search." />
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === "camera" ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),320px] lg:items-center">
                    <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-[1.8rem] bg-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
                      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
                      <div className="pointer-events-none absolute inset-0 border-[14px] border-white/10" />
                      <div className="pointer-events-none absolute inset-5 rounded-[1.5rem] border border-white/35" />
                    </div>

                    <div className="rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Live Capture</p>
                      <h3 className="mt-3 text-xl font-semibold text-slate-950">Align your face inside the frame</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Keep the camera steady and look directly at the lens. A calm expression and clear lighting work best.
                      </p>
                      <div className="mt-5 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={captureSelfie}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Camera className="h-4 w-4" aria-hidden="true" />
                          Capture Selfie
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera(stream);
                            setStream(null);
                            setStep("choose");
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === "preview" && previewUrl ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,360px),1fr] lg:items-center">
                    <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white p-2 shadow-sm">
                      <div className="relative aspect-square overflow-hidden rounded-[1.3rem] bg-slate-100">
                        <Image src={previewUrl} alt="Selected selfie preview" fill sizes="360px" className="object-cover" unoptimized />
                      </div>
                    </div>
                    <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Ready To Search</p>
                      <h3 className="mt-3 text-2xl font-semibold text-slate-950">This selfie looks good</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Use a clear, front-facing selfie for best matching. The compressed image is sent once and discarded by the API.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={runSearch}
                          disabled={isSearching}
                          className={cn(
                            "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800",
                            isSearching && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <Search className="h-4 w-4" aria-hidden="true" />
                          {isSearching ? "Searching..." : "Search My Photos"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetSelfie();
                            setStep("choose");
                          }}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                          Retake
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === "results" ? (
                  <div className="flex flex-col gap-5">
                    <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(145deg,#fff7ed,#fff1f2,#ffffff)] p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Search Results</p>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                            {matches.length ? `${matches.length} matching moments found` : "No confident matches yet"}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Review the best matches below, save your favorites, or start again with a brighter selfie.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:min-w-[12rem]">
                          <button
                            type="button"
                            onClick={() => {
                              resetSelfie();
                              setStep("choose");
                            }}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                            New Search
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatchExperienceEvent(experienceEvents.setGalleryFilter, { filter: "wishlist" })}
                            className="inline-flex min-h-11 items-center justify-center rounded-full bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Open Wishlist
                          </button>
                        </div>
                      </div>
                    </div>

                    {matches.length ? (
                      <div className="masonry-grid columns-2 sm:columns-3">
                        {matches.map((image) => (
                          <ImageCard
                            key={image.id}
                            image={image}
                            isWishlisted={wishlistSet.has(image.id)}
                            onOpen={setSelectedImage}
                            onToggleWishlist={toggleWishlist}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/90 p-8 text-center text-sm leading-6 text-slate-600">
                        Try a brighter selfie with your face centered, or browse the full gallery by event category.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <ImageModal
            image={selectedImage}
            images={matches}
            isWishlisted={selectedImage ? wishlistSet.has(selectedImage.id) : false}
            onClose={() => setSelectedImage(null)}
            onNavigate={(nextIndex) => setSelectedImage(matches[nextIndex] || null)}
            onToggleWishlist={toggleWishlist}
          />
        </div>
      ) : null}
    </>
  );
}

function StepChip({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] transition",
        active
          ? "bg-slate-950 text-white"
          : done
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
      )}
    >
      {label}
    </span>
  );
}

function GuideItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function resizeImage(file: File, maxSize: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvasToBlob(canvas, "image/jpeg", 0.82);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to encode image."));
      },
      type,
      quality
    );
  });
}
