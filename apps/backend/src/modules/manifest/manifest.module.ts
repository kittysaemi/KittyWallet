import { Module } from "@nestjs/common";
import { ManifestController } from "./manifest.controller";

@Module({
  controllers: [ManifestController]
})
export class ManifestModule {}
