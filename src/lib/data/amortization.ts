import { getSupabase } from "@/lib/auth";
import type { Car } from "@/lib/types";

const AMORTIZATION_KEY = "car_monthly_amortizations";

/**
 * Fetch all car monthly amortization values from site_content.
 * Returns a map of carId -> amortization amount in PHP.
 */
export async function getCarAmortizations(): Promise<Record<number, number>> {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("site_content")
      .select("content_value")
      .eq("content_key", AMORTIZATION_KEY)
      .maybeSingle();

    if (data?.content_value) {
      const parsed = JSON.parse(data.content_value);
      if (typeof parsed === "object" && parsed !== null) {
        const result: Record<number, number> = {};
        for (const [key, val] of Object.entries(parsed)) {
          const numKey = Number(key);
          const numVal = Number(val);
          if (Number.isFinite(numKey) && Number.isFinite(numVal)) {
            result[numKey] = numVal;
          }
        }
        return result;
      }
    }
  } catch {
    /* ignore and return empty */
  }
  return {};
}

/**
 * Get monthly amortization for a specific car.
 */
export async function getCarAmortization(carId: number, car?: Partial<Car> | null): Promise<number> {
  if (car && typeof car.monthly_amortization === "number" && Number.isFinite(car.monthly_amortization)) {
    return car.monthly_amortization;
  }
  const all = await getCarAmortizations();
  return all[carId] ?? 0;
}

/**
 * Save monthly amortization for a specific car into site_content.
 * Also attempts to update `cars.monthly_amortization` if the column exists in the database.
 */
export async function saveCarAmortization(carId: number, amount: number): Promise<void> {
  try {
    const supabase = await getSupabase();
    const current = await getCarAmortizations();
    current[carId] = Math.max(0, Number(amount) || 0);

    const serialized = JSON.stringify(current);

    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("content_key", AMORTIZATION_KEY)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("site_content")
        .update({
          content_value: serialized,
          updated_at: new Date().toISOString(),
        })
        .eq("content_key", AMORTIZATION_KEY);
    } else {
      await supabase.from("site_content").insert({
        content_key: AMORTIZATION_KEY,
        content_value: serialized,
        updated_at: new Date().toISOString(),
      });
    }

    // Best-effort attempt to update cars table column if applied in database
    await supabase
      .from("cars")
      .update({ monthly_amortization: current[carId] })
      .eq("id", carId);
  } catch {
    /* ignore if column doesn't exist */
  }
}
