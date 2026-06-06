// Re-export from r2.ts for backwards compatibility
// All storage operations now use Cloudflare R2

export {
  uploadToR2 as uploadToStorage,
  deleteFromR2 as deleteFromStorage,
  getPublicUrl,
  extractKeyFromUrl,
  buildStorageKey,
  getFromR2 as getFromStorage,
  generatePresignedUploadUrl,
  isR2Configured,
} from "./r2";
