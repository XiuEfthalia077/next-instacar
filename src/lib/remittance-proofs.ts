/**
 * Signed URL helper for remittance proof files.
 *
 * Proofs live in the private `remittance-photos` bucket, so every thumbnail /
 * viewer link has to be a short-lived signed URL instead of a public path.
 * The legacy pages streamed the file through PHP; the new app keeps the same
 * access rule (admin only, generated on demand) and batches the signing so a
 * history modal does not fire one request per file.
 */

import { getSupabase } from "@/lib/auth";
import {
  BUCKETS,
  remittancePhotoKey,
  signedFileUrls,
} from "@/lib/storage";

export type RemittancePhotoRef = {
  id: number;
  file_name: string;
};

/**
 * Builds a `photo id -> signed URL` map. Missing / blank file names are
 * skipped and simply do not appear in the map.
 */
export async function remittanceProofUrlMap(
  photos: RemittancePhotoRef[],
): Promise<Map<number, string>> {
  const usable = photos.filter(
    (photo) => remittancePhotoKey(photo.file_name).length > 0,
  );

  if (!usable.length) return new Map();

  const supabase = await getSupabase();
  const urls = await signedFileUrls(
    supabase,
    BUCKETS.remittancePhotos,
    usable.map((photo) => remittancePhotoKey(photo.file_name)),
  );

  const map = new Map<number, string>();

  usable.forEach((photo, index) => {
    map.set(photo.id, urls[index] ?? "");
  });

  return map;
}
