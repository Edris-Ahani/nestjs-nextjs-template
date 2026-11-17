import type { CatalogItem } from "../domain/catalog-item.js";
export interface CatalogPage {
  readonly items: readonly CatalogItem[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}
export interface CatalogRepository {
  list(page: number, size: number): Promise<CatalogPage>;
  create(item: CatalogItem): Promise<CatalogItem>;
}
