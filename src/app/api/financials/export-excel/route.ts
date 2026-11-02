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
 * Annual income statement as an Excel-compatible HTML workbook. Read-only, admin only.
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
  let totalExpenses = 0;
  let totalProfit = 0;

  const body = MONTH_NAMES.map((name, index) => {
    const data = byMonth.get(index + 1);
    const gross = data?.gross ?? 0;
    const operator = data?.operator ?? 0;
    const staffAgent = data?.staffAgent ?? 0;
    const expenses = data?.expenses ?? 0;
    const net = data?.net ?? 0;

    totalGross += gross;
    totalOperator += operator;
    totalStaffAgent += staffAgent;
    totalExpenses += expenses;
    totalProfit += net;

    return `
      <tr>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px;">${name}</td>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px; text-align: right;">${money(gross)}</td>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px; text-align: right;">${money(operator)}</td>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px; text-align: right;">${money(staffAgent)}</td>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px; text-align: right;">${money(expenses)}</td>
        <td style="border: 1px solid #d0d7de; padding: 6px 10px; text-align: right; font-weight: bold;">${money(net)}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Income Statement ${year}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt;">
        <h2 style="margin: 0 0 4px 0;">InstaCar Rental Services</h2>
        <div style="font-size: 10pt; color: #57606a; margin-bottom: 12px;">
          Annual Income Statement — Fiscal Year ${year} (Exported on ${manilaToday()})
        </div>

        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f6f8fa; font-weight: bold;">
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: left;">Month</th>
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">Total Gross</th>
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">Operator Share</th>
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">Staff / Agent Fees</th>
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">Expenses</th>
              <th style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
          <tfoot>
            <tr style="background-color: #f6f8fa; font-weight: bold;">
              <td style="border: 1px solid #d0d7de; padding: 8px 10px;">Full Year Totals</td>
              <td style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">${money(totalGross)}</td>
              <td style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">${money(totalOperator)}</td>
              <td style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">${money(totalStaffAgent)}</td>
              <td style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right;">${money(totalExpenses)}</td>
              <td style="border: 1px solid #d0d7de; padding: 8px 10px; text-align: right; color: #0969da;">${money(totalProfit)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  const fileName = `instacar-income-statement-${year}.xls`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
