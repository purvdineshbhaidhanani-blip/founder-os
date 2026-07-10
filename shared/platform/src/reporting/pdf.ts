import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 16;
const TITLE_SIZE = 18;
const BODY_SIZE = 10;

export interface PdfReportSection {
  heading: string;
  rows: string[][]; // first row is treated as the header row
}

export interface PdfReportOptions {
  title: string;
  generatedAt?: Date;
  sections: PdfReportSection[];
}

/**
 * Real PDF generation via pdf-lib — a lightweight, table-of-text-lines
 * renderer (not a full layout engine, which would be over-engineering for
 * the report shapes every product in this portfolio actually needs:
 * compliance summaries, spend breakdowns, audit findings — all
 * fundamentally "sections of tabular rows").
 */
export async function toPdfBuffer(options: PdfReportOptions): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage();
  let { height } = page.getSize();
  let cursorY = height - PAGE_MARGIN;

  function newPageIfNeeded(spaceNeeded: number): void {
    if (cursorY - spaceNeeded < PAGE_MARGIN) {
      page = doc.addPage();
      height = page.getSize().height;
      cursorY = height - PAGE_MARGIN;
    }
  }

  function drawLine(text: string, params: { size: number; bold?: boolean; color?: ReturnType<typeof rgb> } = { size: BODY_SIZE }): void {
    newPageIfNeeded(LINE_HEIGHT);
    page.drawText(text, {
      x: PAGE_MARGIN,
      y: cursorY,
      size: params.size,
      font: params.bold ? boldFont : font,
      color: params.color ?? rgb(0.1, 0.1, 0.1),
    });
    cursorY -= LINE_HEIGHT * (params.size / BODY_SIZE);
  }

  drawLine(options.title, { size: TITLE_SIZE, bold: true });
  drawLine(`Generated ${(options.generatedAt ?? new Date()).toISOString()}`, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  cursorY -= LINE_HEIGHT / 2;

  for (const section of options.sections) {
    newPageIfNeeded(LINE_HEIGHT * 3);
    drawLine(section.heading, { size: 13, bold: true });

    const [headerRow, ...bodyRows] = section.rows;
    if (headerRow) {
      drawLine(headerRow.join("   |   "), { size: BODY_SIZE, bold: true });
    }
    for (const row of bodyRows) {
      drawLine(row.join("   |   "), { size: BODY_SIZE });
    }
    cursorY -= LINE_HEIGHT / 2;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// Re-exported for callers that need direct low-level page access beyond toPdfBuffer's section model.
export type { PDFPage };
