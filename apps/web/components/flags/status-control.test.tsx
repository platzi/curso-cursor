import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusControl } from "./status-control";
import { checkoutV2Flag, deprecatedFlag, draftFlag } from "./test-fixtures";

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

describe("StatusControl", () => {
  beforeEach(() => {
    mockedUpdateFlag.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("CA-07.7 advances draft to active via updateFlag", async () => {
    mockedUpdateFlag.mockResolvedValueOnce({
      ...draftFlag,
      status: "active",
    });

    const user = userEvent.setup();
    render(<StatusControl flagKey="draft_feature" status="draft" />);

    await user.click(
      screen.getByRole("button", { name: "Avanzar a active" }),
    );

    await waitFor(() => {
      expect(mockedUpdateFlag).toHaveBeenCalledWith("draft_feature", {
        status: "active",
      });
    });
  });

  it("CA-07.8 requires confirmation before archiving", async () => {
    mockedUpdateFlag.mockResolvedValueOnce({
      ...deprecatedFlag,
      status: "archived",
    });

    const user = userEvent.setup();
    render(<StatusControl flagKey="legacy_checkout" status="deprecated" />);

    await user.click(
      screen.getByRole("button", { name: "Avanzar a archived" }),
    );

    expect(mockedUpdateFlag).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", {
        name: /¿Archivar esta flag/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockedUpdateFlag).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Avanzar a archived" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar archivado" }),
    );

    await waitFor(() => {
      expect(mockedUpdateFlag).toHaveBeenCalledWith("legacy_checkout", {
        status: "archived",
      });
    });
  });
});
