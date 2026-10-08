import ExcelJS from "exceljs";

export function prepareSheet(workbook: ExcelJS.Workbook, title: string, subtitle: string, columns: Partial<ExcelJS.Column>[]) {
  workbook.creator = "StitchFlow";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(title, { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells(1, 1, 1, columns.length);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  sheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176A4B" } };
  sheet.getCell(1, 1).alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.getCell(2, 1).value = subtitle;
  sheet.getCell(2, 1).font = { italic: true, color: { argb: "FF53665D" } };
  sheet.columns = columns;
  const header = sheet.getRow(4);
  columns.forEach((column, index) => { const cell = header.getCell(index + 1); cell.value = column.header as string; cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF245A45" } }; cell.alignment = { vertical: "middle" }; });
  header.height = 24;
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  return sheet;
}

export function finishRows(sheet: ExcelJS.Worksheet) {
  for (let row = 5; row <= sheet.rowCount; row += 1) {
    if (row % 2 === 0) sheet.getRow(row).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7F4" } };
    sheet.getRow(row).alignment = { vertical: "top", wrapText: true };
  }
}

export async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
