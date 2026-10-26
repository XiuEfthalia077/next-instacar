/**
 * Security & Input Sanitization Utilities
 *
 * Implements defenses against:
 *   1. XSS (Cross-Site Scripting) in user/admin inputs and rich text.
 *   2. PostgREST filter injection in search queries.
 *   3. Malicious file uploads / script execution (PHP, JS, shell scripts, etc.).
 */

const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "embed",
  "object",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "base",
  "meta",
  "link",
  "style",
  "frame",
  "frameset",
  "applet",
  "svg",
  "math",
];

/**
 * Sanitizes rich-text HTML (e.g. Rental Agreement) against Stored and Reflected XSS.
 * Removes executable script blocks, embeds, objects, event handlers (on*),
 * and dangerous URI schemes (javascript:, data:, vbscript:).
 */
export function sanitizeRichText(html: string): string {
  if (!html) return "";

  let clean = html;

  // 1. Strip dangerous tags and their contents
  for (const tag of DANGEROUS_TAGS) {
    const tagRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    clean = clean.replace(tagRegex, "");
    // Also catch self-closing or unclosed variants
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    clean = clean.replace(selfClosing, "");
  }

  // 2. Strip all inline event handlers (e.g., onload, onerror, onclick, onmouseover)
  // Handles quotes, single quotes, and unquoted attribute values
  clean = clean.replace(/\son[a-zA-Z0-9_-]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "");

  // 3. Strip pseudo-protocols and dangerous URI schemes from href/src
  clean = clean.replace(/(href|src|action)\s*=\s*(['"]?)\s*(javascript:|vbscript:|data:text\/html|data:application\/)[^'" >]*\2/gi, '$1="#"');

  return clean.trim();
}

/**
 * Strips special PostgREST query characters from search terms
 * to prevent filter injection into `.or(...)` or `.eq(...)` clauses.
 */
export function cleanSearchQuery(term: string | null | undefined): string {
  if (!term) return "";
  // Strip PostgREST syntax punctuation: commas, parentheses, dots, colons, quotes, slashes
  return term
    .replace(/[(),\."':\\\/%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates that uploaded file names and extensions cannot execute server-side code.
 */
const FORBIDDEN_EXTENSIONS = new Set([
  "php", "php3", "php4", "php5", "phtml", "phar",
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "pyc", "pyw",
  "rb", "pl", "cgi", "sh", "bash", "ps1", "bat", "cmd",
  "exe", "dll", "so", "bin", "com", "vbs", "jar",
  "html", "htm", "shtml", "xhtml", "svg", "xml",
]);

export function isSafeFileUpload(fileName: string, mimeType: string): boolean {
  if (!fileName || !mimeType) return false;

  const lowerName = fileName.toLowerCase();
  const parts = lowerName.split(".");
  const ext = parts.pop() ?? "";

  // Check against forbidden executable extensions
  if (FORBIDDEN_EXTENSIONS.has(ext)) return false;

  // Check for double extension bypasses (e.g. payload.php.jpg)
  for (const part of parts) {
    if (FORBIDDEN_EXTENSIONS.has(part)) return false;
  }

  // Allowed whitelist
  const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

  return ALLOWED_MIME.has(mimeType) && ALLOWED_EXT.has(ext);
}
