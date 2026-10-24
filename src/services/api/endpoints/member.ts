import {
  activityListSchema, downloadGrantSchema, downloadListSchema, offerListSchema, supportTicketListSchema,
  supportTicketSchema,
} from '@/schemas/member'
import type { ActivityItem, CreateSupportTicketInput, DownloadGrant, DownloadItem, Offer, SupportTicket } from '@/types'
import { http } from '../http'

/** Seções da conta: atividade, ofertas, arquivos baixados e suporte. */
export const activityApi = {
  async list(signal?: AbortSignal): Promise<ActivityItem[]> {
    const { data } = await http.get('/activity', { signal })
    return activityListSchema.parse(data).items
  },
}

export const offersApi = {
  async list(signal?: AbortSignal): Promise<Offer[]> {
    const { data } = await http.get('/offers', { signal })
    return offerListSchema.parse(data).items
  },
}

export const downloadsApi = {
  async list(signal?: AbortSignal): Promise<DownloadItem[]> {
    const { data } = await http.get('/downloads', { signal })
    return downloadListSchema.parse(data).items
  },
  /** Registra o download no servidor e recebe o endereço do arquivo. */
  async request(id: string): Promise<DownloadGrant> {
    const { data } = await http.post(`/downloads/${encodeURIComponent(id)}`)
    return downloadGrantSchema.parse(data)
  },
}

export const supportApi = {
  async list(signal?: AbortSignal): Promise<SupportTicket[]> {
    const { data } = await http.get('/support/tickets', { signal })
    return supportTicketListSchema.parse(data).items
  },
  async create(input: CreateSupportTicketInput): Promise<SupportTicket> {
    const { data } = await http.post('/support/tickets', input)
    return supportTicketSchema.parse(data)
  },
}
