import { getSession } from "@/lib/auth";
import { currentYear, incomeStatement } from "@/lib/data/finance";
import { manilaNowTimestamp, manilaToday } from "@/lib/datetime";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function money(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Legacy `pages/admin/process/export_excel.php` — the annual income statement
 * as an Excel-compatible HTML workbook. Read-only, admin only.
 */
export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return new Response("Access denied.", { status: 403 });
  }

  const year = currentYear();
  const { months } = await incomeStatement(session, year);
  const byMonth = new Map(months.map((row) => [row.month, row]));

  let totalGross = 0;
  let totalOperator = 0;
  let totalStaffAgent = 0;
  let totalCompanyNet = 0;
  let totalExpenses = 0;
  let totalProfit = 0;

  const body = MONTH_NAMES.map((name, index) => {
    const data = byMonth.get(index + 1);
    const gross = data?.gross ?? 0;
    const operator = data?.operator ?? 0;
    const staffAgent = data?.staffAgent ?? 0;
    const expenses = data?.expenses ?? 0;
    const companyNet = gross - operator - staffAgent;
    const netProfit = companyNet - expenses;

    totalGross += gross;
    totalOperator += operator;
    totalStaffAgent += staffAgent;
    totalCompanyNet += companyNet;
    totalExpenses += expenses;
    totalProfit += netProfit;

    return `
      <tr>
        <td class="data-td text-center" style="font-weight:600;">${name}</td>
        <td class="data-td text-right num-fmt">${money(gross)}</td>
        <td class="data-td text-right num-fmt" style="color:#b45309;">-${money(operator)}</td>
        <td class="data-td text-right num-fmt" style="color:#7c3aed;">-${money(staffAgent)}</td>
        <td class="data-td text-right num-fmt" style="color:#0369a1;font-weight:bold;">${money(companyNet)}</td>
        <td class="data-td text-right num-fmt" style="color:#b91c1c;">-${money(expenses)}</td>
        <td class="data-td text-right num-fmt" style="font-weight:bold;color:${netProfit >= 0 ? "#15803d" : "#b91c1c"};">${money(netProfit)}</td>
      </tr>`;
  }).join("");

  // Legacy `date('F j, Y, g:i a')` in Asia/Manila.
  const now = new Date(manilaNowTimestamp());
  const hour = now.getUTCHours();
  const hour12 = hour % 12 || 12;
  const generated = `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}, ${hour12}:${String(now.getUTCMinutes()).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
  const fileName = `Financial_Statement_${year}_${manilaToday().replace(/-/g, "")}.xls`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Financial Statement</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; }
    .title { font-size: 16pt; font-weight: bold; color: #0f172a; }
    .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 15px; }
    .header-th { background-color: #1e293b; color: #ffffff; font-weight: bold; text-align: center; border: 0.5pt solid #475569; padding: 8px; }
    .data-td { border: 0.5pt solid #cbd5e1; padding: 6px; vertical-align: middle; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .total-row td { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 0.5pt solid #020617; padding: 8px; }
    .num-fmt { mso-number-format:"\\₱\\#\\,\\#\\#0\\.00"; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="7" class="title">FINANCIAL STATEMENT (${year})</td></tr>
    <tr><td colspan="7" class="subtitle">Generated on ${generated}</td></tr>
    <tr><td colspan="7"></td></tr>
    <thead>
      <tr>
        <th class="header-th" style="width:120px;">MONTH</th>
        <th class="header-th" style="width:140px;">GROSS REVENUE</th>
        <th class="header-th" style="width:140px;">OPERATOR PAYOUTS</th>
        <th class="header-th" style="width:140px;">STAFF / AGENT</th>
        <th class="header-th" style="width:140px;">COMPANY NET</th>
        <th class="header-th" style="width:140px;">EXPENSES</th>
        <th class="header-th" style="width:140px;">NET PROFIT</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr class="total-row">
        <td class="text-center">GRAND TOTAL</td>
        <td class="text-right num-fmt">${money(totalGross)}</td>
        <td class="text-right num-fmt" style="color:#fde047;">-${money(totalOperator)}</td>
        <td class="text-right num-fmt" style="color:#c4b5fd;">-${money(totalStaffAgent)}</td>
        <td class="text-right num-fmt" style="color:#7dd3fc;">${money(totalCompanyNet)}</td>
        <td class="text-right num-fmt" style="color:#fca5a5;">-${money(totalExpenses)}</td>
        <td class="text-right num-fmt" style="color:#4ade80;">${money(totalProfit)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
