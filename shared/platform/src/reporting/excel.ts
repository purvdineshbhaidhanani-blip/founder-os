import ExcelJS from "exceljs";

/** Excel export via exceljs — real workbook generation, not a CSV-with-.xlsx-extension shortcut. */
export async function toExcelBuffer<T extends Record<string, unknown>>(params: {
  sheetName: string;
  rows: T[];
  columns?: { key: keyof T; header: string; width?: number }[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(params.sheetName);

  const columns: { key: keyof T; header: string; width?: number }[] =
    params.columns ?? (Object.keys(params.rows[0] ?? {}) as (keyof T)[]).map((key) => ({ key, header: String(key) }));

  sheet.columns = columns.map((col) => ({ key: String(col.key), header: col.header, width: col.width ?? 20 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of params.rows) {
    sheet.addRow(row as Record<string, unknown>);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
