export class CatalogShellError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogShellError";
  }
}
