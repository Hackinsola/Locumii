import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RatingStars from '@/components/profile/RatingStars';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { CREDENTIAL_DOC_TYPES, FCT_CITIES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { COUNCIL_REG_HINTS, validateCouncilRegNumber } from '@/utils/validators';
import { useProfessionalProfile, useSaveProfessionalProfile } from '@/hooks/useProfile';
import { useOwnCredentials } from '@/hooks/useCredentials';
import { useAuth } from '@/hooks/useAuth';
import PageContainer from '@/components/layout/PageContainer';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);
const CREDENTIAL_STATUS_LABELS = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

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
  const { profile, loading, error, refetch } = useProfessionalProfile(userId);
  const { credentials } = useOwnCredentials();
  const { saveProfile, loading: saving } = useSaveProfessionalProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  function startEditing() {
    setForm({
      fullName: profile.full_name ?? '',
      councilRegNumber: profile.council_reg_number ?? '',
      yearsExperience: String(profile.years_experience ?? ''),
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

  const credentialByType = Object.fromEntries(
    credentials.map((credential) => [credential.doc_type, credential])
  );
  const hasSubmittedCredentials = credentials.length > 0;

  return (
    <PageContainer>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load your profile.</p>}
        {!loading && !error && !profile && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                You haven’t created your profile yet.
              </p>
              <Button onClick={() => navigate('/professional/onboarding')}>
                Complete your profile
              </Button>
            </CardContent>
          </Card>
        )}

        {profile && !editing && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                  <VerifiedBadge
                    verified={profile.is_verified}
                    pending={!profile.is_verified && hasSubmittedCredentials}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {SPECIALTY_LABELS[profile.specialty] ?? profile.specialty}
                </p>
                {profile.avg_rating !== null && profile.avg_rating !== undefined && (
                  <RatingStars value={profile.avg_rating} />
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <DetailRow label="Council registration number" value={profile.council_reg_number} />
                <DetailRow
                  label="Experience"
                  value={`${profile.years_experience} year${profile.years_experience === 1 ? '' : 's'}`}
                />
                {profile.preferred_cities?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Preferred locations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.preferred_cities.map((city) => (
                        <span
                          key={city}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                        >
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.bio && <DetailRow label="About" value={profile.bio} />}
                <Button className="mt-1 self-start" onClick={startEditing}>
                  Edit profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Credentials</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {CREDENTIAL_DOC_TYPES.map(({ value, label }) => {
                  const credential = credentialByType[value];
                  return (
                    <div key={value} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground">{label}</span>
                      <span className="text-sm text-muted-foreground">
                        {credential
                          ? CREDENTIAL_STATUS_LABELS[credential.status] ?? credential.status
                          : 'Not uploaded'}
                      </span>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  className="mt-1 self-start"
                  onClick={() => navigate('/professional/documents')}
                >
                  {hasSubmittedCredentials ? 'Manage documents' : 'Upload documents'}
                </Button>
              </CardContent>
            </Card>
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
