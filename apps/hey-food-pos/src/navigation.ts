export type PosScreen = "queue" | "menu" | "summary";

export interface PosScreenOption {
  key: PosScreen;
  label: string;
}

export const POS_SCREENS: PosScreenOption[] = [
  { key: "queue", label: "Queue" },
  { key: "menu", label: "Menu" },
  { key: "summary", label: "Summary" },
];
