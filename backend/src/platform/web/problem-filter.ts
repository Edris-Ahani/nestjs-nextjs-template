import { Catch, HttpException } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { DomainFailure } from "../../shared/domain-failure.js";

const titles: Record<number, string> = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
  406: "Not Acceptable", 409: "Conflict", 413: "Payload Too Large", 415: "Unsupported Media Type",
  429: "Too Many Requests", 500: "Internal Server Error", 503: "Service Unavailable",
};
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof DomainFailure ? (error.reason === "conflict" ? 409 : 400)
      : error instanceof HttpException ? error.getStatus()
      : typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large" ? 413
      : error instanceof SyntaxError ? 400 : 500;
    const title = titles[status] ?? "Request Failed";
    const requestId = response.getHeader("X-Request-ID");
    if (status >= 500) console.error(JSON.stringify({ event: "request_failed", status, requestId }));
    if (status === 401) response.setHeader("WWW-Authenticate", "Bearer");
    if (status === 403) response.setHeader("WWW-Authenticate", 'Bearer error="insufficient_scope"');
    response.status(status).type("application/problem+json").json({
      type: "about:blank", status, title,
      detail: status === 409 ? "The slug is already in use" : status >= 500 ? "The service could not complete the request" : title,
      instance: request.path, requestId,
    });
  }
}
