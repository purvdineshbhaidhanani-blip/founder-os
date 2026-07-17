import { z, type ZodTypeAny } from "zod";

/**
 * Minimal Zod -> JSON Schema renderer, scoped to exactly the schema shapes
 * this repository's tools use (object/string/number/boolean/array/enum/
 * optional/default/nullable). Not a general-purpose library — there is no
 * `zod-to-json-schema` dependency in this project, and adding one for a
 * handful of tool schemas would be a heavier dependency than the problem
 * warrants. An unsupported node degrades to `{}` (accept-anything) rather
 * than throwing, so an unusual schema never crashes tool discovery.
 */
export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema._def;

  if (schema instanceof z.ZodString) {
    return { type: "string", ...(def.description ? { description: def.description } : {}) };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: "number", ...(def.description ? { description: def.description } : {}) };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: def.values };
  }
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(def.type as ZodTypeAny) };
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return zodToJsonSchema(def.innerType as ZodTypeAny);
  }
  if (schema instanceof z.ZodDefault) {
    return { ...zodToJsonSchema(def.innerType as ZodTypeAny), default: def.defaultValue() };
  }
  if (schema instanceof z.ZodObject) {
    const shape = def.shape() as Record<string, ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) required.push(key);
    }
    return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
  }

  return {};
}
