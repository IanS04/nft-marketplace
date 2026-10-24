import { z } from 'zod'
import { passwordRule } from './auth'
import { ensNameSchema } from './wallet'

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres.').max(40, 'Máximo de 40 caracteres.'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use apenas letras, números e _'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  ensName: ensNameSchema.nullable(),
  /** "Apelido da carteira" do Figma de perfil: vai para a carteira principal. */
  walletNickname: z.string().trim().min(1, 'Informe o apelido da carteira.').max(24).optional(),
})

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: passwordRule,
})

export const changePasswordFormSchema = changePasswordRequestSchema
  .extend({ confirmNewPassword: z.string().min(1, 'Confirme a nova senha.') })
  .refine((d) => d.newPassword === d.confirmNewPassword, { path: ['confirmNewPassword'], message: 'As senhas não conferem' })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ['newPassword'], message: 'A nova senha deve ser diferente da atual.' })

/** Avatar já reduzido no navegador (256px, webp/png/jpeg em data URL, ~até 300 KB). */
export const avatarRequestSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Formato de imagem não suportado. Use PNG, JPEG ou WebP.')
    .max(400_000, 'Imagem muito grande.'),
})
