import { z } from "zod";

// HTML forms send "" for an empty <select>/<input type="date"> — distinct
// from `null`, which callers use to explicitly clear a field — and date
// inputs send a plain "yyyy-mm-dd" string rather than full ISO-8601. Neither
// satisfies z.string().datetime()/.cuid(), so normalize "" to undefined
// (field omitted) while leaving real `null` alone (field cleared).
const emptyStringToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const optionalCuid = () =>
  z.preprocess(emptyStringToUndefined, z.string().cuid().optional().nullable());

export const optionalDateString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
      .optional()
      .nullable()
  );
