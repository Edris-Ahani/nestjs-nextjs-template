import { DomainFailure } from "../../shared/domain-failure.js";
export interface CatalogItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: Date;
}
export class InvalidCatalogItem extends DomainFailure {
  constructor() { super("invalid_input"); }
}
export class DuplicateCatalogSlug extends DomainFailure {
  constructor() { super("conflict"); }
}
export function createCatalogItem(item: CatalogItem): CatalogItem {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || item.slug.length > 80
    || !item.name.trim() || item.name.length > 120 || item.description.length > 1000
    || !Number.isFinite(item.createdAt.getTime())) throw new InvalidCatalogItem();
  return Object.freeze({ ...item, createdAt: new Date(item.createdAt) });
}
