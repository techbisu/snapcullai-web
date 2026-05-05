export const experienceEvents = {
  openSelfieSearch: "snapcull:open-selfie-search",
  setGalleryFilter: "snapcull:set-gallery-filter",
  openSlideshow: "snapcull:open-slideshow",
  scrollGallery: "snapcull:scroll-gallery"
} as const;

export function dispatchExperienceEvent<T>(name: string, detail?: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
