import { expect, test } from "@playwright/test";

test("shows an honest foundation status", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Betriebsoberfläche" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Freigaben, Agentenläufe und Audit werden in Phase 1 angebunden.",
    ),
  ).toBeVisible();
});
