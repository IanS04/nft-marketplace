/**
 * Entrega um arquivo ao navegador com o nome escolhido.
 * Baixa como blob antes: se o servidor mandar `Content-Disposition` com outro nome (a Vercel manda
 * para arquivos estáticos), o navegador ignoraria o atributo `download` de um link direto.
 */
export async function saveFile(url: string, fileName: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Falha ao baixar o arquivo (${response.status}).`)
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // Revoga depois do clique ter sido processado.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  }
}
