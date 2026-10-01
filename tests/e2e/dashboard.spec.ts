import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("dashboard navigation, sidebar and keyboard search work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Betriebsoberfläche" }),
  ).toBeVisible();
  await expect(
    page.getByText("Keine Live-Daten", { exact: true }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Hauptnavigation" });
  await navigation.getByRole("link", { name: "Agenten", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/agents$/);
  await expect(
    navigation.getByRole("link", { name: "Agenten", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Agenten", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Seitenleiste einklappen" }).click();
  await expect(
    page.getByRole("button", { name: "Seitenleiste ausklappen" }),
  ).toHaveAttribute("aria-expanded", "false");
  await navigation
    .getByRole("link", { name: "Übersicht", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Seitenleiste ausklappen" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Seiten suchen" });
  await expect(
    search.getByRole("textbox", { name: "Suchbegriff" }),
  ).toBeFocused();
  await search.getByRole("textbox").fill("Freigaben");
  await search.getByRole("link", { name: "Freigaben", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Freigaben", exact: true }),
  ).toBeVisible();
  await expect(search).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await search.getByRole("textbox").fill("unbekannte-seite");
  await expect(search.getByRole("status")).toHaveText(
    "Keine passende Seite gefunden.",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Seiten suchen" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Dunkelmodus aktivieren" }).click();
  await navigation.getByRole("link", { name: "Audit", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hellmodus aktivieren" }),
  ).toBeVisible();
});

test("dashboard has accessible light and dark modes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: ".cache/frontend-preview/dashboard-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Dunkelmodus aktivieren" }).click();
  await expect(
    page.getByRole("button", { name: "Hellmodus aktivieren" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: ".cache/frontend-preview/dashboard-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Seiten suchen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("mobile navigation closes after selecting a destination and fits the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: ".cache/frontend-preview/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Navigation öffnen" }).click();
  const navigation = page.getByRole("dialog", {
    name: "Navigation",
    exact: true,
  });
  await expect(navigation).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await navigation.getByRole("link", { name: "Audit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Audit", exact: true }),
  ).toBeVisible();
  await expect(navigation).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Zur Übersicht" }).click();
  await expect(
    page.getByRole("heading", { name: "Betriebsoberfläche" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("every preview destination is available and unknown destinations return 404", async ({
  page,
  request,
}) => {
  for (const [path, heading] of [
    ["goals", "Ziele"],
    ["agents", "Agenten"],
    ["runs", "Agentenläufe"],
    ["approvals", "Freigaben"],
    ["audit", "Audit"],
  ]) {
    await page.goto(`/dashboard/${path}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Noch keine Live-Daten" }),
    ).toBeVisible();
  }
  expect((await request.get("/dashboard/not-a-section")).status()).toBe(404);
});
