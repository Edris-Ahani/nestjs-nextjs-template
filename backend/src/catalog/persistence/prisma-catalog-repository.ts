import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma-service.js";
import { DuplicateCatalogSlug, type CatalogItem } from "../domain/catalog-item.js";
import type { CatalogRepository } from "../application/catalog-repository.js";
@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async list(page: number, size: number) {
    const client = this.database.client;
    const [items, totalElements] = await client.$transaction([
      client.catalogItem.findMany({ skip: page * size, take: size, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      client.catalogItem.count(),
    ], { isolationLevel: "RepeatableRead" });
    return { items, totalElements, page, size, totalPages: Math.ceil(totalElements / size) };
  }
  async create(item: CatalogItem): Promise<CatalogItem> {
    try { return await this.database.client.catalogItem.create({ data: { ...item } }); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new DuplicateCatalogSlug();
      }
      throw error;
    }
  }
}
