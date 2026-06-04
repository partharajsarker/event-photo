import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-zinc-400">This event gallery was not found.</p>
      <Link href="/" className="mt-6 text-indigo-400 hover:text-indigo-300">
        Go home
      </Link>
    </main>
  );
}
