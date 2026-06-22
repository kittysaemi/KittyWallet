import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { ReceiptTransactionTextParser } from "./application/receipt-transaction-text-parser";
import { TextParsingService } from "./application/text-parsing.service";
import { TextParsingController } from "./presentation/text-parsing.controller";

@Module({ imports: [PrismaModule], controllers: [TextParsingController], providers: [ReceiptTransactionTextParser, TextParsingService], exports: [TextParsingService] })
export class TextParsingModule {}
