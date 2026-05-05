import type { Metadata } from "next";
import EventHero from "@/components/EventHero";
import GalleryGrid from "@/components/GalleryGrid";
import SelfieSearch from "@/components/SelfieSearch";
import WelcomeGate from "@/components/WelcomeGate";
import { getImages } from "@/lib/r2";
import { formatEventName } from "@/lib/utils";

export const revalidate = 60;

type EventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const eventName = formatEventName(eventId);

  return {
    title: eventName,
    description: `Browse and search wedding photos from ${eventName}.`
  };
}

export default async function EventGalleryPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const initialPage = await getImages({ eventId, filter: "all", limit: 24 });
  const eventName = formatEventName(eventId);
  const heroImageUrl = initialPage.images[0]?.url;

  return (
    <main className="min-h-screen">
      <WelcomeGate eventId={eventId} eventName={eventName} />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <EventHero eventName={eventName} photoCount={initialPage.images.length} heroImageUrl={heroImageUrl} />

        <GalleryGrid eventId={eventId} initialImages={initialPage.images} initialCursor={initialPage.nextCursor} />
        <SelfieSearch eventId={eventId} variant="floating" />
      </section>
    </main>
  );
}
