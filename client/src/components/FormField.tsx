import { useEffect, useRef, type ReactNode } from 'react'

/**
 * The shared input styling.
 *
 * Every form in the academy uses this so a field looks the same on the sign-in page, the
 * registration page, and the wallet connection form.
 */
export const fieldClasses =
  'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-parchment placeholder:text-muted/60 disabled:opacity-60'

/** The shared styling for a field that failed validation. */
export const invalidFieldClasses =
  'w-full rounded-md border border-danger bg-surface px-3 py-2.5 text-parchment placeholder:text-muted/60 disabled:opacity-60'

export interface FormFieldRenderProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  className: string
}

export interface FormFieldProps {
  /** The id of the control. It is also used to build the error and hint ids. */
  id: string
  /** The visible label. */
  label: string
  /** The validation message for this field, when it failed. */
  error?: string | undefined
  /** A helper message shown when the field is valid. */
  hint?: string | undefined
  /** Extra guidance that is shown alongside an error. */
  describedBy?: string | undefined
  /** Renders the control itself. */
  children: (props: FormFieldRenderProps) => ReactNode
}

/**
 * A labelled form field with a consistent validation message.
 *
 * The error message is announced as soon as it appears, and the control is wired to it
 * with `aria-invalid` and `aria-describedby`, so a screen-reader user learns both that the
 * field is wrong and why.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  describedBy,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const describedByValue = error
    ? [errorId, describedBy].filter(Boolean).join(' ')
    : [hint ? hintId : undefined, describedBy].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-parchment">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedByValue || undefined,
        className: error ? invalidFieldClasses : fieldClasses,
      })}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Move focus to the first field that failed validation.
 *
 * A learner who submits an invalid form is told what is wrong, and the keyboard lands on
 * the field that needs attention instead of at the top of the page.
 */
export function useFocusFirstError(errors: Record<string, unknown>): void {
  const focused = useRef(false)

  useEffect(() => {
    if (focused.current) return

    const first = Object.keys(errors)[0]
    if (!first) return

    const element = document.getElementById(first)
    if (!element) return

    focused.current = true
    element.focus()
  }, [errors])
}
