import { z } from "zod";
export const exampleWorkflowInputSchema = z.strictObject({
  tenantId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  pauseMs: z.number().int().min(0).max(30_000).default(0),
});
export const exampleActivityInputSchema = exampleWorkflowInputSchema
  .omit({ pauseMs: true })
  .extend({ step: z.enum(["prepare", "finish"]) });
export const exampleActivityResultSchema = exampleActivityInputSchema.extend({
  attempt: z.number().int().min(1).max(3),
  message: z.string().min(1),
});
export const exampleWorkflowResultSchema = z.strictObject({
  tenantId: z.uuid(),
  prepared: exampleActivityResultSchema,
  finished: exampleActivityResultSchema,
});
export const exampleWorkflowStateSchema = z.strictObject({
  phase: z.enum(["preparing", "waiting", "finishing", "complete"]),
  completedActivities: z.number().int().min(0).max(2),
});
export type ExampleWorkflowInput = z.input<typeof exampleWorkflowInputSchema>;
export type ExampleActivityInput = z.output<typeof exampleActivityInputSchema>;
export type ExampleActivityResult = z.output<
  typeof exampleActivityResultSchema
>;
export type ExampleWorkflowResult = z.output<
  typeof exampleWorkflowResultSchema
>;
export type ExampleWorkflowState = z.output<typeof exampleWorkflowStateSchema>;
export const temporalConnectionSchema = z
  .object({
    APP_ENV: z.enum(["development", "staging", "production"]),
    TEMPORAL_ADDRESS: z
      .string()
      .regex(/^[a-zA-Z0-9.-]+:\d{1,5}$/)
      .refine((value) => {
        const port = Number(value.split(":")[1]);
        return port > 0 && port <= 65535;
      })
      .optional(),
    TEMPORAL_NAMESPACE: z.string().min(1).max(200).optional(),
    TEMPORAL_TASK_QUEUE: z.string().min(1).max(200).default("beacon-example"),
    TEMPORAL_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.APP_ENV !== "development") {
      for (const field of ["TEMPORAL_ADDRESS", "TEMPORAL_NAMESPACE"] as const)
        if (!value[field])
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Explicit runtime configuration required",
          });
    }
    if (value.APP_ENV !== "development" && !value.TEMPORAL_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["TEMPORAL_API_KEY"],
        message: "Runtime authentication required",
      });
  })
  .transform((value) => ({
    ...value,
    TEMPORAL_ADDRESS: value.TEMPORAL_ADDRESS ?? "127.0.0.1:17233",
    TEMPORAL_NAMESPACE: value.TEMPORAL_NAMESPACE ?? "default",
  }));
