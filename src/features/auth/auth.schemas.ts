import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const signUpSchema = signInSchema
  .extend({
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
