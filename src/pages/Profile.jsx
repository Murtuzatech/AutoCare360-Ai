import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Avatar, PageHeader, Segmented } from '@/components/ui/Controls'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'

export default function Profile() {
  const { profile, user, avatarUrl, updateProfile, updatePreferences, uploadAvatar, removeAvatar } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)
  const [name, setName] = useState(profile.full_name || '')
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const dirty = name.trim() !== (profile.full_name || '')

  const saveName = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await updateProfile({ full_name: name.trim() }); toast.success('Profile saved') }
    catch (err) { toast.error(err.message || 'Could not save profile') }
    finally { setSaving(false) }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    try { await uploadAvatar(file); toast.success('Photo updated') }
    catch (err) { toast.error(err.message || 'Could not upload photo') }
    finally { setPhotoBusy(false) }
  }

  const onRemove = async () => {
    setPhotoBusy(true)
    try { await removeAvatar(); toast.success('Photo removed') }
    catch (err) { toast.error(err.message || 'Could not remove photo') }
    finally { setPhotoBusy(false) }
  }

  const savePref = async (patch) => {
    try { await updatePreferences(patch); toast.success('Preference saved') }
    catch (err) { toast.error(err.message || 'Could not save preference') }
  }

  return (
    <>
      <PageHeader title="Profile" description="How you appear in AutoCare 360." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title="Personal details" />
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-3">
              <Avatar src={avatarUrl} name={profile.full_name || user.email} size={96} />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} aria-label="Upload profile photo" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" loading={photoBusy} onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4" />{avatarUrl ? 'Change' : 'Upload'}</Button>
                {avatarUrl && <Button variant="ghost" size="sm" disabled={photoBusy} onClick={onRemove} aria-label="Remove photo"><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <p className="text-xs text-muted">JPG, PNG or WebP, up to 2 MB</p>
            </div>
            <form onSubmit={saveName} className="flex-1 space-y-4">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
              <Input label="Email" value={user.email} disabled hint="Your sign-in email can't be changed here." />
              <Button type="submit" loading={saving} disabled={!dirty || !name.trim()}>Save changes</Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Units & region" description="Used for odometer readings and costs across the app." />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium">Distance</p>
              <Segmented label="Distance unit" value={profile.preferences.units.distance} onChange={(v) => savePref({ units: { distance: v } })}
                options={[{ value: 'km', label: 'Kilometres' }, { value: 'mi', label: 'Miles' }]} />
            </div>
            <Select label="Currency" value={profile.preferences.units.currency} onChange={(e) => savePref({ units: { currency: e.target.value } })}>
              <option value="INR">₹ Indian rupee (INR)</option>
              <option value="USD">$ US dollar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
              <option value="GBP">£ British pound (GBP)</option>
              <option value="AED">AED UAE dirham</option>
            </Select>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
