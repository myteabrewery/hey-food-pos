import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { assertNoTempStandInsInProduction, getWebOrigin, logTempStandInWarnings } from "./common/env";

async function bootstrap() {
  // Before anything listens: a production process must not carry the
  // temporary payment stub / shared-key POS auth (see common/env.ts).
  assertNoTempStandInsInProduction();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable("x-powered-by");
  app.useGlobalFilters(new ApiExceptionFilter());

  // Scoped CORS allow-list: exactly the guest web checkout's origin, no
  // wildcard. Only the methods/headers that app needs.
  app.enableCors({
    origin: [getWebOrigin()],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    maxAge: 600,
  });

  logTempStandInWarnings(new Logger("Bootstrap"));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
