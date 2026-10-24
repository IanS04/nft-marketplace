/** Estreita um valor qualquer (ex.: vindo de um <select>) para um dos valores permitidos, sem cast. */
export const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value)
