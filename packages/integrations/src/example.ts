import {
  type ExampleActivityInput,
  type ExampleActivityResult,
  exampleActivityInputSchema,
  exampleActivityResultSchema,
} from "@beacon/schemas";
export interface ExampleAdapter {
  execute(
    input: ExampleActivityInput,
    attempt: number,
  ): Promise<ExampleActivityResult>;
}
/** Local, side-effect-free example. Business integrations belong in separate adapters. */
export const localExampleAdapter: ExampleAdapter = {
  async execute(input, attempt) {
    const parsed = exampleActivityInputSchema.parse(input);
    return exampleActivityResultSchema.parse({
      ...parsed,
      attempt,
      message: `${parsed.step}: ${parsed.name}`,
    });
  },
};
