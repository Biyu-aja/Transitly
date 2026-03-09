import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be at most 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z.enum(['question', 'tip', 'discussion', 'alert']),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
  images: z.array(z.string()).max(5, 'Maximum 5 images allowed').optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationName: z.string().optional(),
});

export const updatePostSchema = createPostSchema.partial();

// Comment schemas
export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1, 'Content is required'),
  parentId: z.string().uuid().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

// Vote schema
export const voteSchema = z.object({
  voteType: z.number().min(-1).max(1), // -1 for downvote, 1 for upvote, 0 to remove vote
});

// User update schema
export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

// Route schema
export const createRouteSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  startLat: z.number(),
  startLng: z.number(),
  endLat: z.number(),
  endLng: z.number(),
  waypoints: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().optional(),
  })).optional(),
  transportModes: z.array(z.string()),
  estimatedTime: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
