/** Entrega um arquivo ao navegador (mesma origem): o atributo `download` define o nome salvo. */
export function saveFile(url: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
