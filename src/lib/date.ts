const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** "24/10/2026, 14:05" */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

/** "24/10/2026" */
export const formatDate = (iso: string) => dateOnly.format(new Date(iso))
