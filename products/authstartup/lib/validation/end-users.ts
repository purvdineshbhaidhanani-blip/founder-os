import { z } from "zod";

export const registerEndUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const loginEndUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
