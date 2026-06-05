import { z } from "zod";

export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "Event name is required")
    .max(200, "Event name must be 200 characters or less")
    .trim(),
});

export const uploadQuerySchema = z.object({
  eventSlug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid event slug"),
});

export const presignedUrlSchema = z.object({
  eventSlug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid event slug"),
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename"),
  contentType: z
    .string()
    .refine((val) => ["image/jpeg", "image/png", "image/webp"].includes(val), {
      message:
        "Invalid content type. Allowed: image/jpeg, image/png, image/webp",
    }),
});

export const photosQuerySchema = z.object({
  eventSlug: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const uploadCallbackSchema = z.object({
  photoId: z.string().min(1),
  originalUrl: z.string().url(),
  filename: z.string().min(1),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UploadQueryInput = z.infer<typeof uploadQuerySchema>;
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type PhotosQueryInput = z.infer<typeof photosQuerySchema>;
export type UploadCallbackInput = z.infer<typeof uploadCallbackSchema>;
