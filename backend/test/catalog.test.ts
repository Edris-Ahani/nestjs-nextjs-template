import { describe, expect, it } from "vitest";
import { CatalogService } from "../src/catalog/application/catalog-service.js";
import { createCatalogItem, DuplicateCatalogSlug, InvalidCatalogItem, type CatalogItem } from "../src/catalog/domain/catalog-item.js";
import type { CatalogRepository } from "../src/catalog/application/catalog-repository.js";
class MemoryCatalog implements CatalogRepository {
  readonly items: CatalogItem[] = [];
  async create(item: CatalogItem) {
    if (this.items.some(existing => existing.slug === item.slug)) throw new DuplicateCatalogSlug();
    this.items.push(item); return item;
  }
  async list(page: number, size: number) {
    const items = [...this.items].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id));
    return { items: items.slice(page * size, (page + 1) * size), page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) };
  }
}
describe("catalog domain and application", () => {
  it.each([{ slug: "Invalid Slug", name: "Item", description: "" }, { slug: "valid", name: " ", description: "" }, { slug: "valid", name: "Item", description: "x".repeat(1001) }])("rejects invalid business values", input => {
    expect(() => createCatalogItem({ ...input, id: "test", createdAt: new Date() })).toThrow(InvalidCatalogItem);
  });
  it("creates and retrieves real domain values through a repository port", async () => {
    const service = new CatalogService(new MemoryCatalog());
    const created = await service.create({ slug: "valid-item", name: "Item", description: "" });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.isFrozen(created)).toBe(true);
    expect((await service.list(0, 12)).items).toEqual([created]);
    await expect(service.create({ slug: "valid-item", name: "Duplicate", description: "" })).rejects.toThrow(DuplicateCatalogSlug);
    expect(() => service.list(0, 51)).toThrow(RangeError);
    expect(() => service.list(10001, 12)).toThrow(RangeError);
  });
});
export { MemoryCatalog };
