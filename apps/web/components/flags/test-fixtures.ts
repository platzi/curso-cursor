import type { Flag } from "@/types/flags";

export const checkoutV2Flag: Flag = {
  id: "flag-checkout-v2",
  key: "checkout_v2",
  name: "Checkout V2",
  description: "New checkout flow",
  type: "release",
  status: "active",
  default_value: false,
  fail_mode: "fail_closed",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const draftFlag: Flag = {
  ...checkoutV2Flag,
  id: "flag-draft",
  key: "draft_feature",
  name: "Draft Feature",
  status: "draft",
  default_value: true,
};

export const deprecatedFlag: Flag = {
  ...checkoutV2Flag,
  id: "flag-deprecated",
  key: "legacy_checkout",
  name: "Legacy Checkout",
  status: "deprecated",
  default_value: false,
};
