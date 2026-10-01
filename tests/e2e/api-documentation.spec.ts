import { expect, test } from "@playwright/test";

test("the built API renders Scalar using local assets and serves its contract", async ({
  page,
  request,
}) => {
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:13002/")) {
      unexpected.push(route.request().url());
      return route.abort();
    }
    await route.continue();
  });
  await page.goto("http://127.0.0.1:13002/docs");
  await expect(
    page.getByText("ROASWELL contracts", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Create customer", { exact: true }).first(),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
  const document = await request.get("http://127.0.0.1:13002/openapi.json");
  expect(document.status()).toBe(200);
  expect((await document.json()).openapi).toBe("3.1.1");
  const first = await request.post("http://127.0.0.1:13002/customers", {
    headers: { "Idempotency-Key": "browser-key-0001" },
    data: { name: "Invented Browser Customer" },
  });
  expect(first.status()).toBe(201);
  const replay = await request.post("http://127.0.0.1:13002/customers", {
    headers: { "Idempotency-Key": "browser-key-0001" },
    data: { name: "Invented Browser Customer" },
  });
  expect(await replay.json()).toEqual(await first.json());
});
