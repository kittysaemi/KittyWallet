export class ResetPasswordCommand {
  constructor(
    public readonly resetToken: string,
    public readonly newPassword: string,
    public readonly confirmPassword: string,
  ) {}
}
