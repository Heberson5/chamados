import ExcelJS from "exceljs";

export interface ExcelReportColumn {
  label: string;
  width?: number;
}

export interface ExcelReportOptions {
  filename: string;
  sheetName?: string;
  headerText: string;
  footerText?: string;
  headerColor?: string;       // hex like "#000000"
  headerTextColor?: string;   // hex like "#ffffff"
  logoDataUrl?: string | null;
  columns: ExcelReportColumn[];
  rows: (string | number | null | undefined)[][];
}

function hexToArgb(hex?: string, fallback = "FF000000"): string {
  if (!hex) return fallback;
  const v = hex.replace("#", "").trim();
  if (v.length === 6) return "FF" + v.toUpperCase();
  if (v.length === 8) return v.toUpperCase();
  return fallback;
}

async function fetchAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith("data:")) {
      const res = await fetch(url);
      return await res.arrayBuffer();
    }
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function exportStyledExcel(opts: ExcelReportOptions): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Chamados";
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName || "Relatório", {
    pageSetup: { paperSize: 9, orientation: opts.columns.length > 5 ? "landscape" : "portrait" },
  });

  const colCount = opts.columns.length;
  ws.columns = opts.columns.map((c) => ({ header: c.label, key: c.label, width: c.width ?? 18 }));

  const headerArgb = hexToArgb(opts.headerColor, "FF000000");
  const headerTextArgb = hexToArgb(opts.headerTextColor, "FFFFFFFF");

  // --- Banner row (logo + title), mirrors PDF header ---
  ws.spliceRows(1, 0, []);
  const banner = ws.getRow(1);
  banner.height = 38;
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = opts.headerText;
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: headerTextArgb } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerArgb } };

  if (opts.logoDataUrl) {
    const buf = await fetchAsBuffer(opts.logoDataUrl);
    if (buf) {
      const ext = opts.logoDataUrl.includes("image/png") || opts.logoDataUrl.endsWith(".png") ? "png" : "jpeg";
      const imageId = wb.addImage({ buffer: buf as any, extension: ext as any });
      ws.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 90, height: 30 } });
    }
  }

  // --- Column header row ---
  const headerRow = ws.getRow(2);
  opts.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: headerTextArgb } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerArgb } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF888888" } },
      bottom: { style: "thin", color: { argb: "FF888888" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
  });
  headerRow.height = 24;

  // --- Data rows with zebra striping ---
  opts.rows.forEach((r, idx) => {
    const row = ws.addRow(r.map((v) => (v == null ? "" : v)));
    const zebra = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = {
        top: { style: "hair", color: { argb: "FFDDDDDD" } },
        bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        left: { style: "hair", color: { argb: "FFEEEEEE" } },
        right: { style: "hair", color: { argb: "FFEEEEEE" } },
      };
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F8FA" } };
      }
    });
  });

  ws.views = [{ state: "frozen", ySplit: 2 }];

  // --- Footer ---
  const footerRow = ws.addRow([]);
  ws.mergeCells(footerRow.number, 1, footerRow.number, colCount);
  const footerCell = ws.getCell(footerRow.number, 1);
  footerCell.value = `${opts.footerText || "Relatório gerado pelo sistema"} — Impresso em: ${new Date().toLocaleString("pt-BR")}`;
  footerCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };
  footerCell.alignment = { horizontal: "right" };

  // --- Trigger download ---
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = opts.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}