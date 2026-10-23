/**
 * Pricing rules — direct port of the legacy PHP helpers.
 *
 * Source of truth:
 *   car-rental/pages/admin/process/booking_actions.php  (calculatePriceByHours, getRateName)
 *   car-rental/pages/user/process/booking_process.php     (calculateServerPrice)
 *   car-rental/pages/user/process/calculate_price.php     (tier breakdown)
 *
 * The tier structure is fixed and must not be changed:
 *   <= 10h  -> price_10_hours
 *   <= 12h  -> price_12_hours
 *   <= 24h  -> price_24_hours
 *   >  24h  -> floor(days) * price_24_hours + extension tier fee
 */

export interface CarPricing {
  price_10_hours: number;
  price_12_hours: number;
  price_24_hours: number;
  ext_price_1_6: number;
  ext_price_7_10: number;
  ext_price_11_12: number;
  ext_price_13_24: number;
}

export interface CarOperatorPricing {
  operator_10_hours: number;
  operator_12_hours: number;
  operator_24_hours: number;
}

/** Number of whole hours between two timestamps (rounded to 2 decimals). */
export function hoursBetween(
  start: { date: string; time?: string | null },
  end: { date: string; time?: string | null },
): number {
  const startMs = toTimestamp(start.date, start.time ?? "00:00:00");
  const endMs = toTimestamp(end.date, end.time ?? "00:00:00");
  return Math.round(((endMs - startMs) / 3_600_000) * 100) / 100;
}

/**
 * Parses a MySQL-ish `YYYY-MM-DD` + `HH:MM:SS` pair into a UTC epoch
 * (the app works in Asia/Manila but all comparisons are relative, so a
 * fixed offset is enough to stay consistent).
 */
export function toTimestamp(date: string, time = "00:00:00"): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, hh, mm, ss);
}

/**
 * Port of `calculatePriceByHours()` / `calculateServerPrice()`.
 * Identical in both legacy files.
 */
export function calculatePriceByHours(
  hours: number,
  p10: number,
  p12: number,
  p24: number,
  ext1_6: number,
  ext7_10: number,
  ext11_12: number,
  ext13_24: number,
): number {
  const h = Math.round(hours * 100) / 100;

  if (h <= 10) return Number(p10);
  if (h <= 12) return Number(p12);
  if (h <= 24) return Number(p24);

  const days = Math.floor(h / 24);
  const extraHours = h - days * 24;
  let basePrice = days * Number(p24);

  if (extraHours > 0) {
    if (extraHours <= 6) basePrice += Number(ext1_6);
    else if (extraHours <= 10) basePrice += Number(ext7_10);
    else if (extraHours <= 12) basePrice += Number(ext11_12);
    else basePrice += Number(ext13_24);
  }

  return Math.round(basePrice * 100) / 100;
}

/** Convenience overload that reads straight from a car row. */
export function calculateCarPrice(hours: number, car: CarPricing): number {
  return calculatePriceByHours(
    hours,
    Number(car.price_10_hours ?? 0),
    Number(car.price_12_hours ?? 0),
    Number(car.price_24_hours ?? 0),
    Number(car.ext_price_1_6 ?? 0),
    Number(car.ext_price_7_10 ?? 0),
    Number(car.ext_price_11_12 ?? 0),
    Number(car.ext_price_13_24 ?? 0),
  );
}

/**
 * Port of `getRateName()`.
 *   "10-Hour Tier" | "12-Hour Tier" | "24-Hour Day Tier" | "N Day(s) + Extra Hours Tier"
 */
export function getRateName(hours: number): string {
  const h = Math.ceil(hours);
  if (h <= 10) return "10-Hour Tier";
  if (h <= 12) return "12-Hour Tier";
  if (h <= 24) return "24-Hour Day Tier";
  const days = Math.floor(h / 24);
  return `${days} Day(s) + Extra Hours Tier`;
}

/**
 * Port of the tier breakdown returned by
 * car-rental/pages/user/process/calculate_price.php
 */
export function getRateBreakdown(
  hours: number,
  car: CarPricing,
  discount = 0,
  downPayment = 0,
) {
  const totalHours = Math.ceil(hours);
  const p10 = Number(car.price_10_hours ?? 0);
  const p12 = Number(car.price_12_hours ?? 0);
  const p24 = Number(car.price_24_hours ?? 0);

  let basePrice = 0;
  let rateType = "";

  if (totalHours <= 10) {
    basePrice = p10;
    rateType = "10-Hour Tier Tariff";
  } else if (totalHours <= 12) {
    basePrice = p12;
    rateType = "12-Hour Tier Tariff";
  } else if (totalHours <= 24) {
    basePrice = p24;
    rateType = "24-Hour (Full Day) Tier Tariff";
  } else {
    const days = Math.floor(totalHours / 24);
    const extraHours = totalHours % 24;
    basePrice = days * p24;
    rateType = `${days} Day(s) Rate (₱${p24.toFixed(2)}/day)`;

    if (extraHours > 0) {
      let extensionFee = 0;
      if (extraHours <= 6) extensionFee = Number(car.ext_price_1_6 ?? 0);
      else if (extraHours <= 10) extensionFee = Number(car.ext_price_7_10 ?? 0);
      else if (extraHours <= 12) extensionFee = Number(car.ext_price_11_12 ?? 0);
      else extensionFee = Number(car.ext_price_13_24 ?? 0);

      basePrice += extensionFee;
      rateType += ` + ${extraHours} hr(s) extension (₱${extensionFee.toFixed(2)})`;
    }
  }

  const remainingBalance = Math.max(0, basePrice - discount - downPayment);

  return {
    duration_hours: totalHours,
    rate_type: rateType,
    base_rate: Math.round(basePrice * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    down_payment: Math.round(downPayment * 100) / 100,
    balance_due: Math.round(remainingBalance * 100) / 100,
    total_price: Math.round(basePrice * 100) / 100,
  };
}

/**
 * Port of the `operator_share` computation in
 * car-rental/pages/admin/process/save_payment.php
 *
 * Notes:
 *  - Only applies when the *car owner* has the `operator` role.
 *  - Hours are CEILed and taken from the *scheduled* window (the extension
 *    fee is deliberately not included, matching the legacy behaviour).
 *  - Unlike customer pricing there is no extension tier: beyond 24h the
 *    operator share is floor(days) * operator_24_hours.
 */
export function computeOperatorShare(
  hours: number,
  pricing: CarOperatorPricing,
): number {
  const h = Math.ceil(hours);
  const op10 = Number(pricing.operator_10_hours ?? 0);
  const op12 = Number(pricing.operator_12_hours ?? 0);
  const op24 = Number(pricing.operator_24_hours ?? 0);

  let share = 0;

  if (h <= 10 && op10 > 0) share = op10;
  else if (h <= 12 && op12 > 0) share = op12;
  else if (h <= 24 && op24 > 0) share = op24;
  else if (op24 > 0) share = Math.floor(h / 24) * op24;

  return Math.round(share * 100) / 100;
}

/**
 * Settlement totals — port of car-rental/pages/admin/process/save_payment.php
 *
 *   total_gross = rent + ext + delivery + pickup + damage + others + wash + fuel + driver
 *   total_net   = total_gross - jer_delivery_fee - jer_pickup_fee - agent_fee
 */
export interface SettlementInput {
  daily_rent: number;
  carwash: number;
  extension_fee: number;
  delivery_fee: number;
  jer_delivery_fee: number;
  pickup_fee: number;
  jer_pickup_fee: number;
  fuel: number;
  driver_fee: number;
  damage_fee: number;
  agent_fee: number;
  others: number;
}

export interface SettlementTotals extends SettlementInput {
  total_gross: number;
  total_net: number;
}

export function computeSettlementTotals(input: SettlementInput): SettlementTotals {
  const totalGross =
    Number(input.daily_rent) +
    Number(input.extension_fee) +
    Number(input.delivery_fee) +
    Number(input.pickup_fee) +
    Number(input.damage_fee) +
    Number(input.others) +
    Number(input.carwash) +
    Number(input.fuel) +
    Number(input.driver_fee);

  const totalNet =
    totalGross -
    Number(input.jer_delivery_fee) -
    Number(input.jer_pickup_fee) -
    Number(input.agent_fee);

  const r2 = (n: number) => Math.round(n * 100) / 100;

  return { ...input, total_gross: r2(totalGross), total_net: r2(totalNet) };
}
