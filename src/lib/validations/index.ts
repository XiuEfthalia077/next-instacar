import { z } from "zod";

/**
 * Zod validation schemas for Next.js Server Actions and API endpoints.
 * Embodying OWASP fundamentals, input sanitization, and strict typing.
 */

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  subject: z.string().trim().min(2, "Subject is required").max(200),
  customSubject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(5000, "Message exceeds 5,000 characters"),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
export const PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().min(7, "Please provide a valid phone number").max(20),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, PASSWORD_REQUIREMENT_MESSAGE),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const bookingRequestSchema = z.object({
  carId: z.number().int().positive("Invalid vehicle selection"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
  pickupTime: z.string().min(1, "Pickup time is required"),
  returnTime: z.string().min(1, "Return time is required"),
  fulfillmentType: z.enum(["Pickup", "Delivery"]).default("Pickup"),
  deliveryAddress: z.string().trim().max(500).optional().nullable(),
  returnDeliveryAddress: z.string().trim().max(500).optional().nullable(),
});
