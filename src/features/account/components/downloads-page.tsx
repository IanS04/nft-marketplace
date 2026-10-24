import { Link } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { announce } from '@/components/feedback/announcer'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateTime } from '@/lib/date'
import { saveFile } from '@/lib/download'
import { errorMessage } from '@/lib/form-errors'
import { toast } from '@/lib/toast'
import type { DownloadItem } from '@/types'
import { useDownloadFile, useDownloads } from '../hooks/use-member'
import { SectionHeader } from './section-header'

/** Artes das edições compradas (pedidos confirmados). Cada download é registrado na API. */
export function DownloadsPage() {
  const downloads = useDownloads()
  const header = <SectionHeader title="Arquivos baixados" description="Baixe a arte em alta resolução dos NFTs que você comprou." />

  if (downloads.isPending) {
    return (
      <>
        {header}
        <div aria-busy="true" aria-label="Carregando arquivos" className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </>
    )
  }
  if (downloads.isError) {
    return (
      <>
        {header}
        <ErrorState title="Não foi possível carregar seus arquivos" error={downloads.error} onRetry={() => void downloads.refetch()} retrying={downloads.isFetching} />
      </>
    )
  }
  if (downloads.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="Nenhum arquivo disponível"
          description="Depois que um pagamento for confirmado, a arte dos NFTs comprados fica disponível aqui."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar o mercado</Link></Button>}
        />
      </>
    )
  }

  return (
    <>
      {header}
      <ul className="space-y-3" aria-label="Arquivos disponíveis" data-testid="downloads-list">
        {downloads.data.map((file) => <li key={file.id}><DownloadRow file={file} /></li>)}
      </ul>
    </>
  )
}

function DownloadRow({ file }: { file: DownloadItem }) {
  const download = useDownloadFile()

  const onDownload = async () => {
    try {
      const grant = await download.mutateAsync(file.id)
      await saveFile(grant.url, grant.fileName)
      announce(`Download de ${file.name} iniciado.`)
    } catch (error) {
      toast.error(`Não foi possível baixar ${file.name}.`, { description: errorMessage(error) })
    }
  }

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-lg bg-card p-3 sm:flex-nowrap">
      <img src={file.imageUrl} alt={file.imageAlt} width={72} height={72} loading="lazy" className="size-[4.5rem] shrink-0 rounded-md object-cover" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <h2 className="truncate font-bold">{file.name} <span className="font-normal text-muted-foreground">· {file.editionLabel}</span></h2>
        <p className="truncate text-micro text-muted-foreground">{file.fileName}</p>
        <p className="text-micro text-muted-foreground">
          Comprado em {formatDate(file.purchasedAt)} ·{' '}
          <span data-testid="download-count">
            {file.downloadCount === 0
              ? 'ainda não baixado'
              : `baixado ${file.downloadCount}× (último em ${formatDateTime(file.lastDownloadedAt ?? file.purchasedAt)})`}
          </span>
        </p>
      </div>
      <Button variant="outline" onClick={() => void onDownload()} disabled={download.isPending} aria-label={`Baixar ${file.name}`}>
        <Download aria-hidden="true" />
        {download.isPending ? 'Preparando…' : 'Baixar'}
      </Button>
    </article>
  )
}
