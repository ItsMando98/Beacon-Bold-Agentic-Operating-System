import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("customer portal is separate, accessible and closed without authentication", async ({
  page,
  request,
}) => {
  await page.goto("http://127.0.0.1:13003");
  await expect(page).toHaveTitle("Kundenbereich | ROASWELL");
  await expect(
    page.getByRole("heading", { name: "Dein Kundenbereich" }),
  ).toBeVisible();
  await expect(
    page.getByText("Anmeldung noch nicht eingerichtet.", { exact: false }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const [path, status] of [
    ["/workspace", 503],
    ["/auth/login", 503],
    ["/auth/access-token", 503],
    ["/operations", 404],
  ] as const) {
    const result = await request.get(`http://127.0.0.1:13003${path}`, {
      maxRedirects: 0,
    });
    expect(result.status()).toBe(status);
    expect(result.headers().location).toBeUndefined();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".cache/portal-mobile.png", fullPage: true });
});
