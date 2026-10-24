const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_INPUT_BYTES = 5 * 1024 * 1024

/**
 * Avatar: reduz no navegador para um quadrado de `size` px (WebP). O envio fica pequeno e o
 * banco simulado (localStorage) não estoura a cota.
 */
export async function resizeToSquareDataUrl(file: File, size = 256): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Formato não suportado. Use PNG, JPEG ou WebP.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('Imagem muito grande (máximo 5 MB).')
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível processar a imagem.')
  // Recorte central quadrado
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.85)
}
