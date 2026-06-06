import { AppException } from "../src/common/exceptions/app.exception";
import { WithdrawUserUseCase } from "../src/modules/users/application/use-cases/withdraw-user.use-case";
import { UserRepository } from "../src/modules/users/infrastructure/user.repository";

describe("WithdrawUserUseCase", () => {
  const userRepository = {
    findById: jest.fn(),
    countPendingSyncTransactions: jest.fn(),
    deleteAllUserData: jest.fn()
  } as unknown as jest.Mocked<UserRepository>;

  const useCase = new WithdrawUserUseCase(userRepository);

  const mockUser = {
    userId: BigInt(1),
    email: "test@example.com",
    password: "hashed",
    nickname: "tester",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("physically deletes all user data and returns null", async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.countPendingSyncTransactions.mockResolvedValue(0);
    userRepository.deleteAllUserData.mockResolvedValue(undefined);

    const result = await useCase.execute(BigInt(1), "탈퇴");

    expect(userRepository.deleteAllUserData).toHaveBeenCalledWith(BigInt(1));
    expect(result).toBeNull();
  });

  it("rejects wrong confirm text with VALIDATION_001", async () => {
    await expect(useCase.execute(BigInt(1), "wrong")).rejects.toMatchObject({
      code: "VALIDATION_001"
    });
    expect(userRepository.deleteAllUserData).not.toHaveBeenCalled();
  });

  it("rejects unknown user with USER_001", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(BigInt(1), "탈퇴")).rejects.toMatchObject({
      code: "USER_001"
    });
    expect(userRepository.deleteAllUserData).not.toHaveBeenCalled();
  });

  it("rejects when pending sync transactions exist with USER_003", async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.countPendingSyncTransactions.mockResolvedValue(3);

    await expect(useCase.execute(BigInt(1), "탈퇴")).rejects.toMatchObject({
      code: "USER_003"
    });
    expect(userRepository.deleteAllUserData).not.toHaveBeenCalled();
  });
});
