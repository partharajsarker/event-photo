export type EventWithStats = {
  id: string;
  name: string;
  slug: string;
  qrCodeUrl: string | null;
  createdAt: string;
  photoCount: number;
  totalDownloads: number;
};

export type PhotoItem = {
  id: string;
  filename: string;
  thumbnail: string;
  originalUrl: string;
  uploadedAt: string;
  downloadCount: number;
};

export type PaginatedPhotos = {
  photos: PhotoItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApiError = {
  error: string;
  details?: unknown;
};
