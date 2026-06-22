import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  FlaskConical,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SelectChip from '@/components/ui/SelectChip';
import SectionLabel from '@/components/ui/SectionLabel';
import Reveal from '@/components/layout/Reveal';
import PageContainer from '@/components/layout/PageContainer';
import { FACILITY_TYPES, FCT_CITIES } from '@/constants/options';
import { validateCACNumber, validateNigerianPhone } from '@/utils/validators';
import { useSaveFacilityProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const FIXED_STATE = 'FCT';
const FACILITY_TYPE_VALUES = FACILITY_TYPES.map((item) => item.value);
const FACILITY_TYPE_ICONS = {
  clinic: Stethoscope,
  hospital: Building2,
  pharmacy: Pill,
  diagnostic_lab: FlaskConical,
};

function Onboarding() {
  const navigate = useNavigate();
  const { saveProfile, loading } = useSaveFacilityProfile();
  const [form, setForm] = useState({
    facilityName: '',
    facilityType: '',
    cacNumber: '',
    address: '',
    city: '',
    contactName: '',
    contactPhone: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(event) {
    update(event.target.name, event.target.value);
  }

  function validate() {
    const next = {};
    if (form.facilityName.trim().length === 0) {
      next.facilityName = 'Enter the clinic name.';
    }
    if (!FACILITY_TYPE_VALUES.includes(form.facilityType)) {
      next.facilityType = 'Select the clinic type.';
    }
    if (form.cacNumber.trim().length === 0) {
      next.cacNumber = 'Enter the CAC registration number.';
    } else if (!validateCACNumber(form.cacNumber)) {
      next.cacNumber = 'Enter a valid CAC number, e.g. RC123456 or BN1234567.';
    }
    if (form.address.trim().length === 0) {
      next.address = 'Enter the clinic address.';
    }
    if (!FCT_CITIES.includes(form.city)) {
      next.city = 'Select the area council.';
    }
    if (form.contactName.trim().length === 0) {
      next.contactName = 'Enter the contact person’s name.';
    }
    if (!validateNigerianPhone(form.contactPhone)) {
      next.contactPhone = 'Enter a valid Nigerian phone number.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const { error } = await saveProfile({
      facilityName: form.facilityName.trim(),
      facilityType: form.facilityType,
      cacNumber: form.cacNumber.trim(),
      address: form.address.trim(),
      city: form.city,
      state: FIXED_STATE,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim(),
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not save your clinic. Please try again.');
      return;
    }
    navigate('/');
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-3 px-4 pt-10 pb-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Building2 className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Set up your clinic</h1>
            <p className="text-sm text-muted-foreground">
              Tell us about your clinic to start posting locum jobs.
            </p>
          </div>
        </div>
      </div>

      <PageContainer>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {/* Clinic type */}
          <Reveal className="flex flex-col gap-2">
            <SectionLabel>Clinic type</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {FACILITY_TYPES.map((item) => {
                const Icon = FACILITY_TYPE_ICONS[item.value] ?? Building2;
                const selected = form.facilityType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => update('facilityType', item.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-150 active:scale-[0.98]',
                      selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-foreground/30'
                    )}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    )}
                    <span className={cn('flex size-11 items-center justify-center rounded-xl', selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.facilityType && <p className="text-sm text-destructive">{errors.facilityType}</p>}
          </Reveal>

          {/* Clinic details */}
          <Reveal className="flex flex-col gap-4" delay={60}>
            <SectionLabel>Clinic details</SectionLabel>
            <Field label="Clinic name" error={errors.facilityName}>
              <Input
                name="facilityName"
                value={form.facilityName}
                onChange={handleChange}
                placeholder="e.g. Sunrise Medical Centre"
                aria-invalid={Boolean(errors.facilityName)}
              />
            </Field>
            <Field label="Address" error={errors.address}>
              <Textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street address of the clinic"
                aria-invalid={Boolean(errors.address)}
              />
            </Field>
          </Reveal>

          {/* Area council */}
          <Reveal className="flex flex-col gap-2" delay={120}>
            <SectionLabel>Location</SectionLabel>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" /> Area council (FCT)
            </p>
            <div className="flex flex-wrap gap-2">
              {FCT_CITIES.map((city) => (
                <SelectChip key={city} selected={form.city === city} onClick={() => update('city', city)}>
                  {city}
                </SelectChip>
              ))}
            </div>
            {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
          </Reveal>

          {/* CAC verification */}
          <Reveal delay={180}>
            <Card className="border-primary/30">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Business verification</p>
                    <p className="text-xs text-muted-foreground">
                      An admin verifies your CAC registration before you post.
                    </p>
                  </div>
                </div>
                <Field label="CAC registration number" error={errors.cacNumber}>
                  <Input
                    name="cacNumber"
                    value={form.cacNumber}
                    onChange={handleChange}
                    placeholder="RC123456"
                    aria-invalid={Boolean(errors.cacNumber)}
                  />
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          {/* Contact */}
          <Reveal className="flex flex-col gap-4" delay={240}>
            <SectionLabel>Contact</SectionLabel>
            <Field label="Contact person" error={errors.contactName}>
              <Input
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                placeholder="Full name"
                aria-invalid={Boolean(errors.contactName)}
              />
            </Field>
            <Field label="Clinic phone number" error={errors.contactPhone}>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  className="pl-9"
                  aria-invalid={Boolean(errors.contactPhone)}
                />
              </div>
            </Field>
            <Field label="Description (optional)">
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Tell doctors about your clinic, specialties, patient volume…"
              />
            </Field>
          </Reveal>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </form>
      </PageContainer>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <p className="hidden flex-1 text-sm text-muted-foreground sm:block">
            Please fill in all required fields.
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Complete setup'}
            {!loading && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default Onboarding;
