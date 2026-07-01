import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuleForm } from "./rule-form";

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
  createRule: vi.fn(),
}));

import { createRule } from "@/lib/api";
import {
  companyRule,
  percentageRule,
  stagingEnvironmentRule,
} from "./rules-test-fixtures";

const mockedCreateRule = vi.mocked(createRule);
const FLAG_ID = "flag-checkout-v2";

describe("RuleForm", () => {
  beforeEach(() => {
    mockedCreateRule.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("CA-08.2 creates environment rule with correct payload", async () => {
    mockedCreateRule.mockResolvedValueOnce(stagingEnvironmentRule);

    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    await user.selectOptions(screen.getByLabelText("type"), "environment");
    await user.selectOptions(screen.getByLabelText("environment"), "staging");
    await user.clear(screen.getByLabelText("priority"));
    await user.type(screen.getByLabelText("priority"), "1");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    await waitFor(() => {
      expect(mockedCreateRule).toHaveBeenCalledWith(FLAG_ID, {
        type: "environment",
        environment: "staging",
        value: true,
        priority: 1,
      });
    });
  });

  it("CA-08.3 creates company rule with correct payload", async () => {
    mockedCreateRule.mockResolvedValueOnce(companyRule);

    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    await user.selectOptions(screen.getByLabelText("type"), "company");
    await user.type(screen.getByLabelText("company_id"), "acme-corp");
    await user.clear(screen.getByLabelText("priority"));
    await user.type(screen.getByLabelText("priority"), "2");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    await waitFor(() => {
      expect(mockedCreateRule).toHaveBeenCalledWith(FLAG_ID, {
        type: "company",
        company_id: "acme-corp",
        value: true,
        priority: 2,
      });
    });
  });

  it("CA-08.4 creates percentage rule with correct payload", async () => {
    mockedCreateRule.mockResolvedValueOnce(percentageRule);

    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    await user.selectOptions(screen.getByLabelText("type"), "percentage");
    await user.type(screen.getByLabelText("percentage"), "50");
    await user.clear(screen.getByLabelText("priority"));
    await user.type(screen.getByLabelText("priority"), "3");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    await waitFor(() => {
      expect(mockedCreateRule).toHaveBeenCalledWith(FLAG_ID, {
        type: "percentage",
        percentage: 50,
        value: true,
        priority: 3,
      });
    });
  });

  it("CA-08.5 shows percentage error and does not call createRule for invalid percentage", async () => {
    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    await user.selectOptions(screen.getByLabelText("type"), "percentage");
    await user.type(screen.getByLabelText("percentage"), "150");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    expect(
      await screen.findByText("El porcentaje debe estar entre 0 y 100"),
    ).toBeInTheDocument();
    expect(mockedCreateRule).not.toHaveBeenCalled();
  });

  it("CA-08.6 shows company_id error and does not call createRule when empty", async () => {
    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    await user.selectOptions(screen.getByLabelText("type"), "company");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    expect(
      await screen.findByText("El company_id es obligatorio"),
    ).toBeInTheDocument();
    expect(mockedCreateRule).not.toHaveBeenCalled();
  });

  it("CA-08.9 shows only fields for the selected type", async () => {
    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} />);

    expect(screen.getByLabelText("environment")).toBeInTheDocument();
    expect(screen.queryByLabelText("company_id")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("percentage")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("type"), "company");
    expect(screen.queryByLabelText("environment")).not.toBeInTheDocument();
    expect(screen.getByLabelText("company_id")).toBeInTheDocument();
    expect(screen.queryByLabelText("percentage")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("type"), "percentage");
    expect(screen.queryByLabelText("environment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("company_id")).not.toBeInTheDocument();
    expect(screen.getByLabelText("percentage")).toBeInTheDocument();
  });

  it("CA-08.8 calls onRuleCreated after successful create", async () => {
    mockedCreateRule.mockResolvedValueOnce(stagingEnvironmentRule);
    const onRuleCreated = vi.fn();

    const user = userEvent.setup();
    render(<RuleForm flagId={FLAG_ID} onRuleCreated={onRuleCreated} />);

    await user.selectOptions(screen.getByLabelText("environment"), "staging");
    await user.clear(screen.getByLabelText("priority"));
    await user.type(screen.getByLabelText("priority"), "1");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    await waitFor(() => {
      expect(onRuleCreated).toHaveBeenCalled();
    });
  });
});
