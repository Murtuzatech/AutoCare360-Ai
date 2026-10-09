import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGarage } from '@/contexts/GarageContext'
import { useToast } from '@/contexts/ToastContext'
import { useForm } from '@/hooks/useForm'
import { useFormat } from '@/hooks/useFormat'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/Controls'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { FileField, FormError } from '@/components/common/Bits'
import { VehicleImage } from '@/components/vehicles/VehicleVisuals'
import { FUEL_TYPES, TRANSMISSIONS } from '@/lib/constants'
import { cleanNumber, cleanText, fromKm, parseDistanceInput } from '@/lib/format'
import { IMAGE_RULES, validateFile } from '@/lib/storage'

export default function VehicleFormPage() {
  const { id } = useParams()
  const { vehicles, loading } = useGarage()
  const existing = vehicles.find((v) => v.id === id)
  if (loading) return <Skeleton className="h-96" />
  if (id && !existing) {
    return <Card><EmptyState title="Vehicle not found" description="It may have been deleted." action={<Link to="/vehicles" className={buttonStyles()}>Back to vehicles</Link>} /></Card>
  }
  return <VehicleFormInner key={id ?? 'new'} existing={existing} />
}

function VehicleFormInner({ existing }) {
  const navigate = useNavigate()
  const { actions } = useGarage()
  const toast = useToast()
  const { unit, currency } = useFormat()
  const { profile } = useAuth() // eslint-disable-line no-unused-vars
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const preview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const year = new Date().getFullYear()

  const e0 = existing
  const form = useForm({
    nickname: e0?.nickname ?? '', make: e0?.make ?? '', model: e0?.model ?? '', variant: e0?.variant ?? '',
    manufacturing_year: e0?.manufacturing_year != null ? String(e0.manufacturing_year) : '',
    registration_number: e0?.registration_number ?? '', fuel_type: e0?.fuel_type ?? '', transmission: e0?.transmission ?? '',
    odometer: e0 ? String(fromKm(e0.odometer_km, unit)) : '',
    purchase_date: e0?.purchase_date ?? '', purchase_price: e0?.purchase_price != null ? String(e0.purchase_price) : '',
    vin: e0?.vin ?? '',
    insurance_provider: e0?.insurance_provider ?? '', insurance_policy_number: e0?.insurance_policy_number ?? '', insurance_expiry: e0?.insurance_expiry ?? '',
    puc_expiry: e0?.puc_expiry ?? '',
    warranty_provider: e0?.warranty_provider ?? '', warranty_expiry: e0?.warranty_expiry ?? '', warranty_notes: e0?.warranty_notes ?? '',
    notes: e0?.notes ?? '',
  })
  const { values: v, set, errors } = form
  const imageError = imageFile ? validateFile(imageFile, IMAGE_RULES) : null

  const validate = (x) => {
    const e = {}
    if (!x.nickname.trim()) e.nickname = 'Give your vehicle a nickname.'
    if (!x.make.trim()) e.make = 'Enter the make.'
    if (!x.model.trim()) e.model = 'Enter the model.'
    if (!x.fuel_type) e.fuel_type = 'Choose a fuel type.'
    if (x.manufacturing_year !== '' && (!Number.isInteger(Number(x.manufacturing_year)) || Number(x.manufacturing_year) < 1950 || Number(x.manufacturing_year) > year + 1))
      e.manufacturing_year = `Enter a year between 1950 and ${year + 1}.`
    if (x.odometer === '' || !Number.isFinite(Number(x.odometer)) || Number(x.odometer) < 0) e.odometer = 'Enter the current odometer reading.'
    if (x.purchase_price !== '' && !(Number(x.purchase_price) >= 0)) e.purchase_price = 'Price must be 0 or more.'
    if (x.vin && !/^[A-Za-z0-9]{5,32}$/.test(x.vin.trim())) e.vin = 'Use 5–32 letters and numbers, no spaces.'
    if (x.registration_number && x.registration_number.replace(/\s/g, '').length > 20) e.registration_number = 'Too long (max 20 characters).'
    if (x.warranty_expiry && x.purchase_date && x.warranty_expiry < x.purchase_date) e.warranty_expiry = 'Warranty cannot expire before the purchase date.'
    if (imageError) e.image = imageError
    return e
  }

  const save = async (x) => {
    const values = {
      nickname: x.nickname.trim(), make: x.make.trim(), model: x.model.trim(), variant: cleanText(x.variant),
      manufacturing_year: cleanNumber(x.manufacturing_year),
      registration_number: cleanText(x.registration_number?.toUpperCase().replace(/\s+/g, ' ')),
      fuel_type: x.fuel_type, transmission: x.transmission || null,
      odometer_km: parseDistanceInput(x.odometer, unit, e0?.odometer_km),
      purchase_date: x.purchase_date || null, purchase_price: cleanNumber(x.purchase_price),
      vin: cleanText(x.vin?.toUpperCase()),
      insurance_provider: cleanText(x.insurance_provider), insurance_policy_number: cleanText(x.insurance_policy_number), insurance_expiry: x.insurance_expiry || null,
      puc_expiry: x.puc_expiry || null,
      warranty_provider: cleanText(x.warranty_provider), warranty_expiry: x.warranty_expiry || null, warranty_notes: cleanText(x.warranty_notes),
      notes: cleanText(x.notes),
    }
    const saved = await actions.saveVehicle({ id: e0?.id, values, imageFile, removeImage, oldImagePath: e0?.image_path })
    toast.success(e0 ? 'Vehicle saved' : 'Vehicle added')
    navigate(`/vehicles/${saved.id}`, { replace: true })
  }

  const back = e0 ? `/vehicles/${e0.id}` : '/vehicles'
  return (
    <>
      <Link to={back} className="mb-3 inline-flex items-center gap-1.5 py-2 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Back</Link>
      <PageHeader title={e0 ? `Edit ${e0.nickname}` : 'Add vehicle'} />
      <form onSubmit={form.handle(validate, save)} noValidate className="space-y-6">
        <FormError>{form.submitError}</FormError>

        <Card>
          <CardHeader title="Basics" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nickname" value={v.nickname} onChange={set('nickname')} error={errors.nickname} maxLength={60} placeholder="e.g. Daily driver" />
            <Input label="Registration number" value={v.registration_number} onChange={set('registration_number')} error={errors.registration_number} maxLength={20} autoCapitalize="characters" />
            <Input label="Make" value={v.make} onChange={set('make')} error={errors.make} maxLength={60} placeholder="e.g. Honda" />
            <Input label="Model" value={v.model} onChange={set('model')} error={errors.model} maxLength={60} placeholder="e.g. City" />
            <Input label="Variant" value={v.variant} onChange={set('variant')} maxLength={60} />
            <Input label="Manufacturing year" type="number" inputMode="numeric" value={v.manufacturing_year} onChange={set('manufacturing_year')} error={errors.manufacturing_year} />
            <div>
              <Select label="Fuel type" value={v.fuel_type} onChange={set('fuel_type')}>
                <option value="">Select…</option>
                {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
              {errors.fuel_type && <p className="mt-1.5 text-sm text-danger">{errors.fuel_type}</p>}
            </div>
            <Select label="Transmission" value={v.transmission} onChange={set('transmission')}>
              <option value="">Select…</option>
              {TRANSMISSIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-4">
                {(preview || (e0?.image_path && !removeImage)) && (
                  preview ? <img src={preview} alt="Selected vehicle" className="h-16 w-24 rounded-ctl object-cover" />
                    : <VehicleImage path={e0.image_path} className="h-16 w-24 rounded-ctl" iconSize="h-6 w-6" />
                )}
                <div className="min-w-0 flex-1">
                  <FileField label="Photo (optional)" accept={IMAGE_RULES.types.join(',')} hint={IMAGE_RULES.hint} file={imageFile} onPick={setImageFile}
                    existingName={e0?.image_path} removed={removeImage} onRemoveExisting={() => setRemoveImage(true)} error={errors.image} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Usage & purchase" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={`Current odometer (${unit})`} type="number" inputMode="numeric" min="0" value={v.odometer} onChange={set('odometer')} error={errors.odometer} />
            <Input label="VIN / chassis number" value={v.vin} onChange={set('vin')} error={errors.vin} maxLength={32} autoCapitalize="characters" />
            <Input label="Purchase date" type="date" value={v.purchase_date} onChange={set('purchase_date')} />
            <Input label={`Purchase price (${currency})`} type="number" inputMode="decimal" min="0" step="0.01" value={v.purchase_price} onChange={set('purchase_price')} error={errors.purchase_price} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Insurance, PUC & warranty" description="Expiry dates power your reminders." />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Insurance provider" value={v.insurance_provider} onChange={set('insurance_provider')} maxLength={100} />
            <Input label="Policy number" value={v.insurance_policy_number} onChange={set('insurance_policy_number')} maxLength={60} />
            <Input label="Insurance expiry" type="date" value={v.insurance_expiry} onChange={set('insurance_expiry')} />
            <Input label="PUC expiry" type="date" value={v.puc_expiry} onChange={set('puc_expiry')} />
            <Input label="Warranty provider" value={v.warranty_provider} onChange={set('warranty_provider')} maxLength={100} />
            <Input label="Warranty expiry" type="date" value={v.warranty_expiry} onChange={set('warranty_expiry')} error={errors.warranty_expiry} />
            <Textarea label="Warranty notes" value={v.warranty_notes} onChange={set('warranty_notes')} maxLength={1000} className="sm:col-span-2" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Notes" />
          <CardBody><Textarea aria-label="Notes" value={v.notes} onChange={set('notes')} maxLength={2000} rows={4} /></CardBody>
        </Card>

        <div className="flex justify-end gap-2">
          <Link to={back} className={buttonStyles({ variant: 'secondary' })}>Cancel</Link>
          <Button type="submit" loading={form.busy}>{e0 ? 'Save changes' : 'Add vehicle'}</Button>
        </div>
      </form>
    </>
  )
}
