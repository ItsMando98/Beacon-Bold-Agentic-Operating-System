import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("components support keyboard input, submission and reset", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:16006/iframe.html?id=foundation--components&viewMode=story",
  );
  const input = page.getByLabel("Projektname", { exact: true });
  await expect(input).toBeVisible();
  await input.focus();
  await page.keyboard.type("Testprojekt");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Vorschau speichern" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(
    "Vorschau für Testprojekt gespeichert.",
  );
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
});
test("components fit a mobile viewport and load local fonts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "http://127.0.0.1:16006/iframe.html?id=foundation--components&viewMode=story",
  );
  await expect(page.getByLabel("Projektname", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => document.fonts.load('16px "Bricolage Grotesque"'));
  expect(
    await page.evaluate(() =>
      document.fonts.check('16px "Bricolage Grotesque"'),
    ),
  ).toBe(true);
});
