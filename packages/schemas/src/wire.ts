import { z } from "zod";
import { type EntityName, entitySchemas } from "./domain.js";

export type Wire<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? Wire<Item>[]
    : T extends object
      ? { [K in keyof T]: Wire<T[K]> }
      : T;

/** Derive JSON-safe contracts without changing the database's Date representation. */
export function toWireSchema<S extends z.ZodType>(
  schema: S,
): z.ZodType<Wire<z.output<S>>> {
  let result: z.ZodType = schema;
  if (schema instanceof z.ZodDate) {
    if (schema.def.checks?.length)
      throw new Error("Date refinements need an explicit wire contract");
    result = z.iso.datetime({ offset: true });
  } else if (schema instanceof z.ZodNullable)
    result = toWireSchema(schema.unwrap() as z.ZodType).nullable();
  else if (schema instanceof z.ZodOptional)
    result = toWireSchema(schema.unwrap() as z.ZodType).optional();
  else if (schema instanceof z.ZodObject)
    result = schema.safeExtend(
      Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => [
          key,
          toWireSchema(value as z.ZodType),
        ]),
      ),
    );
  else if (schema instanceof z.ZodArray)
    result = schema.clone({
      ...schema.def,
      element: toWireSchema(schema.element as z.ZodType),
    });
  else if (schema instanceof z.ZodRecord)
    result = z.record(
      schema.keyType,
      toWireSchema(schema.valueType as z.ZodType),
    );
  else if (schema instanceof z.ZodUnion)
    result = z.union(
      schema.options.map((value) => toWireSchema(value as z.ZodType)) as [
        z.ZodType,
        z.ZodType,
        ...z.ZodType[],
      ],
    );
  return result.meta(schema.meta() ?? {}) as z.ZodType<Wire<z.output<S>>>;
}

export const wireEntitySchemas = Object.fromEntries(
  Object.entries(entitySchemas).map(([name, schema]) => [
    name,
    toWireSchema(schema),
  ]),
) as {
  [K in EntityName]: z.ZodType<Wire<z.output<(typeof entitySchemas)[K]>>>;
};

export function serializeEntity<K extends EntityName>(
  name: K,
  value: z.input<(typeof entitySchemas)[K]>,
): Wire<z.output<(typeof entitySchemas)[K]>> {
  const row = entitySchemas[name].parse(value);
  const wire = wireEntitySchemas[name] as z.ZodType<
    Wire<z.output<(typeof entitySchemas)[K]>>
  >;
  return wire.parse(JSON.parse(JSON.stringify(row)));
}
