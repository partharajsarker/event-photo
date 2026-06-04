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

export const photosQuerySchema = z.object({
  eventSlug: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UploadQueryInput = z.infer<typeof uploadQuerySchema>;
export type PhotosQueryInput = z.infer<typeof photosQuerySchema>;
