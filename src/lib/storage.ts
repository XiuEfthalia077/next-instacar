/**
 * Supabase Storage helpers.
 *
 * The legacy app stored every uploaded file under
 * `car-rental/public/assets/images/...`. The new app keeps the same folder
 * conventions inside dedicated buckets:
 *
 *   car-images         <- cars.image_path (comma separated file names)
 *   booking-uploads    <- bookings.primary_id_path / secondary_id_path /
 *                         proof_billing_path / proof_payment_path
 *   booking-photos     <- booking_photos.file_name
 *   remittance-photos  <- operator/staff remittance proof photos
 *   site-assets        <- site content assets (qr_code_payment.png, favicons)
 *
 * The database keeps the exact same values as the legacy MySQL dump, so no
 * data migration is required — only the URL builder changed:
 *
 *   cars.image_path            "car_x.jpg,car_y.jpg"  -> car-images/car_x.jpg
 *   bookings.primary_id_path   "User_9/primary.webp" -> booking-uploads/User_9/primary.webp
 *   booking_photos.file_name   "customer_1_x.png"    -> booking-photos/customer_1_x.png
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKETS = {
  carImages: "car-images",
  bookingUploads: "booking-uploads",
  bookingPhotos: "booking-photos",
  remittancePhotos: "remittance-photos",
  siteAssets: "site-assets",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Buckets that can be read without a signed URL. */
export const PUBLIC_BUCKETS: BucketName[] = [
  BUCKETS.carImages,
  BUCKETS.siteAssets,
];

/** Legacy upload limit: 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Legacy accepted MIME types. */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Legacy accepted file extensions. */
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"] as const;

/** Sentinel used by the legacy `cars.image_path` column. */
export const DEFAULT_IMAGE = "default.png";

export type UploadResult =
  | { ok: true; path: string; fileName: string }
  | { ok: false; error: string };

export function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

/**
 * Validates a file the same way the legacy `upload()` helper did:
 * 5 MB maximum, MIME whitelist and extension whitelist.
 */
export function validateUpload(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File is too large. Maximum size is 5MB.";
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Invalid file type. Only JPG, PNG, WEBP and PDF are allowed.";
  }

  const extension = getExtension(file.name);

  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return "Invalid file extension. Only jpg, jpeg, png, webp and pdf are allowed.";
  }

  return null;
}

/** Builds a collision-free legacy style file name. */
export function buildFileName(prefix: string, file: File, stamp = Date.now()) {
  const extension = getExtension(file.name);
  return extension ? `${prefix}_${stamp}.${extension}` : `${prefix}_${stamp}`;
}

/**
 * Normalises a legacy stored path so it can be used as a storage object key.
 *
 * The legacy app stored `folder/file` (e.g. `User_9/primary_1.webp`) for
 * booking uploads and a plain file name for everything else.
 */
export function normalizeStoragePath(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^.*\/public\/assets\/images\//, "")
    .trim();
}

/**
 * Uploads a file to a bucket and returns the stored path.
 *
 * The legacy app stored the *file name* in the database and the folder was
 * derived from it, so the same convention is used here: the database keeps
 * the base name and the bucket path keeps the folder.
 */
export async function uploadFile(
  supabase: SupabaseClient,
  options: {
    bucket: string;
    /** Folder inside the bucket, e.g. `guest_1781660241_1781660241`. */
    folder?: string;
    /** Name stored in the database (base name only). */
    fileName: string;
    file: File;
  },
): Promise<UploadResult> {
  const { bucket, folder, fileName, file } = options;

  const invalid = validateUpload(file);
  if (invalid) return { ok: false, error: invalid };

  const path = folder ? `${folder}/${fileName}` : fileName;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, path, fileName };
}

/** Removes a file from a bucket (ignores missing objects). */
export async function removeFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

/**
 * Splits the legacy comma separated `cars.image_path` value into file names.
 */
export function splitImagePaths(imagePath: string | null | undefined): string[] {
  if (!imagePath) return [];
  return imagePath
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function storageOrigin() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
}

/**
 * Builds the public URL of an object inside a public bucket.
 * Returns an empty string when the project URL is not configured.
 */
export function publicFileUrl(bucket: BucketName, path: string) {
  const origin = storageOrigin();
  const objectPath = normalizeStoragePath(path);
  if (!origin || !objectPath) return "";
  return `${origin}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/**
 * Builds the public URL of a car image.
 *
 * `cars.image_path` holds plain file names, the legacy folder was `cars/`.
 */
export function carImageUrl(fileName: string) {
  return publicFileUrl(BUCKETS.carImages, fileName);
}

/**
 * Builds the public URL of every image of a car, honouring the legacy
 * `default.png` sentinel (a car without photos stores only `default.png`).
 */
export function carImageUrls(imagePath: string | null | undefined) {
  const names = splitImagePaths(imagePath);
  const list = names.length ? names : [DEFAULT_IMAGE];
  return list.map((name) => ({
    name,
    url: carImageUrl(name),
    isDefault: name === DEFAULT_IMAGE,
  }));
}

/**
 * Object key of a booking upload (primary / secondary ID, billing proof,
 * payment proof). The legacy value already contains the customer folder,
 * e.g. `User_9/primary_1781836810.jpg`.
 */
export function bookingUploadKey(path: string | null | undefined) {
  return normalizeStoragePath(path);
}

/** Object key of a customer photo (`booking_photos.file_name`). */
export function bookingPhotoKey(fileName: string | null | undefined) {
  return normalizeStoragePath(fileName);
}

/** Object key of a remittance proof photo. */
export function remittancePhotoKey(fileName: string | null | undefined) {
  return normalizeStoragePath(fileName);
}

/** Public URL of a site asset (`qr_code_payment.png`, favicons, ...). */
export function siteAssetUrl(fileName: string) {
  return publicFileUrl(BUCKETS.siteAssets, fileName);
}

/**
 * Builds a signed URL for a private bucket file.
 */
export async function signedFileUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 60 * 30,
) {
  const objectPath = normalizeStoragePath(path);
  if (!objectPath) return "";
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);
  return data?.signedUrl ?? "";
}

/**
 * Builds signed URLs for several files of the same bucket at once.
 * Missing files simply resolve to an empty string.
 */
export async function signedFileUrls(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[],
  expiresIn = 60 * 30,
) {
  const keys = paths.map((p) => normalizeStoragePath(p)).filter(Boolean);
  if (!keys.length) return [] as string[];

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(keys, expiresIn);

  if (error || !data) return keys.map(() => "");

  return data.map((entry) => entry.signedUrl ?? "");
}
