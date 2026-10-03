import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgencyCatalogShell } from "../app/catalog-shell.js";

/** Server markup of the shell, used to prove seed v1 renders without a browser. */
export function renderAgencyShellMarkup(): string {
  return renderToStaticMarkup(createElement(AgencyCatalogShell));
}
