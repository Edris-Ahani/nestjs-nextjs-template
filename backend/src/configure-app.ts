import { NotAcceptableException, UnsupportedMediaTypeException } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { json } from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { ProblemFilter } from "./platform/web/problem-filter.js";
export function configureApp(app: INestApplication) {
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Request-ID", randomUUID());
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false }));
  app.use(json({ limit: "64kb", strict: true }));
  app.use((request: Request, _response: Response, next: NextFunction) => {
    if (request.path.replace(/\/+$/, "") === "/api/v1/catalog") {
      if (!request.accepts("application/json")) return next(new NotAcceptableException());
      if (request.method === "POST" && !request.is("application/json")) return next(new UnsupportedMediaTypeException());
    }
    next();
  });
  app.useGlobalFilters(new ProblemFilter());
  app.enableShutdownHooks();
  return app;
}
