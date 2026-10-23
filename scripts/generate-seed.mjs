/**
 * Converts the legacy MySQL dump (car-rental/if0_42471936_car_rental.sql)
 * into a PostgreSQL seed file for Supabase.
 *
 *   node scripts/generate-seed.mjs
 *
 * The generated file is written to supabase/seed.sql.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const dumpPath = resolve(repoRoot, "..", "car-rental", "if0_42471936_car_rental.sql");
const outPath = resolve(repoRoot, "supabase", "seed.sql");

const dump = readFileSync(dumpPath, "utf8");

/* --------------------------------------------------------------------------
 * Column type map (Postgres) — mirrors supabase/migrations/*_init_schema.sql
 * ----------------------------------------------------------------------- */
const BOOL = "bool";
const INT = "int";
const NUM = "num";
const TEXT = "text";
const DATE = "date";
const TS = "ts";
const TIME = "time";

const TYPES = {
  branches: {
    id: INT, name: TEXT, address: TEXT, phone: TEXT, is_active: BOOL, created_at: TS,
  },
  users: {
    id: INT, google_id: TEXT, name: TEXT, email: TEXT, password: TEXT, phone: TEXT,
    role: TEXT, branch_id: INT, created_at: TS, reset_token: TEXT, token_expiry: TS,
    verification_token: TEXT, is_verified: BOOL,
  },
  cars: {
    id: INT, user_id: INT, branch_id: INT, brand: TEXT, model: TEXT, type: TEXT,
    fuel_type: TEXT, plate_number: TEXT, image_path: TEXT, price_24_hours: INT,
    status: TEXT, transmission: TEXT, capacity: INT, created_at: TS,
    operator_24_hours: NUM, ext_price_1_6: NUM, color: TEXT, price_10_hours: NUM,
    operator_10_hours: NUM, price_12_hours: NUM, operator_12_hours: NUM,
    ext_price_7_10: NUM, ext_price_11_12: NUM, ext_price_13_24: NUM,
  },
  car_schedules: {
    id: INT, car_id: INT, created_by: INT, start_date: DATE, end_date: DATE,
    reason: TEXT, notes: TEXT, created_at: TS, updated_at: TS,
  },
  bookings: {
    id: INT, user_id: INT, created_by: INT, last_action_by: INT, last_action_at: TS,
    last_action_type: TEXT, branch_id: INT, guest_name: TEXT, phone_number: TEXT,
    gmail: TEXT, primary_id_path: TEXT, secondary_id_path: TEXT, car_id: INT,
    start_date: DATE, end_date: DATE, pickup_time: TIME, return_time: TIME,
    total_price: NUM, status: TEXT, booking_type: TEXT, fulfillment_type: TEXT,
    delivery_address: TEXT, return_delivery_address: TEXT, created_at: TS,
    discount_price: NUM, down_payment: NUM, extension_price: NUM,
    extension_hours: INT, proof_billing_path: TEXT, proof_payment_path: TEXT,
    remarks: TEXT, delivery_fee: NUM, pickup_fee: NUM,
  },
  booking_payments: {
    id: INT, booking_id: INT, daily_rent: NUM, carwash: NUM, extension_fee: NUM,
    delivery_fee: NUM, jer_delivery_fee: NUM, pickup_fee: NUM, jer_pickup_fee: NUM,
    staff_fees_cleared_at: TS, fuel: NUM, driver_fee: NUM, damage_fee: NUM,
    agent_fee: NUM, others: NUM, total_gross: NUM, discount_amount: NUM,
    total_net: NUM, settled_by: INT, settled_at: TS, operator_share: NUM,
    created_at: TS, remitted_amount: NUM, remittance_date: DATE, owner_balance: NUM,
    remarks: TEXT,
  },
  booking_photos: {
    id: INT, booking_id: INT, file_name: TEXT, uploaded_at: TS,
  },
  booking_remarks: {
    id: INT, booking_id: INT, created_by: INT, remark: TEXT, created_at: TS,
  },
  reviews: {
    id: INT, user_id: INT, booking_id: INT, rating: INT, review_text: TEXT,
    admin_reply: TEXT, review_title: TEXT, status: TEXT, created_at: TS,
    updated_at: TS,
  },
  contact_messages: {
    id: INT, name: TEXT, email: TEXT, subject: TEXT, message: TEXT,
    created_at: TS, is_read: BOOL,
  },
  site_content: {
    id: INT, content_key: TEXT, content_value: TEXT, updated_at: TS, updated_by: INT,
  },
};

/** Tables in FK-safe insertion order. */
const TABLE_ORDER = [
  "branches",
  "users",
  "cars",
  "car_schedules",
  "bookings",
  "booking_payments",
  "booking_photos",
  "booking_remarks",
  "reviews",
  "contact_messages",
  "site_content",
];

/* --------------------------------------------------------------------------
 * MySQL value parsing
 * ----------------------------------------------------------------------- */
function mysqlUnescape(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    i += 1;
    switch (next) {
      case "0": out += "\0"; break;
      case "n": out += "\n"; break;
      case "r": out += "\r"; break;
      case "t": out += "\t"; break;
      case "b": out += "\b"; break;
      case "Z": out += "\u001a"; break;
      case "%": out += "\\%"; break;
      case "_": out += "\\_"; break;
      default: out += next;
    }
  }
  return out;
}

/**
 * Parses the VALUES tuples of one MySQL INSERT statement.
 *
 * The scanner is used instead of a regular expression because a value may
 * contain a semicolon (the seeded `site_content` rental agreement does).
 *
 * @param {string} text full dump text
 * @param {number} start index of the first character after `VALUES`
 * @returns {{ tuples: Array<Array<string | null>>, end: number }}
 */
function parseTuples(text, start) {
  const tuples = [];
  const n = text.length;
  let i = start;

  const skipWhitespace = () => {
    while (i < n && /\s/.test(text[i])) i += 1;
  };

  for (;;) {
    skipWhitespace();
    if (i >= n || text[i] !== "(") break;
    i += 1;

    const values = [];
    // `raw` holds the text of the value that is currently being read.
    // It becomes `null` right after a quoted string was pushed.
    let raw = "";

    for (;;) {
      if (i >= n) break;
      const ch = text[i];

      if (ch === "'") {
        i += 1;
        let buffer = "";
        while (i < n) {
          const c = text[i];
          if (c === "\\") {
            buffer += c + (text[i + 1] ?? "");
            i += 2;
            continue;
          }
          if (c === "'") {
            i += 1;
            break;
          }
          buffer += c;
          i += 1;
        }
        values.push(mysqlUnescape(buffer));
        raw = null;
        continue;
      }

      if (ch === ",") {
        if (raw !== null) {
          const trimmed = raw.trim();
          values.push(
            trimmed === "" || trimmed.toUpperCase() === "NULL" ? null : trimmed,
          );
        }
        raw = "";
        i += 1;
        continue;
      }

      if (ch === ")") {
        if (raw !== null) {
          const trimmed = raw.trim();
          values.push(
            trimmed === "" || trimmed.toUpperCase() === "NULL" ? null : trimmed,
          );
        }
        raw = "";
        i += 1;
        break;
      }

      if (raw === null) raw = "";
      raw += ch;
      i += 1;
    }

    tuples.push(values);

    skipWhitespace();
    if (text[i] === ",") {
      i += 1;
      continue;
    }
    if (text[i] === ";") {
      i += 1;
    }
    break;
  }

  return { tuples, end: i };
}

function extractInsert(table) {
  const marker = "INSERT INTO `" + table + "`";
  const start = dump.indexOf(marker);
  if (start === -1) return null;

  const valuesIndex = dump.indexOf("VALUES", start);
  if (valuesIndex === -1) return null;

  const columnsOpen = dump.indexOf("(", start);
  const columnsClose = dump.indexOf(")", columnsOpen);
  const columns = dump
    .slice(columnsOpen + 1, columnsClose)
    .split(",")
    .map((c) => c.trim().replace(/`/g, ""));

  const { tuples } = parseTuples(dump, valuesIndex + "VALUES".length);
  return { columns, tuples };
}

/* --------------------------------------------------------------------------
 * Postgres literal rendering
 * ----------------------------------------------------------------------- */
function quoteString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function renderLiteral(value, type) {
  if (value === null || value === undefined) return "null";

  if (type === BOOL) {
    const v = String(value).trim();
    if (v === "1" || v.toLowerCase() === "true") return "true";
    if (v === "0" || v.toLowerCase() === "false") return "false";
    return "null";
  }

  if (type === INT || type === NUM) {
    const v = String(value).trim();
    return /^-?\d+(\.\d+)?$/.test(v) ? v : "null";
  }

  if (type === DATE) {
    const v = String(value).trim();
    return `date '${v}'`;
  }

  if (type === TS) {
    const v = String(value).trim().replace(" ", "T");
    return `timestamptz '${v}'`;
  }

  if (type === TIME) {
    const v = String(value).trim();
    return `time '${v}'`;
  }

  return quoteString(value);
}

/* --------------------------------------------------------------------------
 * Email de-duplication
 *
 * The legacy dump contains three accounts that share
 * `delsocorro.gm@gmail.com` (ids 39, 40 and 46). Postgres requires a unique
 * e-mail, so the duplicates get a deterministic alias. The first occurrence
 * keeps the original address.
 * ----------------------------------------------------------------------- */
function dedupeEmails(rows) {
  const seen = new Map();
  const aliases = [];
  rows.forEach((row, index) => {
    const email = row.email;
    if (!seen.has(email)) {
      seen.set(email, index);
      return;
    }
    const [local, domain] = email.split("@");
    const alias = `${local}+${row.id}@${domain}`;
    aliases.push({ id: row.id, from: email, to: alias });
    row.email = alias;
  });
  return aliases;
}

/* --------------------------------------------------------------------------
 * Generate
 * ----------------------------------------------------------------------- */
const header = `-- ============================================================================
-- InstaCar — seed data
-- ----------------------------------------------------------------------------
-- Generated from car-rental/if0_42471936_car_rental.sql by
-- scripts/generate-seed.mjs. Every legacy row is preserved with the same
-- primary keys so all foreign keys (bookings -> cars -> users, and so on)
-- keep pointing at the same records.
--
-- Notes
--   * users.auth_id is NULL for every seeded row. Create the matching
--     Supabase Auth account and sign in once: the security-definer helper
--     public.ensure_user_profile() links the Auth account to the legacy row
--     with the same e-mail address.
--   * The legacy dump stores three accounts under the same e-mail address
--     (delsocorro.gm@gmail.com). Postgres needs a unique e-mail, so the
--     duplicates are aliased below.
-- ============================================================================

set client_encoding = 'UTF8';
`;

const footer = `
-- Re-align the identity sequences with the legacy ids.
select setval(pg_get_serial_sequence('public.branches', 'id'), coalesce((select max(id) from public.branches), 1));
select setval(pg_get_serial_sequence('public.users', 'id'), coalesce((select max(id) from public.users), 1));
select setval(pg_get_serial_sequence('public.cars', 'id'), coalesce((select max(id) from public.cars), 1));
select setval(pg_get_serial_sequence('public.car_schedules', 'id'), coalesce((select max(id) from public.car_schedules), 1));
select setval(pg_get_serial_sequence('public.bookings', 'id'), coalesce((select max(id) from public.bookings), 1));
select setval(pg_get_serial_sequence('public.booking_payments', 'id'), coalesce((select max(id) from public.booking_payments), 1));
select setval(pg_get_serial_sequence('public.booking_photos', 'id'), coalesce((select max(id) from public.booking_photos), 1));
select setval(pg_get_serial_sequence('public.booking_remarks', 'id'), coalesce((select max(id) from public.booking_remarks), 1));
select setval(pg_get_serial_sequence('public.reviews', 'id'), coalesce((select max(id) from public.reviews), 1));
select setval(pg_get_serial_sequence('public.contact_messages', 'id'), coalesce((select max(id) from public.contact_messages), 1));
select setval(pg_get_serial_sequence('public.site_content', 'id'), coalesce((select max(id) from public.site_content), 1));
`;

const blocks = [];
const aliases = [];

for (const table of TABLE_ORDER) {
  const parsed = extractInsert(table);
  if (!parsed) {
    blocks.push(`-- (no data for ${table})`);
    continue;
  }

  const { columns, tuples } = parsed;
  const typeMap = TYPES[table] ?? {};

  const rows = tuples.map((tuple) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = tuple[index];
    });
    return row;
  });

  if (table === "users") {
    aliases.push(...dedupeEmails(rows));
  }

  const columnList = columns.map((c) => `"${c}"`).join(", ");
  const valueLists = rows.map((row) => {
    const values = columns.map((column) => {
      const type = typeMap[column] ?? TEXT;
      return renderLiteral(row[column], type);
    });
    return `  (${values.join(", ")})`;
  });

  blocks.push(
    `-- ---------------------------------------------------------------------------\n` +
      `-- ${table}\n` +
      `-- ---------------------------------------------------------------------------\n` +
      `insert into public."${table}" (${columnList}) values\n` +
      `${valueLists.join(",\n")}\n` +
      `on conflict (id) do nothing;`,
  );
}

let sql = header + "\n" + blocks.join("\n\n") + "\n" + footer;

if (aliases.length) {
  const lines = aliases.map(
    (a) => `--   users.id ${a.id}: '${a.from}' -> '${a.to}'`,
  );
  sql = sql.replace(
    "-- ============================================================================\n\nset client_encoding",
    `-- ============================================================================\n\n${lines.join("\n")}\n\nset client_encoding`,
  );
}

writeFileSync(outPath, sql, "utf8");
console.log(`seed written to ${outPath}`);
console.log(`aliased duplicate e-mails: ${aliases.length}`);
