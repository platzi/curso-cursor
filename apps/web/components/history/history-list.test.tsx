import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryList } from "./history-list";
import { updateDefaultValueEntry } from "./test-fixtures";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock("@/lib/api", () => ({
  getAuditLog: vi.fn(),
}));

import { getAuditLog } from "@/lib/api";

const mockedGetAuditLog = vi.mocked(getAuditLog);

describe("HistoryList", () => {
  beforeEach(() => {
    mockedGetAuditLog.mockReset();
    mockReplace.mockReset();
  });

  it("CA-11.3 calls getAuditLog with flag key when filtering by flag", async () => {
    mockedGetAuditLog.mockResolvedValueOnce([updateDefaultValueEntry]);

    const user = userEvent.setup();
    render(
      <HistoryList
        initialEntries={[updateDefaultValueEntry]}
        flagKeys={["checkout_v2", "draft_feature"]}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Filtrar por flag"),
      "checkout_v2",
    );

    await waitFor(() => {
      expect(mockedGetAuditLog).toHaveBeenCalledWith("checkout_v2");
    });

    expect(mockReplace).toHaveBeenCalledWith("/history?flag=checkout_v2");
    expect(screen.getByText("default_value")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("CA-11.5 shows empty message when getAuditLog returns no entries", async () => {
    mockedGetAuditLog.mockResolvedValueOnce([]);

    render(
      <HistoryList initialEntries={[]} flagKeys={["checkout_v2"]} />,
    );

    expect(
      screen.getByText("Sin entradas en el historial."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("CA-11.5 shows flag-specific empty message when filter has no results", async () => {
    mockedGetAuditLog.mockResolvedValueOnce([]);

    const user = userEvent.setup();
    render(
      <HistoryList
        initialEntries={[updateDefaultValueEntry]}
        flagKeys={["checkout_v2"]}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Filtrar por flag"),
      "checkout_v2",
    );

    await waitFor(() => {
      expect(
        screen.getByText('Sin entradas para la flag "checkout_v2".'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("CA-11.6 shows error message and retry button when getAuditLog rejects", async () => {
    mockedGetAuditLog.mockRejectedValueOnce(new Error("network error"));

    const user = userEvent.setup();
    render(
      <HistoryList
        initialEntries={[updateDefaultValueEntry]}
        flagKeys={["checkout_v2"]}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Filtrar por flag"),
      "checkout_v2",
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "No se pudo cargar el historial de auditoría. Inténtalo de nuevo.",
        ),
      ).toBeInTheDocument();
    });

    mockedGetAuditLog.mockResolvedValueOnce([updateDefaultValueEntry]);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("default_value")).toBeInTheDocument();
    });
  });
});
