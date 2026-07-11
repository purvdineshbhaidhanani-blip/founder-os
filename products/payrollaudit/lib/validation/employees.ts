import { z } from "zod";

export const createEmployeeSchema = z
  .object({
    companyId: z.string().uuid(),
    employeeCode: z.string().min(1).max(60),
    fullName: z.string().min(1).max(200),
    payType: z.enum(["hourly", "salaried"]),
    hourlyRateCents: z.number().int().positive().optional(),
    annualSalaryCents: z.number().int().positive().optional(),
    payPeriodsPerYear: z.number().int().min(1).max(52).default(26),
  })
  .refine((v) => (v.payType === "hourly" ? v.hourlyRateCents !== undefined : v.annualSalaryCents !== undefined), {
    message: "hourlyRateCents is required for hourly employees, annualSalaryCents is required for salaried employees.",
  });

export const listEmployeesQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
