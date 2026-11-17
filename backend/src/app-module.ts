import { Module } from "@nestjs/common";
import { PlatformModule } from "./platform/platform-module.js";
import { CatalogModule } from "./catalog/catalog-module.js";
@Module({ imports: [PlatformModule, CatalogModule] })
export class AppModule {}
