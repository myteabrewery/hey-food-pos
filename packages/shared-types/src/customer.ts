import { ISODateString } from "./common";

/** docs/hey-food-developer-spec-v1.md Section 1 */
export interface Customer {
  id: string;
  phone: string;
  name: string;
  createdAt: ISODateString;
  loyaltyPoints: number;
}
