import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagsTable } from "./flags-table";
import { checkoutV2Flag } from "./test-fixtures";

describe("FlagsTable", () => {
  it("CA-06.1 renders a row with key, name, status badge and default_value", () => {
    render(<FlagsTable flags={[checkoutV2Flag]} />);

    expect(screen.getByText("checkout_v2")).toBeInTheDocument();
    expect(screen.getByText("Checkout V2")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("CA-06.2 renders column headers for key, name, status and default_value", () => {
    render(<FlagsTable flags={[checkoutV2Flag]} />);

    expect(
      screen.getByRole("columnheader", { name: "key" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "default_value" }),
    ).toBeInTheDocument();
  });

  it("CA-06.6 links each row to /flags/<key>", () => {
    render(<FlagsTable flags={[checkoutV2Flag]} />);

    const link = screen.getByRole("link", { name: "checkout_v2" });
    expect(link).toHaveAttribute("href", "/flags/checkout_v2");
  });
});
