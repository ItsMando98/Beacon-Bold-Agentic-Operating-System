/** Response headers for the agency shell. This list never sets a cookie. */
export function agencyShellHeaders(): { key: string; value: string }[] {
  return [
    { key: "Cache-Control", value: "private, no-store" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "same-origin" },
  ];
}
