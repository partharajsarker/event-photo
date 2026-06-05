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
  thumbnail: string | null;
  originalUrl: string;
  uploadedAt: string;
  downloadCount: number;
  status: string;
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

export type PresignedUrlResponse = {
  uploadUrl: string;
  photoId: string;
  key: string;
  publicUrl: string;
};
