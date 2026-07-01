export type FlagStatus = "draft" | "active" | "deprecated" | "archived";

export type Flag = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "release";
  status: FlagStatus;
  default_value: boolean;
  fail_mode: "fail_closed" | "fail_open";
  created_at: string;
  updated_at: string;
};

export const FLAG_STATUSES: FlagStatus[] = [
  "draft",
  "active",
  "deprecated",
  "archived",
];

export function isFlagStatus(value: string): value is FlagStatus {
  return FLAG_STATUSES.includes(value as FlagStatus);
}
