# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev      # dev server with watch mode (Nest HTTP + gRPC microservice)
npm run build           # nest build -> dist/
npm run start:prod       # run compiled dist/main.js
npm run lint             # oxlint src/ test/
npm run format            # prettier --write src/**/*.ts test/**/*.ts
npm run test              # jest unit tests
npm run test:watch
npm run test:cov
npm run test:e2e          # jest -c test/jest-e2e.json
```

Run a single unit test file: `npm run test -- app.controller.spec.ts` (or pass any jest pattern after `--`).

There is no local `.env`; the gRPC client URL is read from `GRPC_URL` (see below), defaulting to `127.0.0.1:5000`.

## Architecture

This is a single NestJS app that runs **two servers in the same process**:

1. A gRPC microservice (`ProductoService`, defined in [src/productos.proto](src/productos.proto)) attached via `app.connectMicroservice` in [src/main.ts](src/main.ts), listening on `0.0.0.0:5000`. [src/app.controller.ts](src/app.controller.ts) implements the gRPC handlers directly with `@GrpcMethod('ProductoService', '<rpc>')` — there is no service layer, data is an in-memory array of productos.
2. An HTTP REST API (Swagger at `/docs`) that does **not** talk to the in-memory array directly — instead [src/productos.rest.controller.ts](src/productos.rest.controller.ts) acts as a gRPC client (`ClientsModule.register(...)` in [src/app.module.ts](src/app.module.ts), package name `PRODUCTO_PACKAGE`) and forwards each REST call to the gRPC service over localhost, exposing it as JSON. This means the HTTP layer exercises the same gRPC contract an external client would.

Both the server (`AppController`) and the REST-to-gRPC bridge (`ProductosRestController`) load the **same** `.proto` file — keep them in sync manually when adding an RPC: add the message/rpc to [src/productos.proto](src/productos.proto), implement it with `@GrpcMethod` in `AppController`, then add the matching method to the local `ProductoServiceGrpc` interface and a REST endpoint in `ProductosRestController`.

Server-streaming RPCs (`ListarProductos`, `BuscarPorPrecioMaximo`) are implemented as hand-rolled `Observable` subscribers using `setInterval` to emit items one at a time (simulating streaming latency) rather than emitting synchronously — preserve this pattern if extending them. On the REST side, streamed responses are collected into an array via `toArray()` + `lastValueFrom` before being returned as JSON.

gRPC errors are surfaced with `RpcException({ code: status.NOT_FOUND, ... })` from `@grpc/grpc-js` on the server side; the REST bridge translates gRPC status code `5` (`NOT_FOUND`) back into a `NotFoundException` (HTTP 404) — follow this translation convention for any new error codes.

`cliente.cjs` at the repo root is a standalone plain-Node gRPC test client (not part of the Nest app, no build step) useful for manually exercising the gRPC service directly against `localhost:5000` without going through HTTP.

The `Dockerfile` is a two-stage build (`npm ci && npm run build` then `npm ci --omit=dev`) that only ships `dist/` and production deps; the app listens on `PORT` (HTTP) and always `5000` (gRPC) inside the container — both ports need to be exposed/mapped when deploying.
