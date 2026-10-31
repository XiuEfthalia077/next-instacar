/**
 * TypeScript mirrors of the canonical schema in
 * car-rental/if0_42471936_car_rental.sql
 *
 * Field names and enum values are intentionally identical to the legacy
 * MySQL tables so every PHP query can be ported 1:1.
 */

export type UserRole = "admin" | "operator" | "staff" | "user";

export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Released"
  | "Completed"
  | "Cancelled"
  | "Maintenance";

export type BookingType = "online" | "manual";

export type FulfillmentType = "Pickup" | "Delivery";

export type CarStatus =
  | "Available"
  | "Active"
  | "Maintenance"
  | "Not Available"
  | "Reserved";

export type Transmission = "Manual" | "Automatic";

export type ScheduleReason =
  | "Maintenance"
  | "Personal Use"
  | "Unavailable"
  | "Other";

export type ReviewStatus = "pending" | "approved" | "rejected" | "replied";

export interface User {
  id: number;
  auth_id: string | null;
  google_id: string | null;
  name: string;
  email: string;
  password: string | null;
  phone: string;
  role: UserRole;
  branch_id: number | null;
  created_at: string;
  reset_token: string | null;
  token_expiry: string | null;
  verification_token: string | null;
  is_verified: boolean;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Car {
  id: number;
  user_id: number | null;
  branch_id: number | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  fuel_type: string | null;
  plate_number: string | null;
  image_path: string | null;
  price_24_hours: number | null;
  status: CarStatus;
  transmission: Transmission;
  capacity: number;
  created_at: string;
  operator_24_hours: number;
  ext_price_1_6: number;
  color: string;
  price_10_hours: number;
  operator_10_hours: number;
  price_12_hours: number;
  operator_12_hours: number;
  ext_price_7_10: number;
  ext_price_11_12: number;
  ext_price_13_24: number;
  monthly_amortization?: number;
}

export interface CarSchedule {
  id: number;
  car_id: number;
  created_by: number | null;
  start_date: string;
  end_date: string;
  reason: ScheduleReason;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  user_id: number | null;
  created_by: number | null;
  last_action_by: number | null;
  last_action_at: string | null;
  last_action_type: string | null;
  branch_id: number | null;
  guest_name: string | null;
  phone_number: string | null;
  gmail: string | null;
  primary_id_path: string | null;
  secondary_id_path: string | null;
  car_id: number | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  total_price: number | null;
  status: BookingStatus;
  booking_type: BookingType;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  return_delivery_address: string | null;
  created_at: string;
  discount_price: number;
  down_payment: number;
  extension_price: number;
  extension_hours: number;
  proof_billing_path: string | null;
  proof_payment_path: string | null;
  remarks: string | null;
  delivery_fee: number;
  pickup_fee: number;
}

export interface BookingPayment {
  id: number;
  booking_id: number;
  daily_rent: number;
  carwash: number;
  extension_fee: number;
  delivery_fee: number;
  jer_delivery_fee: number;
  pickup_fee: number;
  jer_pickup_fee: number;
  staff_fees_cleared_at: string | null;
  fuel: number;
  driver_fee: number;
  damage_fee: number;
  agent_fee: number;
  others: number;
  total_gross: number;
  discount_amount: number;
  total_net: number;
  settled_by: number | null;
  settled_at: string | null;
  operator_share: number;
  created_at: string;
  remitted_amount: number;
  remittance_date: string | null;
  owner_balance: number;
  remarks: string | null;
}

export interface BookingPhoto {
  id: number;
  booking_id: number;
  file_name: string;
  uploaded_at: string | null;
}

export interface BookingRemark {
  id: number;
  booking_id: number;
  created_by: number | null;
  remark: string;
  created_at: string | null;
}

export interface Review {
  id: number;
  user_id: number;
  booking_id: number | null;
  rating: number | null;
  review_text: string | null;
  admin_reply: string | null;
  review_title: string | null;
  status: ReviewStatus;
  created_at: string | null;
  updated_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface Expense {
  id: number;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

export interface SiteContent {
  id: number;
  content_key: string;
  content_value: string;
  updated_at: string;
  updated_by: number | null;
}

export interface OperatorRemittance {
  id: number;
  operator_id: number;
  car_id: number;
  booking_id: number | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  recorded_by: number;
  created_at: string;
}

export interface OperatorRemittancePhoto {
  id: number;
  remittance_id: number;
  file_name: string;
  uploaded_at: string;
}

export interface StaffFeeRemittance {
  id: number;
  branch_id: number;
  amount: number;
  payment_date: string;
  notes: string | null;
  recorded_by: number;
  created_at: string;
}

export interface StaffFeeRemittancePhoto {
  id: number;
  remittance_id: number;
  file_name: string;
  uploaded_at: string;
}

/** Session shape mirrored from the PHP `$_SESSION` context. */
export interface AppSession {
  /** Legacy `users.id` */
  userId: number;
  authUserId: string;
  name: string;
  email: string;
  role: UserRole;
  /** The user's own branch (null for admins). */
  branchId: number | null;
  /** The branch the user is currently looking at. Admins may switch. */
  viewBranch: number | "all";
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
}
