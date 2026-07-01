import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AuditLogTable } from "./audit-log-table";
import {
  newestUpdateEntry,
  olderUpdateEntry,
  updateDefaultValueEntry,
} from "./test-fixtures";

describe("AuditLogTable", () => {
  it("CA-11.1 renders a row with action, field, old_value and new_value", () => {
    render(<AuditLogTable entries={[updateDefaultValueEntry]} />);

    const row = screen.getByRole("row", { name: /update/i });
    expect(within(row).getByText("update")).toBeInTheDocument();
    expect(within(row).getByText("default_value")).toBeInTheDocument();
    expect(within(row).getByText("false")).toBeInTheDocument();
    expect(within(row).getByText("true")).toBeInTheDocument();
  });

  it("CA-11.2 renders column headers for timestamp, entity, action, field, old and new values", () => {
    render(<AuditLogTable entries={[updateDefaultValueEntry]} />);

    expect(
      screen.getByRole("columnheader", { name: "timestamp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "entidad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "acción" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "campo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "valor anterior" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "valor nuevo" }),
    ).toBeInTheDocument();
  });

  it("CA-11.4 has no edit or delete controls in table rows", () => {
    render(<AuditLogTable entries={[updateDefaultValueEntry]} />);

    expect(
      screen.queryByRole("button", { name: /editar|eliminar|delete|edit/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const bodyRows = screen.getAllByRole("row").slice(1);
    for (const row of bodyRows) {
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
      expect(within(row).queryByRole("textbox")).not.toBeInTheDocument();
    }
  });

  it("CA-11.7 shows newest entries first by timestamp", () => {
    render(
      <AuditLogTable
        entries={[olderUpdateEntry, newestUpdateEntry, updateDefaultValueEntry]}
      />,
    );

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("delete")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("default_value")).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText("name")).toBeInTheDocument();
  });
});
