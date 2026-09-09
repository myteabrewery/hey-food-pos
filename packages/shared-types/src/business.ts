import type { ISODateString } from "./common";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface Business {
  id: string;
  name: string;
  createdAt: ISODateString;
}
