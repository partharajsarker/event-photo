import slugify from "slugify";
import { prisma } from "./prisma";

export function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });
}

export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}
