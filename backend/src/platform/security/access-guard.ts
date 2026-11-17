import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";
import { CONFIGURATION, type Configuration } from "../config/runtime-config.js";
import { ACCESS_POLICY, type AccessPolicy } from "./access-policy.js";

@Injectable()
export class AccessGuard implements CanActivate {
  private readonly keys;
  constructor(@Inject(Reflector) private readonly reflector: Reflector,
    @Inject(CONFIGURATION) private readonly config: Configuration) {
    this.keys = createRemoteJWKSet(new URL(config.OIDC_JWK_SET_URI), {
      timeoutDuration: 3000, cooldownDuration: 30000, cacheMaxAge: 600000,
    });
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AccessPolicy>(ACCESS_POLICY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization && policy && "public" in policy) return true;
    if (!authorization || !/^Bearer [^\s]+$/i.test(authorization)) throw new UnauthorizedException();
    let scopes: Set<string>;
    try {
      const { payload } = await jwtVerify(authorization.slice(7), this.keys, {
        issuer: this.config.OIDC_ISSUER_URI, audience: this.config.OIDC_AUDIENCE,
        algorithms: ["RS256"], requiredClaims: ["exp", "iat", "sub"], clockTolerance: 5,
      });
      scopes = new Set(typeof payload.scope === "string" ? payload.scope.split(" ") : []);
    } catch { throw new UnauthorizedException(); }
    if (!policy || !("public" in policy) && !scopes.has(policy.scope)) throw new ForbiddenException();
    return true;
  }
}
