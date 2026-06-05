import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case';
import { UpdateProfileRequestDto } from './dto/request/update-profile-request.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.getCurrentUserUseCase.execute(BigInt(user.sub));
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileRequestDto) {
    return this.updateProfileUseCase.execute(BigInt(user.sub), dto.nickname);
  }
}
