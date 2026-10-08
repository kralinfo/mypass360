import { BadRequestException, Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'

export type CustomFieldType = 'text' | 'number' | 'select'

export interface CustomFieldOption {
  id: string
  label: string
  display_order: number
  is_active: boolean
}

export interface CustomField {
  id: string
  event_id: string
  label: string
  field_type: CustomFieldType
  required: boolean
  display_order: number
  is_active: boolean
  options: CustomFieldOption[]
}

export interface CustomFieldInput {
  id?: string
  label: string
  field_type: CustomFieldType
  required?: boolean
  options?: Array<{ id?: string; label: string }>
}

export type CustomAnswers = Record<string, string>

const FIELD_TYPES: CustomFieldType[] = ['text', 'number', 'select']
const MAX_FIELDS = 20
const MAX_OPTIONS = 100
const MAX_TEXT_LENGTH = 200

@Injectable()
export class CustomFieldsService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Campos ativos do evento (usados no checkout e na confirmação de presença). */
  listActive(eventId: string): Promise<CustomField[]> {
    return this.list(eventId, true)
  }

  /** Todos os campos do evento, inclusive desativados (usados na gestão e nas listas). */
  listAll(eventId: string): Promise<CustomField[]> {
    return this.list(eventId, false)
  }

  private async list(eventId: string, onlyActive: boolean): Promise<CustomField[]> {
    const client = this.supabase.getClient()

    let query = client
      .from('event_custom_fields')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true })
    if (onlyActive) query = query.eq('is_active', true)

    const { data: fields, error } = await query
    if (error) throw new Error(error.message)
    if (!fields || fields.length === 0) return []

    const { data: options, error: optionsError } = await client
      .from('event_custom_field_options')
      .select('*')
      .in('field_id', fields.map((f: any) => f.id))
      .order('display_order', { ascending: true })
    if (optionsError) throw new Error(optionsError.message)

    return fields.map((f: any) => ({
      id: f.id,
      event_id: f.event_id,
      label: f.label,
      field_type: f.field_type,
      required: f.required,
      display_order: f.display_order,
      is_active: f.is_active,
      options: (options ?? [])
        .filter((o: any) => o.field_id === f.id && (!onlyActive || o.is_active))
        .map((o: any) => ({
          id: o.id,
          label: o.label,
          display_order: o.display_order,
          is_active: o.is_active,
        })),
    }))
  }

  /**
   * Sincroniza a configuração enviada com o banco.
   * Nada é apagado: campos e opções ausentes são apenas desativados, preservando as respostas já registradas.
   */
  async sync(eventId: string, inputs: CustomFieldInput[]): Promise<CustomField[]> {
    if (!Array.isArray(inputs)) throw new BadRequestException('Lista de campos inválida.')
    if (inputs.length > MAX_FIELDS) throw new BadRequestException(`Máximo de ${MAX_FIELDS} campos por evento.`)

    for (const input of inputs) {
      if (!input.label?.trim()) throw new BadRequestException('Todo campo precisa de um nome.')
      if (!FIELD_TYPES.includes(input.field_type)) {
        throw new BadRequestException(`Tipo de campo inválido em "${input.label}".`)
      }
      if (input.field_type === 'select') {
        const labels = (input.options ?? []).map((o) => o.label?.trim()).filter(Boolean)
        if (labels.length === 0) {
          throw new BadRequestException(`Adicione ao menos uma opção ao campo "${input.label}".`)
        }
        if (labels.length > MAX_OPTIONS) {
          throw new BadRequestException(`Máximo de ${MAX_OPTIONS} opções por campo.`)
        }
        if (new Set(labels.map((l) => l!.toLowerCase())).size !== labels.length) {
          throw new BadRequestException(`O campo "${input.label}" possui opções repetidas.`)
        }
      }
    }

    const client = this.supabase.getClient()
    const existing = await this.listAll(eventId)
    const existingById = new Map(existing.map((f) => [f.id, f]))
    const keptIds = new Set<string>()

    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index]
      const label = input.label.trim()
      const current = input.id ? existingById.get(input.id) : undefined
      if (input.id && !current) throw new BadRequestException('Campo informado não pertence a este evento.')

      let fieldId: string
      if (current) {
        if (current.field_type !== input.field_type) {
          const { count } = await client
            .from('ticket_custom_field_values')
            .select('id', { count: 'exact', head: true })
            .eq('field_id', current.id)
          if ((count ?? 0) > 0) {
            throw new BadRequestException(
              `O tipo do campo "${current.label}" não pode ser alterado porque já possui respostas.`
            )
          }
        }

        const { error } = await client
          .from('event_custom_fields')
          .update({
            label,
            field_type: input.field_type,
            required: input.required === true,
            display_order: index,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id)
        if (error) throw new Error(error.message)
        fieldId = current.id
      } else {
        const { data, error } = await client
          .from('event_custom_fields')
          .insert({
            event_id: eventId,
            label,
            field_type: input.field_type,
            required: input.required === true,
            display_order: index,
          })
          .select('id')
          .single()
        if (error || !data) throw new Error(error?.message ?? 'Erro ao criar campo.')
        fieldId = data.id
      }

      keptIds.add(fieldId)
      await this.syncOptions(fieldId, input.field_type === 'select' ? input.options ?? [] : [], current?.options ?? [])
    }

    const removedIds = existing.filter((f) => !keptIds.has(f.id) && f.is_active).map((f) => f.id)
    if (removedIds.length > 0) {
      const { error } = await client
        .from('event_custom_fields')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', removedIds)
      if (error) throw new Error(error.message)
    }

    return this.listAll(eventId)
  }

  private async syncOptions(
    fieldId: string,
    inputs: Array<{ id?: string; label: string }>,
    existing: CustomFieldOption[]
  ) {
    const client = this.supabase.getClient()
    const existingById = new Map(existing.map((o) => [o.id, o]))
    const keptIds = new Set<string>()

    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index]
      const label = input.label.trim()
      if (!label) continue

      const current = input.id ? existingById.get(input.id) : undefined
      if (current) {
        const { error } = await client
          .from('event_custom_field_options')
          .update({ label, display_order: index, is_active: true })
          .eq('id', current.id)
        if (error) throw new Error(error.message)
        keptIds.add(current.id)
      } else {
        const { error } = await client
          .from('event_custom_field_options')
          .insert({ field_id: fieldId, label, display_order: index })
        if (error) throw new Error(error.message)
      }
    }

    const removedIds = existing.filter((o) => !keptIds.has(o.id) && o.is_active).map((o) => o.id)
    if (removedIds.length > 0) {
      const { error } = await client
        .from('event_custom_field_options')
        .update({ is_active: false })
        .in('id', removedIds)
      if (error) throw new Error(error.message)
    }
  }

  /**
   * Valida no servidor as respostas de cada participante (obrigatoriedade, tipo e opções válidas).
   * Retorna uma lista normalizada com exatamente `count` entradas.
   */
  async validateAnswers(eventId: string, answers: CustomAnswers[] | undefined, count: number): Promise<CustomAnswers[]> {
    const fields = await this.listActive(eventId)
    const result: CustomAnswers[] = []

    for (let i = 0; i < count; i++) {
      const raw = answers?.[i] ?? {}
      const normalized: CustomAnswers = {}
      const prefix = count > 1 ? `Ingresso #${i + 1}: ` : ''

      for (const field of fields) {
        const value = String(raw[field.id] ?? '').trim()

        if (!value) {
          if (field.required) throw new BadRequestException(`${prefix}Preencha o campo "${field.label}".`)
          continue
        }

        if (field.field_type === 'number' && !Number.isFinite(Number(value))) {
          throw new BadRequestException(`${prefix}O campo "${field.label}" deve ser um número.`)
        }
        if (field.field_type === 'select' && !field.options.some((o) => o.label === value)) {
          throw new BadRequestException(`${prefix}Opção inválida para o campo "${field.label}".`)
        }
        if (field.field_type === 'text' && value.length > MAX_TEXT_LENGTH) {
          throw new BadRequestException(`${prefix}O campo "${field.label}" excede ${MAX_TEXT_LENGTH} caracteres.`)
        }

        normalized[field.id] = value
      }

      result.push(normalized)
    }

    return result
  }

  /** Grava as respostas já validadas, vinculadas a cada ticket. */
  async saveForTickets(entries: Array<{ ticketId: string; answers: CustomAnswers }>) {
    const rows = entries.flatMap(({ ticketId, answers }) =>
      Object.entries(answers).map(([fieldId, value]) => ({ ticket_id: ticketId, field_id: fieldId, value }))
    )
    if (rows.length === 0) return

    const { error } = await this.supabase.getClient().from('ticket_custom_field_values').insert(rows)
    if (error) throw new Error(`Falha ao salvar respostas dos participantes: ${error.message}`)
  }

  /** Respostas por ticket: { ticketId: { fieldId: valor } } */
  async getAnswersByTicket(ticketIds: string[]): Promise<Map<string, CustomAnswers>> {
    const map = new Map<string, CustomAnswers>()
    if (ticketIds.length === 0) return map

    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_custom_field_values')
      .select('ticket_id, field_id, value')
      .in('ticket_id', ticketIds)
    if (error) throw new Error(error.message)

    for (const row of data ?? []) {
      const current = map.get((row as any).ticket_id) ?? {}
      current[(row as any).field_id] = (row as any).value
      map.set((row as any).ticket_id, current)
    }
    return map
  }
}
