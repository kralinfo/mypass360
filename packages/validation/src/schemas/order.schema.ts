import { z } from 'zod'

const orderItemSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
})

export const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1).max(10),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
