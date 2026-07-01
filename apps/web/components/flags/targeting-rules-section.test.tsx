import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TargetingRulesSection } from "./targeting-rules-section";
import {
  percentageRule,
  stagingEnvironmentRule,
} from "./rules-test-fixtures";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const routerMock = { push: pushMock, refresh: refreshMock };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
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
  getRules: vi.fn(),
  createRule: vi.fn(),
  deleteRule: vi.fn(),
}));

import { ApiError, createRule, getRules } from "@/lib/api";

const mockedGetRules = vi.mocked(getRules);
const mockedCreateRule = vi.mocked(createRule);
const FLAG_ID = "flag-checkout-v2";

describe("TargetingRulesSection", () => {
  beforeEach(() => {
    mockedGetRules.mockReset();
    mockedCreateRule.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
    mockedGetRules.mockResolvedValue([]);
  });

  it("CA-08.8 refetches rules after successful create", async () => {
    mockedGetRules.mockResolvedValue([]);
    mockedCreateRule.mockResolvedValueOnce(stagingEnvironmentRule);

    const user = userEvent.setup();
    render(<TargetingRulesSection flagId={FLAG_ID} />);

    await waitFor(() => {
      expect(screen.getByText("Sin reglas")).toBeInTheDocument();
    });

    const callsBeforeCreate = mockedGetRules.mock.calls.length;
    mockedGetRules.mockResolvedValueOnce([stagingEnvironmentRule]);

    await user.selectOptions(screen.getByLabelText("environment"), "staging");
    await user.click(screen.getByRole("button", { name: "Añadir regla" }));

    await waitFor(() => {
      expect(mockedCreateRule).toHaveBeenCalledWith(FLAG_ID, {
        type: "environment",
        environment: "staging",
        value: true,
        priority: 0,
      });
      expect(mockedGetRules.mock.calls.length).toBeGreaterThan(callsBeforeCreate);
    });

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByRole("cell", { name: "staging" }),
    ).toBeInTheDocument();
  });

  it("shows error state when getRules fails", async () => {
    mockedGetRules.mockRejectedValue(new ApiError("Server error", 500));

    render(<TargetingRulesSection flagId={FLAG_ID} />);

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });

  it("lists existing rules after load", async () => {
    mockedGetRules.mockResolvedValue([
      stagingEnvironmentRule,
      percentageRule,
    ]);

    render(<TargetingRulesSection flagId={FLAG_ID} />);

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("cell", { name: "staging" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "50" })).toBeInTheDocument();
  });
});
