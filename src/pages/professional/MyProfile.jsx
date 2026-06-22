import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  FileText,
  HelpCircle,
  History,
  Mail,
  MessageCircle,
  Settings as SettingsIcon,
  Star,
  UserPen,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import ActionSheet from '@/components/ui/ActionSheet';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import AvailabilityCalendar from '@/components/profile/AvailabilityCalendar';
import { FCT_CITIES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { COUNCIL_REG_HINTS, validateCouncilRegNumber } from '@/utils/validators';
import { useProfessionalProfile, useSaveProfessionalProfile } from '@/hooks/useProfile';
import { useOwnCredentials } from '@/hooks/useCredentials';
import { useProfessionalEarnings } from '@/hooks/usePayments';
import { useProfessionalBids } from '@/hooks/useBids';
import { useAuth } from '@/hooks/useAuth';
import { formatNaira } from '@/utils/money';
import { dateKey } from '@/utils/availability';
import { SUPPORT_EMAIL_HREF, SUPPORT_WHATSAPP_URL } from '@/constants/support';
import PageContainer from '@/components/layout/PageContainer';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

// One of the three header stats (Shifts / Earned / Rating). `accent` paints the
// value brand amber — reserved for money received, per ui-context.md.
function StatTile({ icon: Icon, value, label, accent = false }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 text-center">
      <span
        className={
          accent
            ? 'flex size-9 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent'
            : 'flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary'
        }
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className={accent ? 'text-lg font-bold text-brand-accent' : 'text-lg font-bold text-foreground'}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// A tappable account row: leading tinted icon, label, trailing chevron.
function AccountRow({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:opacity-80"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function MyProfile() {
  const navigate = useNavigate();
  const { userId, email } = useAuth();
  const { profile, loading, error, refetch } = useProfessionalProfile(userId);
  const { credentials } = useOwnCredentials();
  const { earnings } = useProfessionalEarnings();
  const { bids } = useProfessionalBids();
  const { saveProfile, loading: saving } = useSaveProfessionalProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Colour the availability calendar: accepted upcoming shifts are "booked", pending
  // bids are "pending".
  const bookedDates = new Set();
  const pendingDates = new Set();
  for (const bid of bids) {
    const shift = single(bid.shifts);
    if (!shift?.start_time) continue;
    const key = dateKey(new Date(shift.start_time));
    if (bid.status === 'accepted') bookedDates.add(key);
    else if (bid.status === 'pending') pendingDates.add(key);
  }

  function startEditing() {
    setForm({
      fullName: profile.full_name ?? '',
      councilRegNumber: profile.council_reg_number ?? '',
      yearsExperience: String(profile.years_experience ?? ''),
      phone: profile.phone ?? '',
      bio: profile.bio ?? '',
      preferredCities: profile.preferred_cities ?? [],
    });
    setFormErrors({});
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCity(city) {
    setForm((prev) => ({
      ...prev,
      preferredCities: prev.preferredCities.includes(city)
        ? prev.preferredCities.filter((item) => item !== city)
        : [...prev.preferredCities, city],
    }));
  }

  function validate() {
    const next = {};
    if (form.fullName.trim().length === 0) {
      next.fullName = 'Enter your full name.';
    }
    // Specialty cannot be changed after creation, so it is always valid here.
    if (form.councilRegNumber.trim().length === 0) {
      next.councilRegNumber = 'Enter your council registration number.';
    } else if (!validateCouncilRegNumber(profile.specialty, form.councilRegNumber)) {
      next.councilRegNumber = `Enter a valid registration number (format: ${COUNCIL_REG_HINTS[profile.specialty]}).`;
    }
    const years = Number(form.yearsExperience);
    if (!Number.isInteger(years) || years < 0) {
      next.yearsExperience = 'Enter your years of experience as a whole number.';
    }
    if (form.preferredCities.length === 0) {
      next.preferredCities = 'Choose at least one preferred location.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaveError(null);
    const nextErrors = validate();
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const { error: submitError } = await saveProfile({
      fullName: form.fullName.trim(),
      // Specialty is immutable after creation — re-send the existing value.
      specialty: profile.specialty,
      councilRegNumber: form.councilRegNumber.trim(),
      yearsExperience: Number(form.yearsExperience),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      preferredCities: form.preferredCities,
    });
    if (submitError) {
      setSaveError(submitError.message ?? 'Could not save your profile. Please try again.');
      return;
    }
    setEditing(false);
    setForm(null);
    refetch();
  }

  const hasSubmittedCredentials = credentials.length > 0;
  const ratingValue =
    profile?.avg_rating !== null && profile?.avg_rating !== undefined
      ? Number(profile.avg_rating).toFixed(1)
      : '—';

  return (
    <PageContainer>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your profile.</p>}
      {!loading && !error && !profile && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">You haven’t created your profile yet.</p>
            <Button onClick={() => navigate('/professional/onboarding')}>
              Complete your profile
            </Button>
          </CardContent>
        </Card>
      )}

      {profile && !editing && (
        <>
          {/* Identity card */}
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-2 text-center">
              <InitialsAvatar name={profile.full_name} size="xl" />
              <div className="flex flex-col items-center gap-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {profile.full_name}
                </h1>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
              <VerifiedBadge
                verified={profile.is_verified}
                pending={!profile.is_verified && hasSubmittedCredentials}
              />
            </CardContent>
          </Card>

          {/* Header stats */}
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border">
              <StatTile icon={Briefcase} value={earnings.completedCount} label="Shifts" />
              <StatTile
                icon={Wallet}
                value={formatNaira(earnings.totalEarnedKobo)}
                label="Earned"
                accent
              />
              <StatTile icon={Star} value={ratingValue} label="Rating" />
            </CardContent>
          </Card>

          {/* My availability */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-foreground">My availability</CardTitle>
              <button
                type="button"
                onClick={() => navigate('/professional/availability')}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Edit
              </button>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar
                availability={profile.availability}
                availableForLocum={profile.available_for_locum}
                bookedDates={bookedDates}
                pendingDates={pendingDates}
              />
            </CardContent>
          </Card>

          {/* Professional info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Professional info
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              <DetailRow label="License" value={profile.council_reg_number} />
              <DetailRow
                label="Experience"
                value={`${profile.years_experience} year${profile.years_experience === 1 ? '' : 's'}`}
              />
              <DetailRow
                label="Specialty"
                value={SPECIALTY_LABELS[profile.specialty] ?? profile.specialty}
              />
              {profile.phone && <DetailRow label="Phone" value={profile.phone} />}
              {profile.preferred_cities?.length > 0 && (
                <DetailRow label="Preferred areas" value={profile.preferred_cities.join(', ')} />
              )}
              {profile.bio && <DetailRow label="Bio" value={profile.bio} />}
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              <AccountRow icon={UserPen} label="Edit profile" onClick={startEditing} />
              <AccountRow
                icon={CalendarClock}
                label="Availability"
                onClick={() => navigate('/professional/availability')}
              />
              <AccountRow
                icon={FileText}
                label={hasSubmittedCredentials ? 'My documents' : 'Upload documents'}
                onClick={() => navigate('/professional/documents')}
              />
              <AccountRow
                icon={History}
                label="Work history"
                onClick={() => navigate('/professional/work-history')}
              />
              <AccountRow
                icon={Wallet}
                label="Earnings & payouts"
                onClick={() => navigate('/professional/earnings')}
              />
              <AccountRow
                icon={SettingsIcon}
                label="Settings"
                onClick={() => navigate('/settings')}
              />
              <AccountRow
                icon={HelpCircle}
                label="Help & support"
                onClick={() => setHelpOpen(true)}
              />
            </CardContent>
          </Card>

          <ActionSheet
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title="Help & support"
            description="How would you like to contact us?"
            actions={[
              { label: 'Email', icon: Mail, href: SUPPORT_EMAIL_HREF },
              { label: 'WhatsApp', icon: MessageCircle, href: SUPPORT_WHATSAPP_URL },
            ]}
          />
        </>
      )}

      {profile && editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Edit your profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.fullName)}
                />
                {formErrors.fullName && (
                  <p className="text-sm text-destructive">{formErrors.fullName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone number <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0801 234 5678"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Specialty</span>
                <p className="text-sm text-muted-foreground">
                  {SPECIALTY_LABELS[profile.specialty] ?? profile.specialty} · cannot be changed
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="councilRegNumber" className="text-sm font-medium text-foreground">
                  Council registration number
                </label>
                <Input
                  id="councilRegNumber"
                  name="councilRegNumber"
                  value={form.councilRegNumber}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.councilRegNumber)}
                />
                {formErrors.councilRegNumber && (
                  <p className="text-sm text-destructive">{formErrors.councilRegNumber}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="yearsExperience" className="text-sm font-medium text-foreground">
                  Years of experience
                </label>
                <Input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  min="0"
                  step="1"
                  value={form.yearsExperience}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.yearsExperience)}
                />
                {formErrors.yearsExperience && (
                  <p className="text-sm text-destructive">{formErrors.yearsExperience}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Preferred locations (FCT)</span>
                <div className="grid grid-cols-2 gap-2">
                  {FCT_CITIES.map((city) => (
                    <label key={city} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.preferredCities.includes(city)}
                        onChange={() => toggleCity(city)}
                      />
                      {city}
                    </label>
                  ))}
                </div>
                {formErrors.preferredCities && (
                  <p className="text-sm text-destructive">{formErrors.preferredCities}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-sm font-medium text-foreground">
                  Short bio <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea id="bio" name="bio" value={form.bio} onChange={handleChange} />
              </div>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              <div className="mt-1 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

export default MyProfile;
