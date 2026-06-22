import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Settings as SettingsIcon,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import ActionSheet from '@/components/ui/ActionSheet';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { FACILITY_TYPES, FCT_CITIES } from '@/constants/options';
import { validateNigerianPhone } from '@/utils/validators';
import { useOwnFacilityProfile, useSaveFacilityProfile } from '@/hooks/useProfile';
import { useFacilityShiftStats } from '@/hooks/useShifts';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORT_EMAIL_HREF, SUPPORT_PHONE_HREF, SUPPORT_WHATSAPP_URL } from '@/constants/support';
import PageContainer from '@/components/layout/PageContainer';

const FIXED_STATE = 'FCT';
const FACILITY_TYPE_VALUES = FACILITY_TYPES.map((item) => item.value);
const FACILITY_TYPE_LABELS = Object.fromEntries(
  FACILITY_TYPES.map((item) => [item.value, item.label])
);
const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

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

function MyProfile() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { profile, loading, error, refetch } = useOwnFacilityProfile(userId);
  const { stats } = useFacilityShiftStats();
  const { saveProfile, loading: saving } = useSaveFacilityProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const filledCount = stats.filled + stats.completed;
  const ratingValue =
    profile?.avg_rating !== null && profile?.avg_rating !== undefined
      ? Number(profile.avg_rating).toFixed(1)
      : '—';

  function startEditing() {
    setForm({
      facilityName: profile.facility_name ?? '',
      facilityType: profile.facility_type ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      contactName: profile.contact_name ?? '',
      contactPhone: profile.contact_phone ?? '',
      description: profile.description ?? '',
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

  function validate() {
    const next = {};
    if (form.facilityName.trim().length === 0) next.facilityName = 'Enter the clinic name.';
    if (!FACILITY_TYPE_VALUES.includes(form.facilityType)) next.facilityType = 'Select the clinic type.';
    if (form.address.trim().length === 0) next.address = 'Enter the clinic address.';
    if (!FCT_CITIES.includes(form.city)) next.city = 'Select the area council.';
    if (form.contactName.trim().length === 0) next.contactName = 'Enter the contact person’s name.';
    if (!validateNigerianPhone(form.contactPhone)) next.contactPhone = 'Enter a valid Nigerian phone number.';
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
      facilityName: form.facilityName.trim(),
      facilityType: form.facilityType,
      // CAC number is immutable after creation — re-send the existing value.
      cacNumber: profile.cac_number,
      address: form.address.trim(),
      city: form.city,
      state: FIXED_STATE,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim(),
    });
    if (submitError) {
      setSaveError(submitError.message ?? 'Could not save your profile. Please try again.');
      return;
    }
    setEditing(false);
    setForm(null);
    refetch();
  }

  return (
    <PageContainer>
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your profile.</p>}
      {!loading && !error && !profile && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">You haven’t set up your clinic yet.</p>
            <Button onClick={() => navigate('/facility/onboarding')}>Set up your clinic</Button>
          </CardContent>
        </Card>
      )}

      {profile && !editing && (
        <>
          {/* Identity card */}
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-2 text-center">
              <InitialsAvatar name={profile.facility_name} size="xl" />
              <div className="flex flex-col items-center gap-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {profile.facility_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {FACILITY_TYPE_LABELS[profile.facility_type] ?? profile.facility_type}
                </p>
              </div>
              <VerifiedBadge verified={profile.is_verified} pending={!profile.is_verified} />
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border">
              <StatTile icon={Briefcase} value={stats.total} label="Jobs" />
              <StatTile icon={CheckCircle2} value={filledCount} label="Filled" />
              <StatTile icon={Star} value={ratingValue} label="Rating" />
            </CardContent>
          </Card>

          {/* Clinic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Clinic info
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              <DetailRow label="CAC number" value={profile.cac_number} />
              <DetailRow label="Address" value={profile.address} />
              <DetailRow
                label="Location"
                value={[profile.city, profile.state].filter(Boolean).join(', ')}
              />
              <DetailRow label="Contact" value={profile.contact_name} />
              {profile.contact_phone && <DetailRow label="Phone" value={profile.contact_phone} />}
              {profile.description && <DetailRow label="About" value={profile.description} />}
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
              <AccountRow icon={Pencil} label="Edit clinic profile" onClick={startEditing} />
              <AccountRow icon={Wallet} label="Payments" onClick={() => navigate('/facility/transactions')} />
              <AccountRow icon={SettingsIcon} label="Settings" onClick={() => navigate('/settings')} />
              <AccountRow icon={HelpCircle} label="Help & support" onClick={() => setHelpOpen(true)} />
            </CardContent>
          </Card>

          <ActionSheet
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            title="Help & support"
            description="How would you like to contact us?"
            actions={[
              { label: 'WhatsApp', icon: MessageCircle, href: SUPPORT_WHATSAPP_URL },
              { label: 'Call', icon: Phone, href: SUPPORT_PHONE_HREF },
              { label: 'Email', icon: Mail, href: SUPPORT_EMAIL_HREF },
            ]}
          />
        </>
      )}

      {profile && editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Edit your clinic profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="facilityName" className="text-sm font-medium text-foreground">
                  Clinic name
                </label>
                <Input
                  id="facilityName"
                  name="facilityName"
                  value={form.facilityName}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.facilityName)}
                />
                {formErrors.facilityName && (
                  <p className="text-sm text-destructive">{formErrors.facilityName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="facilityType" className="text-sm font-medium text-foreground">
                  Clinic type
                </label>
                <select
                  id="facilityType"
                  name="facilityType"
                  value={form.facilityType}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.facilityType)}
                  className={selectClasses}
                >
                  <option value="" disabled>
                    Select the clinic type
                  </option>
                  {FACILITY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {formErrors.facilityType && (
                  <p className="text-sm text-destructive">{formErrors.facilityType}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">CAC registration number</span>
                <p className="text-sm text-muted-foreground">{profile.cac_number} · cannot be changed</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="address" className="text-sm font-medium text-foreground">Address</label>
                <Textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.address)}
                />
                {formErrors.address && <p className="text-sm text-destructive">{formErrors.address}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className="text-sm font-medium text-foreground">
                  Location (FCT)
                </label>
                <select
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.city)}
                  className={selectClasses}
                >
                  <option value="" disabled>
                    Select the area council
                  </option>
                  {FCT_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {formErrors.city && <p className="text-sm text-destructive">{formErrors.city}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contactName" className="text-sm font-medium text-foreground">
                  Contact person
                </label>
                <Input
                  id="contactName"
                  name="contactName"
                  value={form.contactName}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.contactName)}
                />
                {formErrors.contactName && (
                  <p className="text-sm text-destructive">{formErrors.contactName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contactPhone" className="text-sm font-medium text-foreground">
                  Contact phone
                </label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="08012345678"
                  value={form.contactPhone}
                  onChange={handleChange}
                  aria-invalid={Boolean(formErrors.contactPhone)}
                />
                {formErrors.contactPhone && (
                  <p className="text-sm text-destructive">{formErrors.contactPhone}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Specialties, patient volume, facilities…"
                />
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
