import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { announce } from '@/components/feedback/announcer'
import { Button } from '@/components/ui/button'
import { EnsField, FieldError, PasswordField, TextField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { applyApiErrors, errorMessage } from '@/lib/form-errors'
import { resizeToSquareDataUrl } from '@/lib/image'
import { isApiError } from '@/services/api/errors'
import { changePasswordFormSchema, updateProfileSchema } from '@/schemas/profile'
import type { User, Wallet } from '@/types'
import { useAvatar, useChangePassword, useProfile, useUpdateProfile, useWallets } from '../hooks/use-account'
import { ensLabelOf } from '../labels'

const formSchema = updateProfileSchema
  .omit({ ensName: true, walletNickname: true })
  .extend({
    ensLabel: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,}(\.[a-z0-9-]+)*$/, 'Informe o nome ENS (sem ".eth").'),
    walletNickname: z.string().trim().max(24, 'Máximo de 24 caracteres.'),
    hasPrimaryWallet: z.boolean(),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmNewPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.hasPrimaryWallet && !data.walletNickname) {
      ctx.addIssue({ code: 'custom', path: ['walletNickname'], message: 'Informe o apelido da carteira.' })
    }
    // Senha: opcional, mas se começou a preencher, valida o grupo inteiro.
    if (!data.currentPassword && !data.newPassword && !data.confirmNewPassword) return
    const result = changePasswordFormSchema.safeParse(data)
    if (!result.success) result.error.issues.forEach((issue) => ctx.addIssue(issue))
  })

type FormValues = z.infer<typeof formSchema>

export function ProfileForm() {
  const profile = useProfile()
  const wallets = useWallets()
  if (!profile.data || wallets.isPending) return <ProfileSkeleton />
  const primary = wallets.data?.find((w) => w.role === 'primary') ?? null
  // key = usuário (não updatedAt): salvar não pode remontar o formulário e apagar erros/estado.
  return <ProfileFormLoaded key={profile.data.id} user={profile.data} primary={primary} />
}

function ProfileFormLoaded({ user, primary }: { user: User; primary: Wallet | null }) {
  const update = useUpdateProfile()
  const changePassword = useChangePassword()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensLabel: ensLabelOf(user.ensName),
      walletNickname: primary?.nickname ?? '',
      hasPrimaryWallet: !!primary,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync({
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        ensName: `${values.ensLabel}.eth`,
        walletNickname: primary ? values.walletNickname : undefined,
      })
      // Os valores salvos viram o novo "padrão" do formulário (mantém a senha digitada até o passo seguinte).
      form.reset({ ...values, displayName: saved.displayName, username: saved.username, email: saved.email }, { keepValues: true })
    } catch (error) {
      applyApiErrors(error, form.setError, ['displayName', 'username', 'email'])
      return
    }
    if (values.newPassword) {
      try {
        await changePassword.mutateAsync(values)
        form.resetField('currentPassword')
        form.resetField('newPassword')
        form.resetField('confirmNewPassword')
        toast.success('Perfil e senha atualizados.')
      } catch (error) {
        applyApiErrors(error, form.setError, ['currentPassword', 'newPassword'])
        toast.error('Os dados foram salvos, mas a senha não foi alterada.')
      }
      return
    }
    toast.success('Perfil atualizado.')
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8" aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-title">Perfil do colecionador</h1>

      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <EnsField error={errors.ensLabel?.message} {...form.register('ensLabel')} />
        <TextField
          label="Apelido da carteira"
          required={!!primary}
          disabled={!primary}
          placeholder={primary ? undefined : 'Cadastre uma carteira principal primeiro'}
          error={errors.walletNickname?.message}
          {...form.register('walletNickname')}
        />
        <AvatarField user={user} />
      </div>

      <fieldset className="max-w-md space-y-4">
        <legend className="mb-3 text-title">Alterar senha</legend>
        <PasswordField label="Senha atual" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <PasswordField label="Nova senha" autoComplete="new-password" error={errors.newPassword?.message} {...form.register('newPassword')} />
        <PasswordField label="Confirmar nova senha" autoComplete="new-password" error={errors.confirmNewPassword?.message} {...form.register('confirmNewPassword')} />
        <p className="text-micro text-muted-foreground">Deixe em branco para manter a senha atual.</p>
      </fieldset>

      {errors.root?.server?.message && <div role="alert"><FieldError>{errors.root.server.message}</FieldError></div>}
      <Button type="submit" disabled={isSubmitting} className="min-w-24">{isSubmitting ? 'Salvando…' : 'Salvar'}</Button>
    </form>
  )
}

/** Avatar: ação imediata (não depende do "Salvar"). A imagem é reduzida no navegador antes do envio. */
function AvatarField({ user }: { user: User }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { set, remove } = useAvatar()
  const busy = set.isPending || remove.isPending

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      await set.mutateAsync(await resizeToSquareDataUrl(file))
      announce('Avatar atualizado.')
      toast.success('Avatar atualizado.')
    } catch (error) {
      const message = isApiError(error) ? errorMessage(error) : error instanceof Error ? error.message : errorMessage(error)
      toast.error('Não foi possível trocar o avatar.', { description: message })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-body" id="avatar-label">Avatar</span>
      <div className="flex items-center gap-4" role="group" aria-labelledby="avatar-label">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Seu avatar" className="size-10 rounded-full object-cover" data-testid="avatar-image" />
        ) : (
          <span role="img" aria-label="Sem avatar" className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <ImageIcon className="size-5" aria-hidden="true" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="avatar-input"
          aria-label="Escolher imagem do avatar"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          {set.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {user.avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              try {
                await remove.mutateAsync()
                toast.success('Avatar removido.')
              } catch (error) {
                toast.error('Não foi possível remover o avatar.', { description: errorMessage(error) })
              }
            }}
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando perfil" className="space-y-6">
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    </div>
  )
}
