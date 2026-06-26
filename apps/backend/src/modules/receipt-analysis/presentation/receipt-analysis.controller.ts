import { Body, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReceiptAnalysisService } from "../application/receipt-analysis.service";
import { ReceiptImageRequiredException } from "../application/receipt-image-normalization.error";

@Controller("receipt-analyses")
export class ReceiptAnalysisController {
  constructor(private readonly receiptAnalysisService: ReceiptAnalysisService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image", { limits: { files: 1, fileSize: 25 * 1024 * 1024 } }))
  analyze(@UploadedFile() file?: { buffer: Buffer }, @Body("is_camera") isCamera?: string) {
    if (!file) throw new ReceiptImageRequiredException();
    return this.receiptAnalysisService.analyze(file.buffer, isCamera === "true");
  }
}
