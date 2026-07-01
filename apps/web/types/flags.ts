export type FlagStatus = "draft" | "active" | "deprecated" | "archived";

export type FailMode = "fail_closed" | "fail_open";

export type Flag = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "release";
  status: FlagStatus;
  default_value: boolean;
  fail_mode: FailMode;
  created_at: string;
  updated_at: string;
};

export type CreateFlagInput = {
  key: string;
  name: string;
  description: string;
  type: "release";
  default_value: boolean;
  fail_mode: FailMode;
};

export type UpdateFlagPatch = {
  name?: string;
  description?: string;
  default_value?: boolean;
  fail_mode?: FailMode;
  status?: FlagStatus;
};

export const NEXT_FLAG_STATUS: Record<FlagStatus, FlagStatus | null> = {
  draft: "active",
  active: "deprecated",
  deprecated: "archived",
  archived: null,
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
