import { Eye, EyeOff } from 'lucide-react'
import {
  forwardRef, useId, useState,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { Input } from './input'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  /** O Figma mostra só o placeholder: o label continua existindo para leitores de tela. */
  hideLabel?: boolean
  required?: boolean
  inputClassName?: string
  /** Conteúdo à direita, dentro do campo (ex.: botão de mostrar senha). */
  endAdornment?: ReactNode
}

/**
 * Campo com label, erro e aria-* já ligados:
 * aria-invalid quando há erro e aria-describedby apontando para a mensagem.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hideLabel = false, required = false, className, inputClassName, endAdornment, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const errorId = `${inputId}-error`
    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={inputId} className={cn('block text-body text-foreground', hideLabel && 'sr-only')}>
          {label}
          {required && <span className="text-required" aria-hidden="true">*</span>}
        </label>
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-required={required || undefined}
            className={cn(endAdornment && 'pr-10', inputClassName)}
            {...props}
          />
          {endAdornment && <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>}
        </div>
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    )
  },
)
TextField.displayName = 'TextField'

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type' | 'endAdornment'>>(
  (props, ref) => {
    const [visible, setVisible] = useState(false)
    return (
      <TextField
        ref={ref}
        type={visible ? 'text' : 'password'}
        endAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="flex size-8 items-center justify-center rounded-sm text-primary hover:bg-secondary"
          >
            {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        }
        {...props}
      />
    )
  },
)
PasswordField.displayName = 'PasswordField'

export function FieldError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} className="text-micro text-destructive">
      <span aria-hidden="true">⚠ </span>
      {children}
    </p>
  )
}

const controlClass =
  'flex w-full rounded-sm border border-input bg-transparent px-3 text-body text-foreground ' +
  'placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  required?: boolean
  placeholder?: string
  options: { value: string; label: string }[]
}

/** Select nativo: teclado, leitores de tela e mobile funcionam sem esforço extra. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, required = false, placeholder, options, className, id, ...props }, ref) => {
    const autoId = useId()
    const selectId = id ?? autoId
    const errorId = `${selectId}-error`
    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={selectId} className="block text-body text-foreground">
          {label}
          {required && <span className="text-required" aria-hidden="true">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={required || undefined}
          className={cn(controlClass, 'h-9 bg-background')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    )
  },
)
SelectField.displayName = 'SelectField'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    const errorId = `${fieldId}-error`
    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={fieldId} className="block text-body text-foreground">{label}</label>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(controlClass, 'min-h-24 py-2')}
          {...props}
        />
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    )
  },
)
TextAreaField.displayName = 'TextAreaField'

/** "Nome ENS*" do Figma: seletor ".eth" + nome. O valor salvo é "<nome>.eth". */
export const EnsField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'label' | 'hideLabel' | 'inputClassName' | 'endAdornment'> & { label?: string }
>(
  ({ label = 'Nome ENS', error, required = true, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const errorId = `${inputId}-error`
    return (
      <div className={cn('space-y-1', className)}>
        <label htmlFor={inputId} className="block text-body text-foreground">
          {label}
          {required && <span className="text-required" aria-hidden="true">*</span>}
        </label>
        <div className="flex gap-2">
          <select aria-label="Sufixo ENS" className={cn(controlClass, 'h-9 w-20 bg-background')} defaultValue=".eth">
            <option value=".eth">.eth</option>
          </select>
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-required={required || undefined}
            placeholder="seu-nome"
            {...props}
          />
        </div>
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    )
  },
)
EnsField.displayName = 'EnsField'
