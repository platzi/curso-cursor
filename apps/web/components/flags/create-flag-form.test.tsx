import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateFlagForm } from "./create-flag-form";
import { ApiError } from "@/lib/api";

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
  createFlag: vi.fn(),
}));

import { createFlag } from "@/lib/api";

const mockedCreateFlag = vi.mocked(createFlag);

describe("CreateFlagForm", () => {
  beforeEach(() => {
    mockedCreateFlag.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("CA-07.1 calls createFlag with exact body on valid submit", async () => {
    mockedCreateFlag.mockResolvedValueOnce({
      id: "new-flag",
      key: "checkout_v2",
      name: "Checkout V2",
      description: "New checkout",
      type: "release",
      status: "draft",
      default_value: false,
      fail_mode: "fail_closed",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    const user = userEvent.setup();
    render(<CreateFlagForm />);

    await user.type(screen.getByLabelText("key"), "checkout_v2");
    await user.type(screen.getByLabelText("name"), "Checkout V2");
    await user.type(screen.getByLabelText("description"), "New checkout");
    await user.click(screen.getByRole("button", { name: "Crear flag" }));

    await waitFor(() => {
      expect(mockedCreateFlag).toHaveBeenCalledWith({
        key: "checkout_v2",
        name: "Checkout V2",
        description: "New checkout",
        type: "release",
        default_value: false,
        fail_mode: "fail_closed",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/flags/checkout_v2");
  });

  it("CA-07.2 shows key error and does not call createFlag when key is empty", async () => {
    const user = userEvent.setup();
    render(<CreateFlagForm />);

    await user.type(screen.getByLabelText("name"), "Checkout V2");
    await user.click(screen.getByRole("button", { name: "Crear flag" }));

    expect(await screen.findByText("La key es obligatoria")).toBeInTheDocument();
    expect(mockedCreateFlag).not.toHaveBeenCalled();
  });

  it("CA-07.3 shows format error and does not call createFlag for invalid key", async () => {
    const user = userEvent.setup();
    render(<CreateFlagForm />);

    await user.type(screen.getByLabelText("key"), "Checkout V2!");
    await user.type(screen.getByLabelText("name"), "Checkout V2");
    await user.click(screen.getByRole("button", { name: "Crear flag" }));

    expect(
      await screen.findByText(
        "La key solo puede contener letras minúsculas, números y guiones bajos",
      ),
    ).toBeInTheDocument();
    expect(mockedCreateFlag).not.toHaveBeenCalled();
  });

  it("CA-07.4 shows duplicate key error on 409 and does not redirect", async () => {
    mockedCreateFlag.mockRejectedValueOnce(
      new ApiError("Flag key already exists", 409),
    );

    const user = userEvent.setup();
    render(<CreateFlagForm />);

    await user.type(screen.getByLabelText("key"), "checkout_v2");
    await user.type(screen.getByLabelText("name"), "Checkout V2");
    await user.click(screen.getByRole("button", { name: "Crear flag" }));

    expect(
      await screen.findByText("Esta key ya existe (duplicada)"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
