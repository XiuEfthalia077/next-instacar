import { getSupabase } from "@/lib/auth";
import { listBranches } from "@/lib/data/cars";
import { getTotalExpenses } from "@/lib/data/expenses";
import type { AppSession, Car } from "@/lib/types";

export type OwnershipFilter = "all" | "company" | "operator";

export interface AnalyticsFilter {
  startDate?: string | null;
  endDate?: string | null;
  branchId?: number | null;
  ownership?: OwnershipFilter;
  search?: string | null;
}

export interface VehicleAnalyticsItem {
  carId: number;
  brand: string;
  model: string;
  plateNumber: string;
  carType: string;
  isCompany: boolean;
  ownershipLabel: "Company-owned" | "Operator-owned";
  operatorName: string;
  branchName: string;
  branchId: number | null;
  tripsCount: number;

  // Revenue & Breakdown
  grossRevenue: number;
  dailyRent: number;
  extensionFees: number;
  deliveryFees: number;
  driverFees: number;
  fuelCharges: number;
  damageFees: number;

  // Splits
  companyNet: number;
  operatorNet: number;
  monthlyAmortization: number;
  trueCompanyNet: number;
  custodialBalance: number;
}

export interface AnalyticsSummary {
  filters: AnalyticsFilter;
  grandTotals: {
    totalGrossRevenue: number;
    totalCompanyNet: number;
    totalOperatorPayouts: number;
    totalExpenses: number;
    trueNetProfit: number;
    totalAmortizationDeductions: number;
    trueCompanyNet: number;
    totalCustodialFunds: number;
    totalDriverFees: number;
    totalTrips: number;
    totalVehicles: number;
    companyCarsCount: number;
    operatorCarsCount: number;
  };
  vehicles: VehicleAnalyticsItem[];
}

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch and calculate backend analytics data based on the business profit-sharing rules.
 */
export async function getFleetAnalytics(
  session: AppSession,
  filters: AnalyticsFilter = {},
): Promise<AnalyticsSummary> {
  const supabase = await getSupabase();

  // 1. Fetch branches for name resolution
  const branches = await listBranches();
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // 2. Fetch recorded operating expenses
  const totalExpenses = await getTotalExpenses({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // 3. Query all vehicles with user (operator) info
  let carsQuery = supabase
    .from("cars")
    .select(`
      id, brand, model, type, plate_number, user_id, branch_id,
      price_24_hours, operator_24_hours, ext_price_1_6,
      users!cars_user_id_fkey ( id, name, role )
    `)
    .order("id", { ascending: false });

  // Apply branch restriction if session is constrained or filter provided
  const activeBranchId =
    session.viewBranch !== "all"
      ? session.viewBranch
      : filters.branchId && filters.branchId > 0
        ? filters.branchId
        : null;

  if (activeBranchId) {
    carsQuery = carsQuery.eq("branch_id", activeBranchId);
  }

  const { data: carsData } = await carsQuery;
  const rawCars = carsData ?? [];

  // 4. Query settled booking payments with their associated booking details
  let paymentsQuery = supabase
    .from("booking_payments")
    .select(`
      id, booking_id, daily_rent, extension_fee, delivery_fee, pickup_fee,
      jer_delivery_fee, jer_pickup_fee, driver_fee, fuel, damage_fee,
      total_gross, total_net, operator_share, created_at, settled_at,
      bookings!booking_payments_booking_id_fkey (
        id, car_id, branch_id, start_date, end_date, total_price, status
      )
    `)
    .order("id", { ascending: false });

  // Push down date range filters to database level to avoid full-table scans
  if (filters.startDate) {
    paymentsQuery = paymentsQuery.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    paymentsQuery = paymentsQuery.lte("created_at", `${filters.endDate}T23:59:59.999Z`);
  }

  const { data: paymentsData } = await paymentsQuery;
  const rawPayments = paymentsData ?? [];

  // 5. Build vehicle row map
  const vehicleMap = new Map<number, VehicleAnalyticsItem>();

  for (const c of rawCars) {
    const rawUser = Array.isArray(c.users) ? c.users[0] : c.users;
    const isCompany = !c.user_id || rawUser?.role !== "operator";

    // Filter by ownership if requested
    if (filters.ownership === "company" && !isCompany) continue;
    if (filters.ownership === "operator" && isCompany) continue;

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const match =
        (c.brand ?? "").toLowerCase().includes(q) ||
        (c.model ?? "").toLowerCase().includes(q) ||
        (c.plate_number ?? "").toLowerCase().includes(q) ||
        (rawUser?.name ?? "").toLowerCase().includes(q);
      if (!match) continue;
    }

    vehicleMap.set(c.id, {
      carId: c.id,
      brand: c.brand ?? "",
      model: c.model ?? "",
      plateNumber: c.plate_number ?? "",
      carType: c.type ?? "Vehicle",
      isCompany,
      ownershipLabel: isCompany ? "Company-owned" : "Operator-owned",
      operatorName: isCompany ? "Company" : (rawUser?.name || `Operator #${c.user_id}`),
      branchName: (c.branch_id ? branchMap.get(c.branch_id) : null) ?? "Unassigned",
      branchId: c.branch_id ?? null,
      tripsCount: 0,
      grossRevenue: 0,
      dailyRent: 0,
      extensionFees: 0,
      deliveryFees: 0,
      driverFees: 0,
      fuelCharges: 0,
      damageFees: 0,
      companyNet: 0,
      operatorNet: 0,
      monthlyAmortization: 0,
      trueCompanyNet: 0,
      custodialBalance: 0,
    });
  }

  // 6. Aggregate payments into vehicle rows based on date filters
  for (const p of rawPayments) {
    const b = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
    if (!b?.car_id) continue;

    const row = vehicleMap.get(b.car_id);
    if (!row) continue; // Vehicle filtered out by ownership/search/branch

    // Check date range filters against booking start_date or payment settled/created date
    const targetDate = b.start_date || (p.settled_at ? p.settled_at.slice(0, 10) : p.created_at?.slice(0, 10));
    if (filters.startDate && targetDate && targetDate < filters.startDate) continue;
    if (filters.endDate && targetDate && targetDate > filters.endDate) continue;

    // Increment trip counter
    row.tripsCount += 1;

    // Payment line items
    const gross = num(p.total_gross);
    const dailyRent = num(p.daily_rent);
    const extFee = num(p.extension_fee);
    const deliveryFees = num(p.delivery_fee) + num(p.pickup_fee);
    const driverFee = num(p.driver_fee);
    const fuel = num(p.fuel);
    const damage = num(p.damage_fee);

    row.grossRevenue += gross;
    row.dailyRent += dailyRent;
    row.extensionFees += extFee;
    row.deliveryFees += deliveryFees;
    row.driverFees += driverFee;
    row.fuelCharges += fuel;
    row.damageFees += damage;

    if (row.isCompany) {
      // ──────────────── COMPANY CARS ────────────────
      // Company Net: Daily Rent + Extension Fee + Delivery Fees - Driver Fees
      // (Operator Net is strictly ₱0)
      const coNet = dailyRent + extFee + deliveryFees - driverFee;
      row.companyNet += coNet;
      row.trueCompanyNet += coNet;
    } else {
      // ──────────────── OPERATOR CARS ────────────────
      // Company Net: Fixed cut of Daily Rent + Fixed cut of Extension Fee
      // Operator Net: Remaining Daily Rent + Remaining Extension Fee
      // Custodial: 100% of Fuel Charges and Damage Fees tracked as Custodial Balance
      // Driver Fees: Passed 100% to drivers (deducted from gross)

      // 1. Daily Rent split
      let opRentShare = num(p.operator_share);
      if (opRentShare <= 0 && dailyRent > 0) {
        // Fallback to 75% if not recorded in settlement
        opRentShare = Math.round(dailyRent * 0.75);
      }
      const opDailyRent = Math.min(dailyRent, opRentShare);
      const coDailyRent = Math.max(0, dailyRent - opDailyRent);

      // 2. Extension Fee split (25% company cut / 75% operator share)
      const coExt = Math.round(extFee * 0.25 * 100) / 100;
      const opExt = Math.round((extFee - coExt) * 100) / 100;

      row.companyNet += coDailyRent + coExt;
      row.operatorNet += opDailyRent + opExt;
      row.trueCompanyNet += coDailyRent + coExt;

      // 3. Custodial Ledger: Fuel + Damage Fees
      row.custodialBalance += fuel + damage;
    }
  }

  // 7. Calculate Grand Totals
  const vehicleList = Array.from(vehicleMap.values()).sort((a, b) => b.grossRevenue - a.grossRevenue);

  let totalGrossRevenue = 0;
  let totalCompanyNet = 0;
  let totalOperatorPayouts = 0;
  let totalAmortizationDeductions = 0;
  let totalCustodialFunds = 0;
  let totalDriverFees = 0;
  let totalTrips = 0;
  let companyCarsCount = 0;
  let operatorCarsCount = 0;

  for (const v of vehicleList) {
    totalGrossRevenue += v.grossRevenue;
    totalCompanyNet += v.companyNet;
    totalOperatorPayouts += v.operatorNet;
    totalCustodialFunds += v.custodialBalance;
    totalDriverFees += v.driverFees;
    totalTrips += v.tripsCount;

    if (v.isCompany) {
      companyCarsCount += 1;
    } else {
      operatorCarsCount += 1;
    }
  }

  const trueCompanyNet = totalCompanyNet - totalExpenses;

  return {
    filters,
    grandTotals: {
      totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
      totalCompanyNet: Math.round(totalCompanyNet * 100) / 100,
      totalOperatorPayouts: Math.round(totalOperatorPayouts * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      trueNetProfit: Math.round(trueCompanyNet * 100) / 100,
      totalAmortizationDeductions: Math.round(totalExpenses * 100) / 100,
      trueCompanyNet: Math.round(trueCompanyNet * 100) / 100,
      totalCustodialFunds: Math.round(totalCustodialFunds * 100) / 100,
      totalDriverFees: Math.round(totalDriverFees * 100) / 100,
      totalTrips,
      totalVehicles: vehicleList.length,
      companyCarsCount,
      operatorCarsCount,
    },
    vehicles: vehicleList,
  };
}
