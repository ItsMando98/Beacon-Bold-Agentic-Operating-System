import { CatalogShellError } from "./errors.js";

/** The only origin allowed to call Anvil's catalog routes. */
export const AGENCY_ORIGIN = "https://agency.beaconandbold.com";

export function assertAgencyOrigin(origin: string): void {
  if (origin !== AGENCY_ORIGIN) {
    throw new CatalogShellError(
      "Catalog API is only called from https://agency.beaconandbold.com",
    );
  }
}

/**
 * Build a same-origin URL. Absolute URLs and other hosts are refused,
 * including any host that is not the agency origin.
 */
export function resolveAgencyUrl(origin: string, path: string): URL {
  assertAgencyOrigin(origin);
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new CatalogShellError(
      "Refusing to call the catalog API on another origin",
    );
  }
  const url = new URL(path, origin);
  if (url.origin !== AGENCY_ORIGIN) {
    throw new CatalogShellError(
      "Refusing to call the catalog API on another origin",
    );
  }
  return url;
}

/**
 * The shell never writes a cookie. If a response asks the browser to store one
 * on the parent registrable domain, the shell rejects that response.
 */
export function assertNoParentBeaconCookie(setCookie: string): void {
  const match = /(?:^|;)\s*domain\s*=\s*("?)([^";]+)\1/i.exec(setCookie);
  if (!match?.[2]) return;
  const host = match[2].trim().replace(/^\./, "").toLowerCase();
  if (host === "beaconandbold.com") {
    throw new CatalogShellError(
      "Refusing to set a cookie on .beaconandbold.com",
    );
  }
}

export function readSetCookies(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}
