#!/usr/bin/env node
/**
 * Uploads the legacy car image library into Supabase Storage.
 *
 * The PHP app kept every uploaded file under
 * `car-rental/public/assets/images/`. This script mirrors that folder
 * layout into the buckets used by next-instacar:
 *
 *   images/cars/<file>              -> car-images/<file>            (public)
 *   images/customers/<file>         -> booking-photos/<file>        (private)
 *   images/ids/<folder>/<file>      -> booking-uploads/<folder>/<file> (private)
 *   images/remittances/<file>       -> remittance-photos/<file>     (private)
 *   images/qr_code_payment.png      -> site-assets/<file>           (public)
 *
 * The paths stored in the database stay exactly the same as the legacy
 * columns, so no data migration is required:
 *
 *   cars.image_path                  -> "car_x.jpg,car_y.jpg"   (car-images)
 *   bookings.primary_id_path         -> "User_9/primary_x.webp" (booking-uploads)
 *   booking_photos.file_name         -> "customer_12_x.png"     (booking-photos)
 *   operator/staff remittance photos -> "proof_x.jpg"           (remittance-photos)
 *
 * DEFAULT SCOPE IS CARS ONLY (`images/cars` -> `car-images`).
 * Use `--scope=all` to upload the ID folders, customer photos, remittance
 * proofs and the QR code as well.
 *
 * Usage:
 *   node scripts/upload-images.mjs                     # cars only
 *   node scripts/upload-images.mjs --scope=all         # every folder
 *   node scripts/upload-images.mjs --dry-run           # only print the plan
 *   node scripts/upload-images.mjs --bucket=car-images # only one bucket
 *   node scripts/upload-images.mjs --source=C:/path/to/images
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or the newer
 *     SUPABASE_SECRET_KEY) in .env.local
 *   - the `car-images` bucket must exist. Either run
 *     supabase/apply-all.sql in the Supabase SQL Editor first, or let this
 *     script create it (it needs the service role key).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const DRY_RUN = flag("dry-run");
const SCOPE = (option("scope") ?? "cars").toLowerCase(); // cars | all
const ONLY_BUCKET = option("bucket");
const SOURCE_DIR = path.resolve(
  option("source") ?? path.resolve(PROJECT_ROOT, "..", "images"),
);
const CONCURRENCY = Number(option("concurrency") ?? 6);

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));
loadEnvFile(path.join(PROJECT_ROOT, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (.env.local).");
  process.exit(1);
}

if (!SECRET_KEY && !DRY_RUN) {
  console.error(
    [
      "Missing service role key.",
      "",
      "Creating the bucket and uploading to a private bucket requires the",
      "service role key. Add one of these to .env.local:",
      "  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...",
      "  SUPABASE_SECRET_KEY=sb_secret_...",
      "",
      "Dashboard -> Project Settings -> API Keys.",
    ].join("\n"),
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Bucket configuration (mirrors src/lib/storage.ts + the SQL migration)
// ---------------------------------------------------------------------------
const FIVE_MB = 5 * 1024 * 1024;

const BUCKET_CONFIG = {
  "car-images": { public: true, fileSizeLimit: FIVE_MB },
  "booking-uploads": { public: false, fileSizeLimit: FIVE_MB },
  "booking-photos": { public: false, fileSizeLimit: FIVE_MB },
  "remittance-photos": { public: false, fileSizeLimit: FIVE_MB },
  "site-assets": { public: true, fileSizeLimit: FIVE_MB },
};

// Legacy folder -> bucket. The path inside the bucket keeps the legacy
// folder structure for `ids/` (folder + file) and is flat for the others,
// exactly like the legacy `image_path` / `file_name` columns.
const FOLDER_RULES = [
  { folder: "cars", bucket: "car-images", keepSubPath: false },
  { folder: "customers", bucket: "booking-photos", keepSubPath: false },
  { folder: "ids", bucket: "booking-uploads", keepSubPath: true },
  { folder: "remittances", bucket: "remittance-photos", keepSubPath: false },
];

/** Files that never belong in the buckets. */
const SKIP_FILE_NAMES = new Set([
  ".htaccess",
  "index.html",
  ".htpasswd",
  "Thumbs.db",
  ".DS_Store",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "pdf",
  "gif",
  "ico",
  "svg",
]);

const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

const extensionOf = (file) =>
  path.extname(file).replace(".", "").toLowerCase();

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------
function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(full);
  }
  return out;
}

function buildPlan() {
  const plan = [];
  const skipped = [];

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source folder not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const carsDir = path.join(SOURCE_DIR, "cars");
  if (!fs.existsSync(carsDir)) {
    console.error(`Car image folder not found: ${carsDir}`);
    process.exit(1);
  }

  // "cars" scope -> only images/cars. "all" -> every legacy folder.
  const roots =
    SCOPE === "all"
      ? walk(SOURCE_DIR)
      : walk(carsDir).map((f) => path.join(SOURCE_DIR, "cars", path.basename(f)));

  for (const fullPath of roots) {
    const relative = path
      .relative(SOURCE_DIR, fullPath)
      .split(path.sep)
      .join("/");
    const fileName = path.basename(fullPath);
    const extension = extensionOf(fileName);
    const size = fs.statSync(fullPath).size;

    const rule = FOLDER_RULES.find(
      (r) => relative === r.folder || relative.startsWith(`${r.folder}/`),
    );

    // Root level files (qr_code_payment.png, favicon, ...) -> site-assets
    const bucket = rule ? rule.bucket : "site-assets";

    const objectPath = rule
      ? rule.keepSubPath
        ? relative.slice(rule.folder.length + 1)
        : fileName
      : fileName;

    if (SKIP_FILE_NAMES.has(fileName)) {
      skipped.push({ relative, reason: "server file" });
      continue;
    }
    if (fileName.startsWith(".")) {
      skipped.push({ relative, reason: "hidden file" });
      continue;
    }
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      skipped.push({ relative, reason: `unsupported extension ".${extension}"` });
      continue;
    }

    plan.push({
      bucket,
      objectPath,
      relative,
      fullPath,
      size,
      contentType: MIME_TYPES[extension] ?? "application/octet-stream",
    });
  }

  return { plan, skipped };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
async function ensureBuckets(supabase, bucketIds) {
  const { data: existing, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const known = new Set((existing ?? []).map((b) => b.id));

  for (const id of bucketIds) {
    const config = BUCKET_CONFIG[id];
    if (!config) continue;
    if (known.has(id)) {
      console.log(`  bucket ${id.padEnd(18)} exists`);
      continue;
    }
    const { error: createError } = await supabase.storage.createBucket(id, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
    });
    if (createError) {
      console.error(`  bucket ${id}: FAILED - ${createError.message}`);
      continue;
    }
    console.log(
      `  bucket ${id.padEnd(18)} created (${config.public ? "public" : "private"})`,
    );
  }
}

async function uploadOne(supabase, item) {
  const body = fs.readFileSync(item.fullPath);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await supabase.storage
      .from(item.bucket)
      .upload(item.objectPath, body, {
        contentType: item.contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (!error) return { ok: true };

    const message = error.message ?? String(error);
    const retryable =
      /timeout|network|ECONNRESET|5\d\d|too many requests/i.test(message);

    if (!retryable || attempt === 3) return { ok: false, error: message };

    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  return { ok: false, error: "unknown error" };
}

async function runPool(items, worker, limit) {
  const results = [];
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner),
  );

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { plan, skipped } = buildPlan();

  let scoped = plan;
  if (ONLY_BUCKET) {
    scoped = plan.filter((item) => item.bucket === ONLY_BUCKET);
  }

  const byBucket = new Map();
  for (const item of scoped) {
    if (!byBucket.has(item.bucket)) byBucket.set(item.bucket, []);
    byBucket.get(item.bucket).push(item);
  }

  console.log(`Source  : ${SOURCE_DIR}`);
  console.log(`Scope   : ${SCOPE}${ONLY_BUCKET ? ` (bucket=${ONLY_BUCKET})` : ""}`);
  console.log(
    `Files   : ${scoped.length} to upload, ${skipped.length} skipped`,
  );
  console.log("");

  for (const [bucket, items] of [...byBucket.entries()].sort()) {
    const bytes = items.reduce((sum, i) => sum + i.size, 0);
    console.log(
      `  ${bucket.padEnd(18)} ${String(items.length).padStart(4)} files  ${(
        bytes /
        1024 /
        1024
      ).toFixed(2)} MB`,
    );
  }

  if (skipped.length) {
    console.log("");
    console.log("Skipped:");
    for (const s of skipped) console.log(`  - ${s.relative} (${s.reason})`);
  }

  if (DRY_RUN) {
    console.log("");
    console.log("Dry run - nothing was uploaded.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("");
  console.log("Ensuring buckets:");
  await ensureBuckets(supabase, [...byBucket.keys()]);

  console.log("");
  console.log("Uploading:");

  const results = await runPool(
    scoped,
    async (item) => {
      const result = await uploadOne(supabase, item);
      if (!result.ok) {
        console.error(`  FAIL ${item.bucket}/${item.objectPath} - ${result.error}`);
      }
      return result;
    },
    CONCURRENCY,
  );

  const failed = results.filter((r) => r && !r.ok);
  const uploaded = results.filter((r) => r && r.ok);

  console.log("");
  console.log(`Uploaded: ${uploaded.length}/${scoped.length}`);
  if (failed.length) {
    console.log(`Failed  : ${failed.length}`);
    process.exitCode = 1;
  }

  // Verify by listing the bucket roots.
  console.log("");
  console.log("Verification:");
  for (const bucket of byBucket.keys()) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: 1000,
    });
    if (error) {
      console.log(`  ${bucket.padEnd(18)} ERROR ${error.message}`);
      continue;
    }
    console.log(`  ${bucket.padEnd(18)} ${data?.length ?? 0} root entries`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
