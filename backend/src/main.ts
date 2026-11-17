import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createServer } from "node:http";
import { collectDefaultMetrics, Registry } from "prom-client";
import { AppModule } from "./app-module.js";
import { configureApp } from "./configure-app.js";
import { CONFIGURATION, type Configuration } from "./platform/config/runtime-config.js";
async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule, { bodyParser: false, logger: false, abortOnError: false }));
  const config = app.get<Configuration>(CONFIGURATION);
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "platform_" });
  const management = createServer((_request, response) => {
    if (_request.url !== "/metrics" && _request.url !== "/actuator/prometheus") {
      response.writeHead(404).end(); return;
    }
    void registry.metrics().then(metrics => response.writeHead(200, { "Content-Type": registry.contentType }).end(metrics))
      .catch(() => response.writeHead(503).end());
  });
  const server = app.getHttpServer();
  server.headersTimeout = 10000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  server.on("close", () => { if (management.listening) management.close(); });
  try {
    await new Promise<void>((resolve, reject) => management.once("error", reject).listen(config.MANAGEMENT_PORT, config.MANAGEMENT_HOST, resolve));
    await app.listen(config.PORT, config.API_HOST);
  } catch (error) {
    if (management.listening) management.close();
    await app.close();
    throw error;
  }
  console.log(JSON.stringify({ event: "application_started", port: config.PORT }));
}
void bootstrap().catch(() => {
  console.error(JSON.stringify({ event: "startup_failed" }));
  process.exitCode = 1;
});
