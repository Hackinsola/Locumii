import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Camera,
  Check,
  FlaskConical,
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
import Logo from '@/components/layout/Logo';
import Reveal from '@/components/layout/Reveal';
import PageContainer from '@/components/layout/PageContainer';
import { FCT_CITIES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import {
  COUNCIL_REG_HINTS,
  validateCouncilRegNumber,
  validateNigerianPhone,
} from '@/utils/validators';
import { useSaveProfessionalProfile, useUploadAvatar } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // mirrors the avatars bucket limit
const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const SPECIALTY_VALUES = PROFESSIONAL_SPECIALTIES.map((item) => item.value);
const SPECIALTY_ICONS = {
  doctor: Stethoscope,
  nurse: Activity,
  pharmacist: Pill,
  medical_lab_scientist: FlaskConical,
};

// Quick-start bio templates (the LAI "select a template or write your own" chips).
const BIO_TEMPLATES = [
  {
    label: '🩺 Experienced',
    text: 'Experienced clinician with a passion for patient care. Skilled in managing acute and chronic conditions, with a calm and dependable bedside manner.',
  },
  {
    label: '⭐ Flexible & reliable',
    text: 'Flexible and reliable locum, comfortable in fast-paced clinic environments. Strong communicator with a track record of punctuality and professionalism.',
  },
  {
    label: '🎓 Fresh graduate',
    text: 'Recently qualified and eager to gain broad clinical experience. A quick learner with a strong work ethic and excellent bedside manner.',
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { saveProfile, loading } = useSaveProfessionalProfile();
  const { uploadAvatar, loading: uploadingAvatar } = useUploadAvatar();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    specialty: '',
    councilRegNumber: '',
    phone: '',
    yearsExperience: '',
    bio: '',
    preferredCities: [],
  });
  const [errors, setErrors] = useState({});
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(event) {
    update(event.target.name, event.target.value);
  }

  function toggleCity(city) {
    setForm((prev) => ({
      ...prev,
      preferredCities: prev.preferredCities.includes(city)
        ? prev.preferredCities.filter((item) => item !== city)
        : [...prev.preferredCities, city],
    }));
  }

  function applyTemplate(template) {
    setActiveTemplate(template.label);
    update('bio', template.text);
  }

  function handlePhotoSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, avatar: 'Use a JPG, PNG or WebP image.' }));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErrors((prev) => ({ ...prev, avatar: 'The photo must be 5 MB or smaller.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
  }

  function validate() {
    const next = {};
    if (form.fullName.trim().length === 0) {
      next.fullName = 'Enter your full name.';
    }
    if (!SPECIALTY_VALUES.includes(form.specialty)) {
      next.specialty = 'Select your profession.';
    }
    if (form.councilRegNumber.trim().length === 0) {
      next.councilRegNumber = 'Enter your council registration number.';
    } else if (
      SPECIALTY_VALUES.includes(form.specialty) &&
      !validateCouncilRegNumber(form.specialty, form.councilRegNumber)
    ) {
      next.councilRegNumber = `Enter a valid registration number (format: ${COUNCIL_REG_HINTS[form.specialty]}).`;
    }
    if (!validateNigerianPhone(form.phone.replace(/\s+/g, ''))) {
      next.phone = 'Enter a valid Nigerian phone number.';
    }
    const years = Number(form.yearsExperience);
    if (!Number.isInteger(years) || years < 0) {
      next.yearsExperience = 'Enter your years of experience as a whole number.';
    }
    if (form.preferredCities.length === 0) {
      next.preferredCities = 'Choose at least one preferred area.';
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
      fullName: form.fullName.trim(),
      specialty: form.specialty,
      councilRegNumber: form.councilRegNumber.trim(),
      phone: form.phone.replace(/\s+/g, '').trim(),
      yearsExperience: Number(form.yearsExperience),
      bio: form.bio.trim(),
      preferredCities: form.preferredCities,
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not save your profile. Please try again.');
      return;
    }
    // Photo is optional; upload after the profile row exists. On failure, stay on
    // the page — pressing Continue again retries both (saveProfile is an upsert).
    if (avatarFile) {
      const { error: avatarError } = await uploadAvatar(avatarFile);
      if (avatarError) {
        setSubmitError('Your profile was saved, but the photo upload failed. Try again or add it later from My Profile.');
        return;
      }
    }
    navigate('/professional/documents');
  }

  const regHint = form.specialty ? COUNCIL_REG_HINTS[form.specialty] : 'e.g. MDC/2024/12345';

  return (
    <div className="min-h-screen pb-28">
      {/* Branded header with a soft green glow */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-radial from-primary/20 to-transparent"
        />
        <div className="relative flex flex-col items-center gap-3 px-4 pt-10 pb-2 text-center">
          <Logo />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Complete your profile</h1>
            <p className="text-sm text-muted-foreground">Tell facilities who you are.</p>
          </div>
        </div>
      </div>

      <PageContainer>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {/* Profession */}
          <Reveal className="flex flex-col gap-2">
            <SectionLabel>I am a…</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {PROFESSIONAL_SPECIALTIES.map((item) => {
                const Icon = SPECIALTY_ICONS[item.value] ?? Stethoscope;
                const selected = form.specialty === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => update('specialty', item.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-150 active:scale-[0.98]',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-foreground/30'
                    )}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    )}
                    <span
                      className={cn(
                        'flex size-11 items-center justify-center rounded-xl',
                        selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        selected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.specialty && <p className="text-sm text-destructive">{errors.specialty}</p>}
          </Reveal>

          {/* Personal details */}
          <Reveal className="flex flex-col gap-4" delay={60}>
            <SectionLabel>Your details</SectionLabel>
            <Field label="Profile photo (optional)" error={errors.avatar}>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Your profile photo preview"
                    className="size-20 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Camera className="size-7" aria-hidden="true" />
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="avatar-input"
                    className="cursor-pointer text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {avatarFile ? 'Change photo' : 'Add a photo'}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Helps facilities recognise you. JPG, PNG or WebP, max 5 MB.
                  </p>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
              </div>
            </Field>
            <Field label="Full name" error={errors.fullName}>
              <Input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Dr. Jane Doe"
                aria-invalid={Boolean(errors.fullName)}
              />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0801 234 5678"
                  className="pl-9"
                  aria-invalid={Boolean(errors.phone)}
                />
              </div>
            </Field>
            <Field label="Years of experience" error={errors.yearsExperience}>
              <Input
                name="yearsExperience"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.yearsExperience}
                onChange={handleChange}
                placeholder="e.g. 5"
                aria-invalid={Boolean(errors.yearsExperience)}
              />
            </Field>
          </Reveal>

          {/* Verification */}
          <Reveal delay={120}>
            <Card className="border-primary/30">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">License verification</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm your council registration to get verified.
                    </p>
                  </div>
                </div>
                <Field label="Council registration number" error={errors.councilRegNumber}>
                  <Input
                    name="councilRegNumber"
                    value={form.councilRegNumber}
                    onChange={handleChange}
                    placeholder={regHint}
                    aria-invalid={Boolean(errors.councilRegNumber)}
                  />
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          {/* Preferred areas */}
          <Reveal className="flex flex-col gap-2" delay={180}>
            <SectionLabel>Preferred areas</SectionLabel>
            <p className="text-sm text-muted-foreground">Where do you want to pick up shifts?</p>
            <div className="flex flex-wrap gap-2">
              {FCT_CITIES.map((city) => (
                <SelectChip
                  key={city}
                  selected={form.preferredCities.includes(city)}
                  onClick={() => toggleCity(city)}
                >
                  {city}
                </SelectChip>
              ))}
            </div>
            {errors.preferredCities && (
              <p className="text-sm text-destructive">{errors.preferredCities}</p>
            )}
          </Reveal>

          {/* Bio */}
          <Reveal className="flex flex-col gap-2" delay={240}>
            <SectionLabel>About you</SectionLabel>
            <p className="text-sm text-muted-foreground">Select a template or write your own.</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {BIO_TEMPLATES.map((template) => (
                <SelectChip
                  key={template.label}
                  selected={activeTemplate === template.label}
                  onClick={() => applyTemplate(template)}
                  className="shrink-0"
                >
                  {template.label}
                </SelectChip>
              ))}
            </div>
            <Textarea
              name="bio"
              value={form.bio}
              onChange={(event) => {
                setActiveTemplate(null);
                handleChange(event);
              }}
              placeholder="Tell clinics about yourself…"
              rows={4}
            />
          </Reveal>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </form>
      </PageContainer>

      {/* Sticky bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <p className="hidden flex-1 text-sm text-muted-foreground sm:block">
            You can upload your documents next.
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={loading || uploadingAvatar}
          >
            {loading || uploadingAvatar ? 'Saving…' : 'Continue'}
            {!(loading || uploadingAvatar) && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Labelled field wrapper with an inline error message.
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
