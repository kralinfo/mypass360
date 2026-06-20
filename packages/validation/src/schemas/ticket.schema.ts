import { z } from 'zod'

export const validateTicketSchema = z.object({
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
})

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>
