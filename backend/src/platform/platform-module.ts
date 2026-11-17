import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { CONFIGURATION, loadConfiguration } from "./config/runtime-config.js";
import { PrismaService } from "./database/prisma-service.js";
import { AccessGuard } from "./security/access-guard.js";
import { HealthController } from "./web/health-controller.js";
import { DocsController } from "./web/docs-controller.js";
@Global()
@Module({
  controllers: [HealthController, DocsController],
  providers: [
    { provide: CONFIGURATION, useFactory: () => loadConfiguration(process.env) },
    PrismaService, { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [PrismaService, CONFIGURATION],
})
export class PlatformModule {}
