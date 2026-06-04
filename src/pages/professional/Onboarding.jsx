import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FCT_CITIES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { COUNCIL_REG_HINTS, validateCouncilRegNumber } from '@/utils/validators';
import { useSaveProfessionalProfile } from '@/hooks/useProfile';
import PageContainer from '@/components/layout/PageContainer';

const SPECIALTY_VALUES = PROFESSIONAL_SPECIALTIES.map((item) => item.value);
const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

function Onboarding() {
  const navigate = useNavigate();
  const { saveProfile, loading } = useSaveProfessionalProfile();
  const [form, setForm] = useState({
    fullName: '',
    specialty: '',
    councilRegNumber: '',
    yearsExperience: '',
    bio: '',
    preferredCities: [],
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

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
    if (!SPECIALTY_VALUES.includes(form.specialty)) {
      next.specialty = 'Select your specialty.';
    }
    if (form.councilRegNumber.trim().length === 0) {
      next.councilRegNumber = 'Enter your council registration number.';
    } else if (
      SPECIALTY_VALUES.includes(form.specialty) &&
      !validateCouncilRegNumber(form.specialty, form.councilRegNumber)
    ) {
      next.councilRegNumber = `Enter a valid registration number (format: ${COUNCIL_REG_HINTS[form.specialty]}).`;
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
      yearsExperience: Number(form.yearsExperience),
      bio: form.bio.trim(),
      preferredCities: form.preferredCities,
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not save your profile. Please try again.');
      return;
    }
    // Continue to the document-upload step of onboarding.
    navigate('/professional/documents');
  }

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Complete your professional profile</CardTitle>
          <CardDescription>
            Tell facilities who you are. You can upload your credentials in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">Full name</label>
              <Input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="specialty" className="text-sm font-medium text-foreground">Specialty</label>
              <select
                id="specialty"
                name="specialty"
                value={form.specialty}
                onChange={handleChange}
                aria-invalid={Boolean(errors.specialty)}
                className={selectClasses}
              >
                <option value="" disabled>
                  Select your specialty
                </option>
                {PROFESSIONAL_SPECIALTIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.specialty && <p className="text-sm text-destructive">{errors.specialty}</p>}
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
                aria-invalid={Boolean(errors.councilRegNumber)}
              />
              {errors.councilRegNumber && (
                <p className="text-sm text-destructive">{errors.councilRegNumber}</p>
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
                aria-invalid={Boolean(errors.yearsExperience)}
              />
              {errors.yearsExperience && (
                <p className="text-sm text-destructive">{errors.yearsExperience}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Preferred locations (FCT)</span>
              <div className="grid grid-cols-2 gap-2">
                {FCT_CITIES.map((city) => (
                  <label
                    key={city}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={form.preferredCities.includes(city)}
                      onChange={() => toggleCity(city)}
                    />
                    {city}
                  </label>
                ))}
              </div>
              {errors.preferredCities && (
                <p className="text-sm text-destructive">{errors.preferredCities}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Short bio <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="A sentence or two about your experience."
              />
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default Onboarding;
