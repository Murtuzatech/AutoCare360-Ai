import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const IMAGE_RULES = { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 3 * 1024 * 1024, hint: 'JPG, PNG or WebP, up to 3 MB' }
export const INVOICE_RULES = { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024, hint: 'PDF, JPG, PNG or WebP, up to 5 MB' }

export const DOCUMENT_RULES = {
  types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxBytes: 10 * 1024 * 1024, hint: 'PDF, image, Word or text file, up to 10 MB',
}
export const RECEIPT_RULES = INVOICE_RULES
export const ANALYSIS_RULES = { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], maxBytes: 10 * 1024 * 1024, hint: 'JPG, PNG, WebP or PDF, up to 10 MB each', maxFiles: 5 }

export async function getDownloadUrl(bucket, path, filename) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120, { download: filename })
  if (error) throw error
  return data.signedUrl
}

export function validateFile(file, rules) {
  if (!rules.types.includes(file.type)) return `That file type isn't supported. Use ${rules.hint}.`
  if (file.size > rules.maxBytes) return `That file is too large. Use ${rules.hint}.`
  return null
}

export async function uploadFile(bucket, userId, file, rules) {
  const problem = validateFile(file, rules)
  if (problem) throw new Error(problem)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message || 'Upload failed.')
  return path
}

export async function removeFiles(bucket, paths) {
  const list = paths.filter(Boolean)
  if (!list.length) return
  list.forEach((p) => cache.delete(`${bucket}:${p}`))
  await supabase.storage.from(bucket).remove(list) // best effort; orphaned files are harmless
}

const cache = new Map()
export async function getSignedUrl(bucket, path, ttl = 3600) {
  const key = `${bucket}:${path}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl)
  if (error) throw error
  cache.set(key, { url: data.signedUrl, exp: Date.now() + ttl * 1000 })
  return data.signedUrl
}

export function useSignedUrl(bucket, path) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (!path) { setUrl(null); return }
    getSignedUrl(bucket, path).then((u) => !cancelled && setUrl(u)).catch(() => !cancelled && setUrl(null))
    return () => { cancelled = true }
  }, [bucket, path])
  return url
}
