"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PhotoItem } from "@/types";
import { Lightbox } from "./Lightbox";

type GalleryProps = {
  eventSlug: string;
  eventName: string;
};

export function Gallery({ eventSlug, eventName }: GalleryProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadingRef = useRef(false);

  console.log("[Gallery] Component rendered with:", { eventSlug, eventName });

  const fetchPhotos = useCallback(
    async (nextCursor?: string | null) => {
      if (loadingRef.current) return;

      // Validate eventSlug before making request
      if (!eventSlug) {
        console.error("[Gallery] eventSlug is empty/null/undefined");
        setError("Invalid event");
        setInitialLoading(false);
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          eventSlug,
          limit: "20",
        });
        if (nextCursor) {
          params.set("cursor", nextCursor);
        }

        const url = `/api/photos?${params.toString()}`;
        console.log("[Gallery] Fetching photos:", {
          url,
          eventSlug,
          nextCursor,
        });

        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[Gallery] API error:", {
            status: res.status,
            errorData,
          });
          throw new Error(errorData.error ?? "Failed to load photos");
        }

        const data = await res.json();
        console.log("[Gallery] Photos loaded:", {
          count: data.photos?.length ?? 0,
          hasMore: data.hasMore,
        });

        setPhotos((prev) =>
          nextCursor ? [...prev, ...data.photos] : data.photos,
        );
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("[Gallery] Fetch error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [eventSlug],
  );

  useEffect(() => {
    if (eventSlug) {
      fetchPhotos();
    } else {
      console.warn("[Gallery] Skipping fetch - eventSlug is empty");
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          fetchPhotos(cursor);
        }
      },
      { rootMargin: "200px" },
    );

    const node = loadMoreRef.current;
    if (node) {
      observerRef.current.observe(node);
    }

    return () => observerRef.current?.disconnect();
  }, [cursor, hasMore, loading, fetchPhotos]);

  const handleDownload = async (photo: PhotoItem) => {
    try {
      const res = await fetch(`/api/photos/${photo.id}/download`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Download failed");

      const data = await res.json();
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(photo.originalUrl, "_blank");
    }
  };

  // Show error if eventSlug is invalid
  if (!eventSlug) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center text-red-300">
        Invalid event - please check the URL
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-center text-red-300">
        {error}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <p className="text-lg text-zinc-300">No photos yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Photos from {eventName} will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {photo.thumbnail ? (
              <Image
                src={photo.thumbnail}
                alt={`Photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-800">
                <span className="text-xs text-zinc-500">Loading...</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loading && (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
          )}
        </div>
      )}

      {selectedIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onDownload={handleDownload}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}
