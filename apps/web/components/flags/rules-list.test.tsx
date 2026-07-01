import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RulesList } from "./rules-list";
import { stagingEnvironmentRule } from "./rules-test-fixtures";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
  deleteRule: vi.fn(),
}));

import { deleteRule } from "@/lib/api";

const mockedDeleteRule = vi.mocked(deleteRule);

describe("RulesList", () => {
  beforeEach(() => {
    mockedDeleteRule.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("CA-08.1 lists rule with type, parameter, value and priority", () => {
    render(
      <RulesList
        flagId="flag-checkout-v2"
        rules={[stagingEnvironmentRule]}
      />,
    );

    expect(screen.getByText("environment")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows empty state when there are no rules", () => {
    render(<RulesList flagId="flag-checkout-v2" rules={[]} />);

    expect(screen.getByText("Sin reglas")).toBeInTheDocument();
  });

  it("CA-08.7 calls deleteRule only after confirmation", async () => {
    mockedDeleteRule.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(
      <RulesList
        flagId="flag-checkout-v2"
        rules={[stagingEnvironmentRule]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(mockedDeleteRule).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockedDeleteRule).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(mockedDeleteRule).toHaveBeenCalledWith(
      "flag-checkout-v2",
      stagingEnvironmentRule.id,
    );
  });
});
