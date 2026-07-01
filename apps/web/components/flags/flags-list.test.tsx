import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlagsList } from "./flags-list";
import { checkoutV2Flag, draftFlag } from "./test-fixtures";

vi.mock("@/lib/api", () => ({
  getFlags: vi.fn(),
}));

import { getFlags } from "@/lib/api";

const mockedGetFlags = vi.mocked(getFlags);

describe("FlagsList", () => {
  beforeEach(() => {
    mockedGetFlags.mockReset();
  });

  it("CA-06.3 calls getFlags with active when filtering by active status", async () => {
    mockedGetFlags.mockResolvedValueOnce([checkoutV2Flag]);
    mockedGetFlags.mockResolvedValueOnce([checkoutV2Flag]);

    const user = userEvent.setup();
    render(
      <FlagsList initialFlags={[checkoutV2Flag, draftFlag]} initialStatus={undefined} />,
    );

    await user.selectOptions(screen.getByLabelText("Filtrar por status"), "active");

    await waitFor(() => {
      expect(mockedGetFlags).toHaveBeenCalledWith("active");
    });

    expect(screen.getByText("checkout_v2")).toBeInTheDocument();
    expect(screen.queryByText("draft_feature")).not.toBeInTheDocument();
  });

  it("CA-06.4 shows empty message when getFlags returns no flags", async () => {
    mockedGetFlags.mockResolvedValueOnce([]);

    render(<FlagsList initialFlags={[]} initialStatus={undefined} />);

    expect(screen.getByText("No hay flags.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("CA-06.4 shows filter-specific empty message when filter has no results", async () => {
    mockedGetFlags.mockResolvedValueOnce([]);

    const user = userEvent.setup();
    render(<FlagsList initialFlags={[checkoutV2Flag]} initialStatus={undefined} />);

    await user.selectOptions(screen.getByLabelText("Filtrar por status"), "draft");

    await waitFor(() => {
      expect(
        screen.getByText('Ningún resultado para el filtro "draft".'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("CA-06.5 shows error message and retry button when getFlags rejects", async () => {
    mockedGetFlags.mockRejectedValueOnce(new Error("network error"));

    const user = userEvent.setup();
    render(<FlagsList initialFlags={[checkoutV2Flag]} initialStatus={undefined} />);

    await user.selectOptions(screen.getByLabelText("Filtrar por status"), "active");

    await waitFor(() => {
      expect(
        screen.getByText(
          "No se pudieron cargar las feature flags. Inténtalo de nuevo.",
        ),
      ).toBeInTheDocument();
    });

    mockedGetFlags.mockResolvedValueOnce([checkoutV2Flag]);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("checkout_v2")).toBeInTheDocument();
    });
  });
});
