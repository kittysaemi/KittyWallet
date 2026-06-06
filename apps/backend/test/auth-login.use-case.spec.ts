import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AppException } from "../src/common/exceptions/app.exception";
import { LoginUseCase } from "../src/modules/auth/application/use-cases/login.use-case";
import { AuthRepository } from "../src/modules/auth/infrastructure/repositories/auth.repository";

describe("LoginUseCase", () => {
  const authRepository = {
    findUserByEmail: jest.fn(),
    createRefreshToken: jest.fn()
  } as unknown as jest.Mocked<AuthRepository>;

  const jwtService = {
    sign: jest.fn()
  } as unknown as jest.Mocked<JwtService>;

  const configService = {
    get: jest.fn()
  } as unknown as jest.Mocked<ConfigService>;

  const useCase = new LoginUseCase(authRepository, jwtService, configService);

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.sign.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");
    configService.get.mockReturnValue("jwt-secret");
    authRepository.createRefreshToken.mockResolvedValue({
      refreshTokenId: BigInt(1),
      userId: BigInt(1),
      tokenHash: "hash",
      userAgent: null,
      revokedYn: false,
      expiresAt: new Date(),
      createdAt: new Date()
    });
  });

  it("issues access and refresh tokens for a valid user", async () => {
    const password = await bcrypt.hash("password", 4);
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: "test@example.com",
      password,
      nickname: "tester",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      useCase.execute({
        email: "test@example.com",
        password: "password",
        userAgent: "vitest"
      })
    ).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { userId: 1, nickname: "tester" }
    });

    expect(authRepository.createRefreshToken).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown user with AUTH_002", async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: "none@example.com", password: "password" })
    ).rejects.toMatchObject({ code: "AUTH_002" });
    expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects wrong password with AUTH_002", async () => {
    const password = await bcrypt.hash("correct-password", 4);
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: "test@example.com",
      password,
      nickname: "tester",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await expect(
      useCase.execute({ email: "test@example.com", password: "wrong-password" })
    ).rejects.toMatchObject({ code: "AUTH_002" });
    expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
  });
});
