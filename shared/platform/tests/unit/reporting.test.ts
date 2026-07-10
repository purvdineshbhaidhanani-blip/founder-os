import { describe, expect, it } from "vitest";
import { toCsv } from "../../src/reporting/csv.js";
import { toExcelBuffer } from "../../src/reporting/excel.js";
import { toPdfBuffer } from "../../src/reporting/pdf.js";
import { computeNextRunAt } from "../../src/reporting/schedule.js";

describe("toCsv", () => {
  it("produces a header row and data rows", () => {
    const csv = toCsv([{ name: "Acme", spend: 1000 }, { name: "Globex", spend: 2000 }]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("name,spend");
    expect(lines[1]).toBe("Acme,1000");
    expect(lines[2]).toBe("Globex,2000");
  });

  it("quotes fields containing commas", () => {
    const csv = toCsv([{ name: "Acme, Inc" }]);
    expect(csv).toContain('"Acme, Inc"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ note: 'She said "hi"' }]);
    expect(csv).toContain('"She said ""hi"""');
  });

  it("quotes fields containing newlines", () => {
    const csv = toCsv([{ note: "line1\nline2" }]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("respects an explicit column order", () => {
    const csv = toCsv([{ b: 2, a: 1 }], ["a", "b"]);
    expect(csv.split("\r\n")[0]).toBe("a,b");
  });
});

describe("toExcelBuffer", () => {
  it("produces a real, non-empty XLSX buffer", async () => {
    const buffer = await toExcelBuffer({
      sheetName: "Spend Summary",
      rows: [{ vendor: "Acme", amount: 1000 }],
    });
    expect(buffer.length).toBeGreaterThan(0);
    // XLSX files are ZIP archives — the ZIP local file header magic bytes are 'PK'.
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});

describe("toPdfBuffer", () => {
  it("produces a real, non-empty PDF buffer", async () => {
    const buffer = await toPdfBuffer({
      title: "Compliance Report",
      sections: [{ heading: "Findings", rows: [["Severity", "Issue"], ["High", "Missing MFA"]] }],
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });

  it("handles an empty sections array without throwing", async () => {
    const buffer = await toPdfBuffer({ title: "Empty Report", sections: [] });
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe("computeNextRunAt", () => {
  it("computes the next occurrence for a daily cron expression", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const next = computeNextRunAt("0 9 * * *", from); // 9am daily
    expect(next.getUTCHours()).toBe(9);
    expect(next > from).toBe(true);
  });

  it("throws a validation error for a malformed cron expression", () => {
    expect(() => computeNextRunAt("not a cron expression")).toThrow();
  });
});
