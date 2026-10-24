/** 'compact' = modal do desktop; 'responsive' = página cheia (grande no mobile, compacta a partir de md). */
export type AuthFormSize = 'compact' | 'responsive'

export const inputClass = (size: AuthFormSize) =>
  size === 'compact'
    ? 'h-10 border-input bg-transparent'
    : 'h-12 rounded-xl border-input bg-transparent md:h-10 md:rounded-sm'

export const submitClass = (size: AuthFormSize) =>
  size === 'compact' ? 'h-10 w-full' : 'h-12 w-full rounded-xl text-title md:h-10 md:rounded-md md:text-body'
