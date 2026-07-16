import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens'),
  description: z.string().min(10),
  date: z.string().datetime(),
  location: z.string().min(3),
  organizer_id: z.string().uuid(),
  capacity: z.number().int().positive(),
  price: z.number().min(0).default(0),
  status: z.enum(['draft', 'published', 'cancelled', 'finished']).default('draft'),
})

export const updateEventSchema = createEventSchema.partial()

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
