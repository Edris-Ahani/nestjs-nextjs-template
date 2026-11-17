import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma-service.js";
import { Public } from "../security/access-policy.js";
@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  @Public()
  @Get("livez")
  live() { return { status: "UP" }; }
  @Public()
  @Get("readyz")
  async ready() {
    if (!await this.database.ready()) throw new ServiceUnavailableException();
    return { status: "UP" };
  }
}
