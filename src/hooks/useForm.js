import { useState } from 'react'

/** Small form helper: values, per-field errors, a submit error and a busy flag. */
export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => {
    const value = e && e.target ? e.target.value : e
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((er) => (er[key] ? { ...er, [key]: undefined } : er))
  }
  const handle = (validate, save) => async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      // wait for the error state to render, then move focus to the first invalid field
      requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setBusy(true); setSubmitError('')
    try { await save(values) } catch (err) { setSubmitError(err.message || 'Something went wrong.') } finally { setBusy(false) }
  }
  return { values, setValues, set, errors, submitError, busy, handle }
}
