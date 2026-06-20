import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconRenderer } from "./IconRenderer";

describe("IconRenderer", () => {
  it("uses the provider icon before a snapshot", () => {
    const { container } = render(<IconRenderer providerType="lucide" providerKey="wallet" snapshot={{ snapshot_format: "svg", snapshot_payload: "<svg data-testid=\"snapshot\" />" }} />);
    expect(container.querySelector("svg.lucide-wallet")).not.toBeNull();
    expect(screen.queryByTestId("snapshot")).toBeNull();
  });

  it("uses a safe SVG snapshot when the provider key is missing", () => {
    render(<IconRenderer providerType="lucide" providerKey="removed-icon" snapshot={{ snapshot_format: "svg", snapshot_payload: "<svg data-testid=\"snapshot\" />" }} />);
    expect(screen.getByTestId("snapshot")).toBeInTheDocument();
  });

  it("uses the default fallback when no usable snapshot exists", () => {
    const { container } = render(<IconRenderer providerType="lucide" providerKey="removed-icon" />);
    expect(container.querySelector("svg.lucide-circle")).not.toBeNull();
  });
});
