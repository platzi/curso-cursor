import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditFlagForm } from "./edit-flag-form";
import { checkoutV2Flag } from "./test-fixtures";

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
  updateFlag: vi.fn(),
}));

import { updateFlag } from "@/lib/api";

const mockedUpdateFlag = vi.mocked(updateFlag);

describe("EditFlagForm", () => {
  beforeEach(() => {
    mockedUpdateFlag.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("CA-07.5 calls updateFlag with default_value patch when toggled", async () => {
    mockedUpdateFlag.mockResolvedValueOnce({
      ...checkoutV2Flag,
      default_value: true,
    });

    const user = userEvent.setup();
    render(<EditFlagForm flag={checkoutV2Flag} />);

    await user.click(screen.getByLabelText("default_value"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockedUpdateFlag).toHaveBeenCalledWith("checkout_v2", {
        default_value: true,
      });
    });
  });

  it("CA-07.6 disables key and type fields", () => {
    render(<EditFlagForm flag={checkoutV2Flag} />);

    expect(screen.getByLabelText("key")).toBeDisabled();
    expect(screen.getByLabelText("type")).toBeDisabled();
  });
});
