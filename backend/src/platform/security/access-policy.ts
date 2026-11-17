import { SetMetadata } from "@nestjs/common";
export const ACCESS_POLICY = Symbol("AccessPolicy");
export type AccessPolicy = { public: true } | { scope: string };
export const Public = () => SetMetadata(ACCESS_POLICY, { public: true } satisfies AccessPolicy);
export const RequireScope = (scope: string) => SetMetadata(ACCESS_POLICY, { scope } satisfies AccessPolicy);
