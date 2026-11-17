# ADR: One modular NestJS backend

Status: Accepted

## Context

The template needs maintainable feature development, straightforward transactions, and a deployment model comparable to the Spring Boot sibling without distributing a small application across services.

## Decision

Use one NestJS application organized by feature. Keep domain/application code framework-free, connect feature repository ports through Nest module factories, and enforce dependency direction with maintained static architecture checks and negative fixtures. Shared infrastructure must not depend on business features.

## Consequences

Features can be developed and tested behind small interfaces; deployment remains simple. Runtime composition still requires review. Extract a service only when a demonstrated operational/team ownership need outweighs distributed-system cost.
