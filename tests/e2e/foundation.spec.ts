import { expect, test } from "@playwright/test";

test("shows an honest foundation status", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Betriebsoberfläche" }),
  ).toBeVisible();
  await expect(
    page.getByText("Die Betriebsdaten sind noch nicht angebunden."),
  ).toBeVisible();
});

test("unconfigured authentication stays closed without redirecting to a provider", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Anmelden" })).toHaveAttribute(
    "href",
    "/auth/login?returnTo=/operations",
  );
  for (const path of ["/auth/login", "/auth/callback", "/operations"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(503);
    expect(await response.text()).toContain(
      "Anmeldung noch nicht eingerichtet",
    );
  }
});
