import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Event Photos
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Instant photo galleries for weddings, parties, and events. Guests scan a QR code — no
          account required.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500"
          >
            Admin Dashboard
          </Link>
        </div>
        <p className="mt-12 text-sm text-zinc-600">
          Scan your event QR code to view the gallery.
        </p>
      </div>
    </main>
  );
}
