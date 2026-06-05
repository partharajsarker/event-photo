"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { EventWithStats, PhotoItem } from "@/types";

type EventDetail = EventWithStats & {
  photos: PhotoItem[];
};

export function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (res.status === 401) {
        router.push("/admin/login");
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      return res.json();
    },
    [router],
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/events");
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (status === "authenticated") {
      loadEvents();
    }
  }, [status, loadEvents]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({ name: newEventName.trim() }),
      });
      setNewEventName("");
      setSuccess(`Event "${data.event.name}" created!`);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/events/${eventId}`);
      setSelectedEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, name: string) => {
    if (!confirm(`Delete event "${name}" and all its photos?`)) return;

    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${eventId}`, { method: "DELETE" });
      setSelectedEvent(null);
      setSuccess(`Event "${name}" deleted`);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;

    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (selectedEvent) {
        await handleSelectEvent(selectedEvent.id);
      }
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setLoading(false);
    }
  };

  const publicUrl = (slug: string) => `${window.location.origin}/event/${slug}`;

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {session?.user?.name ?? "Admin"}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-green-300">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-medium">Create Event</h2>
        <form
          onSubmit={handleCreateEvent}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Wedding 2026"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Create Event
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-medium">Events</h2>
        {loading && events.length === 0 ? (
          <p className="text-zinc-400">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-zinc-400">No events yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-zinc-500">/{event.slug}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {event.photoCount} photos · {event.totalDownloads} downloads
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(event.id)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                  >
                    Manage
                  </button>
                  <a
                    href={publicUrl(event.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                  >
                    View Gallery
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    className="rounded-lg bg-red-950 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedEvent && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">{selectedEvent.name}</h2>
              <p className="text-sm text-zinc-500">
                {selectedEvent.photoCount} photos ·{" "}
                {selectedEvent.totalDownloads} total downloads
              </p>
              <a
                href={publicUrl(selectedEvent.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-indigo-400 hover:text-indigo-300"
              >
                {publicUrl(selectedEvent.slug)}
              </a>
            </div>

            {selectedEvent.qrCodeUrl && (
              <div className="text-center">
                <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-lg bg-white p-2">
                  <Image
                    src={selectedEvent.qrCodeUrl}
                    alt="Event QR code"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <a
                    href={selectedEvent.qrCodeUrl}
                    download={`${selectedEvent.slug}-qr.png`}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
                  >
                    Download QR
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (w && selectedEvent.qrCodeUrl) {
                        w.document.write(`
                          <html><head><title>QR - ${selectedEvent.name}</title></head>
                          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif">
                            <h1>${selectedEvent.name}</h1>
                            <img src="${selectedEvent.qrCodeUrl}" width="400" height="400" />
                            <p>Scan to view photos</p>
                            <script>window.onload=()=>window.print()</script>
                          </body></html>
                        `);
                        w.document.close();
                      }
                    }}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"
                  >
                    Print QR
                  </button>
                </div>
              </div>
            )}
          </div>

          <h3 className="mb-3 font-medium">Photos</h3>
          {selectedEvent.photos.length === 0 ? (
            <p className="text-zinc-400">No photos uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {selectedEvent.photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-800">
                    {photo.thumbnail ? (
                      <Image
                        src={photo.thumbnail}
                        alt={photo.filename}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                        {photo.status === "processing"
                          ? "Processing..."
                          : "No preview"}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    ↓ {photo.downloadCount}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="mt-1 w-full rounded bg-red-950/80 py-1 text-xs text-red-300 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <h4 className="mb-2 text-sm font-medium text-zinc-300">
              Camera Upload URL
            </h4>
            <code className="block break-all text-xs text-zinc-400">
              POST {window.location.origin}/api/upload?eventSlug=
              {selectedEvent.slug}
            </code>
            <p className="mt-2 text-xs text-zinc-500">
              Configure your camera for HTTP POST or use the presigned URL
              endpoint for large files.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
