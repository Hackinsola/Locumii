import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RatingStars from '@/components/profile/RatingStars';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { FACILITY_TYPES, FCT_CITIES } from '@/constants/options';
import { validateNigerianPhone } from '@/utils/validators';
import { useOwnFacilityProfile, useSaveFacilityProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
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
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function MyProfile() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { profile, loading, error, refetch } = useOwnFacilityProfile(userId);
  const { saveProfile, loading: saving } = useSaveFacilityProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  function startEditing() {
    setForm({
      facilityName: profile.facility_name ?? '',
      facilityType: profile.facility_type ?? '',
      address: profile.address ?? '',
      city: profile.city ?? '',
      contactName: profile.contact_name ?? '',
      contactPhone: profile.contact_phone ?? '',
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
    if (form.facilityName.trim().length === 0) {
      next.facilityName = 'Enter the facility name.';
    }
    if (!FACILITY_TYPE_VALUES.includes(form.facilityType)) {
      next.facilityType = 'Select the facility type.';
    }
    if (form.address.trim().length === 0) {
      next.address = 'Enter the facility address.';
    }
    if (!FCT_CITIES.includes(form.city)) {
      next.city = 'Select the facility location.';
    }
    if (form.contactName.trim().length === 0) {
      next.contactName = 'Enter the contact person’s name.';
    }
    if (!validateNigerianPhone(form.contactPhone)) {
      next.contactPhone = 'Enter a valid Nigerian phone number, e.g. 08012345678.';
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
      facilityName: form.facilityName.trim(),
      facilityType: form.facilityType,
      // CAC number is immutable after creation — re-send the existing value.
      cacNumber: profile.cac_number,
      address: form.address.trim(),
      city: form.city,
      state: FIXED_STATE,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
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
              <p className="text-sm text-muted-foreground">
                You haven’t created your facility profile yet.
              </p>
              <Button onClick={() => navigate('/facility/onboarding')}>
                Complete your facility profile
              </Button>
            </CardContent>
          </Card>
        )}

        {profile && !editing && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{profile.facility_name}</CardTitle>
                <VerifiedBadge verified={profile.is_verified} pending={!profile.is_verified} />
              </div>
              <p className="text-sm text-muted-foreground">
                {FACILITY_TYPE_LABELS[profile.facility_type] ?? profile.facility_type}
              </p>
              {profile.avg_rating !== null && profile.avg_rating !== undefined && (
                <RatingStars value={profile.avg_rating} />
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <DetailRow label="CAC number" value={profile.cac_number} />
              <DetailRow label="Address" value={profile.address} />
              <DetailRow
                label="Location"
                value={[profile.city, profile.state].filter(Boolean).join(', ')}
              />
              <DetailRow label="Contact" value={profile.contact_name} />
              {profile.contact_phone && (
                <DetailRow label="Contact phone" value={profile.contact_phone} />
              )}
              <Button className="mt-1 self-start" onClick={startEditing}>
                Edit profile
              </Button>
            </CardContent>
          </Card>
        )}

        {profile && editing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Edit your facility profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="facilityName" className="text-sm font-medium text-foreground">
                    Facility name
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
                    Facility type
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
                      Select the facility type
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
                  <p className="text-sm text-muted-foreground">
                    {profile.cac_number} · cannot be changed
                  </p>
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
                  {formErrors.address && (
                    <p className="text-sm text-destructive">{formErrors.address}</p>
                  )}
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
