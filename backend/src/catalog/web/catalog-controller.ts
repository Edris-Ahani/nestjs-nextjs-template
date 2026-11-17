import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import type { CatalogItem } from "../domain/catalog-item.js";
import { z } from "zod";
import { CatalogService } from "../application/catalog-service.js";
import { Public, RequireScope } from "../../platform/security/access-policy.js";
import { ZodPipe } from "../../platform/web/zod-pipe.js";
export const pageSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(10000)).default(0),
  size: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(12),
});
export const createSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(120).refine(value => value.trim().length > 0),
  description: z.string().max(1000),
});

function response(item: CatalogItem) {
  return { id: item.id, slug: item.slug, name: item.name, description: item.description, createdAt: item.createdAt.toISOString() };
}
@Controller("api/v1/catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly service: CatalogService) {}
  @Public()
  @Get()
  async list(@Query(new ZodPipe(pageSchema)) query: z.output<typeof pageSchema>) {
    const result = await this.service.list(query.page, query.size);
    return { ...result, items: result.items.map(response) };
  }
  @RequireScope("catalog:write")
  @Post()
  async create(@Body(new ZodPipe(createSchema)) body: z.output<typeof createSchema>) {
    return response(await this.service.create(body));
  }
}
