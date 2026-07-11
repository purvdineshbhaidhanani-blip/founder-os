import { z } from "zod";

export const payslipLineInputSchema = z.object({
  employeeId: z.string().uuid(),
  regularHours: z.number().min(0).max(400),
  overtimeHours: z.number().min(0).max(200).default(0),
  grossPayCents: z.number().int().min(0),
  taxWithheldCents: z.number().int().min(0),
  netPayCents: z.number().int().min(0),
  attendanceHoursReported: z.number().min(0).max(400).optional(),
});

export const createPayrollRunSchema = z.object({
  companyId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  payslipLines: z.array(payslipLineInputSchema).min(1).max(5000),
});

export const listPayrollRunsQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listFindingsQuerySchema = z.object({
  payrollRunId: z.string().uuid().optional(),
  status: z.enum(["open", "resolved"]).optional(),
  category: z.enum(["salary_calculation", "tax_withholding", "attendance_mismatch", "overtime"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateFindingStatusSchema = z.object({
  status: z.enum(["open", "resolved"]),
});
