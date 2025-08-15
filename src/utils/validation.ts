import * as z from 'zod';

// Valid rating values (0.5 increments from 0.5 to 10)
const validRatings = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 
  5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10
] as const;

/**
 * Review validation schema
 */
export const reviewSchema = z.object({
  rating: z.number().refine(
    (val) => validRatings.includes(val as typeof validRatings[number]),
    {
      message: 'Rating must be in 0.5 increments between 0.5 and 10'
    }
  ),
  review: z.string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be no more than 5000 characters'),
  finished: z.boolean()
});

/**
 * Profile validation schema
 */
export const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string()
    .max(500, 'Bio must be no more than 500 characters')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  location: z.string()
    .max(100, 'Location must be no more than 100 characters')
    .optional()
    .or(z.literal(''))
});

/**
 * Comment validation schema
 */
export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be no more than 1000 characters')
});

// Export types
export type ReviewData = z.infer<typeof reviewSchema>;
export type ProfileData = z.infer<typeof profileSchema>;
export type CommentData = z.infer<typeof commentSchema>;