import { z } from 'zod';

// Reusable UUID validator for entity IDs
export const uuidSchema = z.string().uuid('Invalid ID format');

// Password must be at least 8 chars with uppercase, lowercase, and number
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['admin', 'coordinator', 'teacher', 'board_member', 'volunteer']),
});

export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'coordinator', 'teacher', 'board_member', 'volunteer']).optional(),
  is_active: z.boolean().optional(),
}).strict();

export const createDonationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  category: z.enum(['furniture', 'kitchenware', 'kitchen', 'baby', 'linens', 'bedding', 'rugs', 'clothing', 'accessories', 'other', 'electronics', 'toys', 'bathroom', 'household']),
  condition: z.enum(['new', 'like_new', 'gently_used', 'used', 'needs_repair']).optional(),
  status: z.enum(['available', 'reserved', 'claimed', 'pending_pickup']).optional(),
  quantity: z.number().int().positive().optional(),
  donor_name: z.string().max(255).optional(),
  donor_email: z.string().email().optional().or(z.literal('')),
  donated_date: z.string().optional(),
  image_path: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  assignee_id: z.string().uuid().optional(),
  beneficiary_id: z.string().uuid().optional(),
  household_id: z.string().uuid().optional(),
  volunteer_id: z.string().uuid().optional(),
  class_section_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  created_by_id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
  is_archived: z.boolean().optional(),
  completed_at: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const importDonationsSchema = z.object({
  records: z.array(z.object({
    itemName: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
    photos: z.array(z.string()).optional(),
    dateDonated: z.string().optional(),
    donor: z.string().optional(),
    donorEmail: z.string().optional(),
    donorName: z.string().optional(),
    claimedStatus: z.string().optional(),
    claimedBy: z.string().optional(),
    numberOfClaims: z.number().optional(),
    mostRecentClaimDate: z.string().optional(),
    claimStatuses: z.string().optional(),
    summaryForShopDisplay: z.string().optional(),
    suggestedNextAction: z.string().optional(),
    airtableId: z.string().optional(),
  })),
  migratePhotos: z.boolean().optional(),
});

export const searchParamSchema = z.string()
  .max(200)
  .transform(val => val.replace(/[%_\\]/g, '\\$&')); // Escape SQL wildcards

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ImportDonationsInput = z.infer<typeof importDonationsSchema>;
