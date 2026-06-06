import type { Metadata } from "next";
import Link from "next/link";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Photos",
  description: "Instant event photography gallery for guests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <SessionProvider>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-800 bg-zinc-950/50 py-4 text-center text-sm text-zinc-500">
            <Link
              href="/privacy"
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
