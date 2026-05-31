export class SignupCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly passwordConfirm: string,
    public readonly nickname: string,
  ) {}
}
