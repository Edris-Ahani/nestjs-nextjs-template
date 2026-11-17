import { Module } from "@nestjs/common";
import { CatalogService } from "./application/catalog-service.js";
import { PrismaCatalogRepository } from "./persistence/prisma-catalog-repository.js";
import { CatalogController } from "./web/catalog-controller.js";
@Module({
  controllers: [CatalogController],
  providers: [PrismaCatalogRepository, {
    provide: CatalogService,
    useFactory: (repository: PrismaCatalogRepository) => new CatalogService(repository),
    inject: [PrismaCatalogRepository],
  }],
})
export class CatalogModule {}
