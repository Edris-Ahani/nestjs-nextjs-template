import { Controller, Get, Inject, NotFoundException, Res } from "@nestjs/common";
import type { Response } from "express";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { CONFIGURATION, type Configuration } from "../config/runtime-config.js";
import { Public } from "../security/access-policy.js";
const require = createRequire(import.meta.url);
@Public()
@Controller("docs")
export class DocsController {
  constructor(@Inject(CONFIGURATION) private readonly config: Configuration) {}
  private enabled() { if (!this.config.PLATFORM_API_DOCS_ENABLED) throw new NotFoundException(); }
  @Get()
  index(@Res() response: Response) {
    this.enabled();
    response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'");
    response.sendFile(fileURLToPath(new URL("../../assets/api-reference/index.html", import.meta.url)));
  }
  @Get("openapi.yaml")
  contract(@Res() response: Response) {
    this.enabled();
    response.type("application/yaml").sendFile(fileURLToPath(new URL("../../assets/openapi.yaml", import.meta.url)));
  }
  @Get("config.js")
  configuration(@Res() response: Response) {
    this.enabled();
    response.type("application/javascript").sendFile(fileURLToPath(new URL("../../assets/api-reference/config.js", import.meta.url)));
  }
  @Get("scalar.js")
  scalar(@Res() response: Response) {
    this.enabled();
    response.type("application/javascript").sendFile(path.join(path.dirname(require.resolve("@scalar/api-reference")), "browser/standalone.js"));
  }
}
