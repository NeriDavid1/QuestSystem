import type { ReactNode } from 'react'

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <span className="field-label"><span>{children}</span>{hint && <small>{hint}</small>}</span>
}