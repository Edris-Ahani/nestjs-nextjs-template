import { randomUUID } from "node:crypto";
import { createCatalogItem } from "../domain/catalog-item.js";
import type { CatalogRepository } from "./catalog-repository.js";
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}
  list(page: number, size: number) {
    if (!Number.isInteger(page) || page < 0 || page > 10000
      || !Number.isInteger(size) || size < 1 || size > 50) throw new RangeError("Invalid pagination");
    return this.repository.list(page, size);
  }
  create(input: { slug: string; name: string; description: string }) {
    const item = createCatalogItem({ ...input, id: randomUUID(), createdAt: new Date() });
    return this.repository.create(item);
  }
}
