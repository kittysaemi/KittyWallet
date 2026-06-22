import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { TextParsingService } from "../application/text-parsing.service";
import { TextParseRequestDto } from "./dto/text-parse-request.dto";
import { TextParseTrainingSampleRequestDto } from "./dto/text-parse-training-sample-request.dto";

@Controller("text-parses")
export class TextParsingController {
  constructor(private readonly service: TextParsingService) {}

  @Post()
  parse(@Body() dto: TextParseRequestDto) {
    return this.service.parse(dto.profile, dto.text);
  }

  @Post("training-samples")
  @HttpCode(204)
  async saveTrainingSample(@CurrentUser() user: JwtPayload, @Body() dto: TextParseTrainingSampleRequestDto) {
    await this.service.saveTrainingSample({ userId: BigInt(user.sub), profile: dto.profile, sourceType: dto.source_type, sourceText: dto.source_text, finalDraft: dto.final_draft, parserVersion: dto.parser_version });
  }
}
