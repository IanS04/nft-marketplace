import type { ISODateString, UserId } from './common'

export interface User {
  id: UserId
  email: string
  username: string
  displayName: string
  ensName: string | null
  avatarUrl: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface AuthSession {
  user: User
  accessToken: string
  expiresAt: ISODateString
}

export interface LoginInput { email: string; password: string }

export interface RegisterInput {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface UpdateProfileInput {
  displayName: string
  username: string
  email: string
  ensName: string | null
  /** Hoje o formulário de perfil do Figma traz "Apelido da carteira": vai para a carteira principal. */
  walletNickname?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}