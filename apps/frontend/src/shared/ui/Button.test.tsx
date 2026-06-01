import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("disables the button while loading", () => {
    render(<Button isLoading>Save</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
