import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Gallery } from "@/components/gallery/Gallery";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return { title: "Event Not Found" };
  return {
    title: `${event.name} — Event Photos`,
    description: `View and download photos from ${event.name}`,
  };
}

export default async function EventGalleryPage({ params }: PageProps) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold sm:text-2xl">{event.name}</h1>
          <p className="text-sm text-zinc-500">Tap a photo to view full size</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Gallery eventSlug={event.slug} eventName={event.name} />
      </div>
    </main>
  );
}
