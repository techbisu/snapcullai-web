import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventHero from "@/components/EventHero";
import GalleryGrid from "@/components/GalleryGrid";
import SelfieSearch from "@/components/SelfieSearch";
import WelcomeGate from "@/components/WelcomeGate";
import { getEventSummary, getImages } from "@/lib/r2";

export const revalidate = 60;

type EventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEventSummary(eventId);
  if (!event) {
    return {
      title: "Event not found",
      description: "The requested event gallery could not be found."
    };
  }

  return {
    title: event.eventName,
    description: `Browse and search wedding photos from ${event.eventName}.`
  };
}

export default async function EventGalleryPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = await getEventSummary(eventId);
  if (!event) {
    notFound();
  }

  const initialPage = await getImages({ eventId, filter: "all", limit: 24 });
  const heroImageUrl = initialPage.images[0]?.url;

  return (
    <main className="min-h-screen">
      <WelcomeGate eventId={eventId} eventName={event.eventName} />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <EventHero
          eventId={event.eventId}
          eventName={event.eventName}
          photoCount={initialPage.images.length}
          heroImageUrl={heroImageUrl}
        />

        <GalleryGrid eventId={eventId} initialImages={initialPage.images} initialCursor={initialPage.nextCursor} />
        <SelfieSearch eventId={eventId} variant="floating" />
      </section>
    </main>
  );
}
