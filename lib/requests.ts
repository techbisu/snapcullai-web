import { type ImageAsset } from "@/lib/utils";

export type EventRequests = {
  albumIds: string[];
  printIds: string[];
};

const requestsEventName = "snapcull:requests-change";

function getRequestsStorageKey(eventId: string) {
  return `snapcull:requests:${eventId}`;
}

export function readEventRequests(eventId: string): EventRequests {
  if (typeof window === "undefined") {
    return { albumIds: [], printIds: [] };
  }

  try {
    const stored = window.localStorage.getItem(getRequestsStorageKey(eventId));
    if (!stored) return { albumIds: [], printIds: [] };

    const parsed = JSON.parse(stored) as Partial<EventRequests>;
    return {
      albumIds: Array.isArray(parsed.albumIds) ? parsed.albumIds.filter((id): id is string => typeof id === "string") : [],
      printIds: Array.isArray(parsed.printIds) ? parsed.printIds.filter((id): id is string => typeof id === "string") : []
    };
  } catch {
    window.localStorage.removeItem(getRequestsStorageKey(eventId));
    return { albumIds: [], printIds: [] };
  }
}

export function writeEventRequests(eventId: string, requests: EventRequests) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getRequestsStorageKey(eventId), JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent(requestsEventName, { detail: { eventId, requests } }));
}

export function addRequestIds(eventId: string, type: keyof EventRequests, images: ImageAsset[]) {
  const current = readEventRequests(eventId);
  const ids = new Set(current[type]);

  images.forEach((image) => ids.add(image.id));

  const next = {
    ...current,
    [type]: Array.from(ids)
  };

  writeEventRequests(eventId, next);
  return next;
}

export function subscribeToRequests(eventId: string, onChange: (requests: EventRequests) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ eventId: string; requests: EventRequests }>).detail;
    if (detail?.eventId === eventId) {
      onChange(detail.requests);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === getRequestsStorageKey(eventId)) {
      onChange(readEventRequests(eventId));
    }
  };

  window.addEventListener(requestsEventName, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(requestsEventName, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
