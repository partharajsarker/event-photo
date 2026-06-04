"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import type { PhotoItem } from "@/types";

type LightboxProps = {
  photos: PhotoItem[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (photo: PhotoItem) => void;
  onNavigate: (index: number) => void;
};

export function Lightbox({
  photos,
  initialIndex,
  onClose,
  onDownload,
  onNavigate,
}: LightboxProps) {
  const current = photos[initialIndex];

  const goPrev = useCallback(() => {
    if (initialIndex > 0) onNavigate(initialIndex - 1);
  }, [initialIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (initialIndex < photos.length - 1) onNavigate(initialIndex + 1);
  }, [initialIndex, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, goPrev, goNext]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-zinc-400">
          {initialIndex + 1} / {photos.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDownload(current)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        {initialIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-3 text-2xl text-white hover:bg-black/70 sm:left-4"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        <div className="relative h-full max-h-[calc(100vh-8rem)] w-full max-w-5xl">
          <Image
            src={current.originalUrl}
            alt={`Photo ${initialIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        {initialIndex < photos.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-3 text-2xl text-white hover:bg-black/70 sm:right-4"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
