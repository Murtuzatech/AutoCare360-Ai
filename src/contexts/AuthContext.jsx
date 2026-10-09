import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { mergeDeep, withDefaults } from '@/lib/preferences'

const AuthContext = createContext(null)

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX = 2 * 1024 * 1024

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)

  const user = session?.user ?? null
  const userId = user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setProfileError(null)
    try {
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) throw error
      if (!data) {
        // Safety net if the signup trigger hasn't created the row
        const created = await supabase.from('profiles')
          .insert({ id: userId, email: user.email, full_name: user.user_metadata?.full_name ?? '' })
          .select().single()
        if (created.error) throw created.error
        data = created.data
      }
      setProfile({ ...data, preferences: withDefaults(data.preferences) })
    } catch (err) {
      setProfileError(err.message || 'Could not load your profile.')
    }
  }, [userId, user?.email, user?.user_metadata?.full_name])

  useEffect(() => {
    if (!userId) { setProfile(null); setAvatarUrl(null); setProfileError(null); return }
    loadProfile()
  }, [userId, loadProfile])

  // Private bucket → short-lived signed URL
  useEffect(() => {
    let cancelled = false
    if (!profile?.avatar_path) { setAvatarUrl(null); return }
    supabase.storage.from('avatars').createSignedUrl(profile.avatar_path, 3600).then(({ data }) => {
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null)
    })
    return () => { cancelled = true }
  }, [profile?.avatar_path])

  const updateProfile = useCallback(async (patch) => {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single()
    if (error) throw error
    setProfile({ ...data, preferences: withDefaults(data.preferences) })
  }, [userId])

  const updatePreferences = useCallback(async (patch) => {
    const previous = profile
    const next = mergeDeep(profile.preferences, patch)
    setProfile({ ...profile, preferences: next }) // optimistic
    const { error } = await supabase.from('profiles').update({ preferences: next }).eq('id', userId)
    if (error) {
      setProfile(previous)
      throw error
    }
  }, [profile, userId])

  const uploadAvatar = useCallback(async (file) => {
    if (!AVATAR_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.')
    if (file.size > AVATAR_MAX) throw new Error('Image must be 2 MB or smaller.')
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
    if (error) throw error
    const old = profile?.avatar_path
    await updateProfile({ avatar_path: path })
    if (old) supabase.storage.from('avatars').remove([old])
  }, [userId, profile?.avatar_path, updateProfile])

  const removeAvatar = useCallback(async () => {
    const old = profile?.avatar_path
    if (!old) return
    await updateProfile({ avatar_path: null })
    supabase.storage.from('avatars').remove([old])
  }, [profile?.avatar_path, updateProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } })
  const signOut = () => supabase.auth.signOut()
  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  const updatePassword = (password) => supabase.auth.updateUser({ password })

  const loading = authLoading || (Boolean(userId) && !profile && !profileError)

  const value = useMemo(() => ({
    session, user, profile, avatarUrl, loading, profileError, reloadProfile: loadProfile,
    updateProfile, updatePreferences, uploadAvatar, removeAvatar,
    signIn, signUp, signOut, sendPasswordReset, updatePassword,
   
  }), [session, user, profile, avatarUrl, loading, profileError, loadProfile, updateProfile, updatePreferences, uploadAvatar, removeAvatar])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
