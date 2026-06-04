import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FACILITY_TYPES, FCT_CITIES } from '@/constants/options';
import { validateCACNumber, validateNigerianPhone } from '@/utils/validators';
import { useSaveFacilityProfile } from '@/hooks/useProfile';
import PageContainer from '@/components/layout/PageContainer';

// Launch geography is Abuja/FCT only, so state is fixed and the city comes from
// the FCT area councils.
const FIXED_STATE = 'FCT';
const FACILITY_TYPE_VALUES = FACILITY_TYPES.map((item) => item.value);
const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

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
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

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
    if (form.cacNumber.trim().length === 0) {
      next.cacNumber = 'Enter the CAC registration number.';
    } else if (!validateCACNumber(form.cacNumber)) {
      next.cacNumber = 'Enter a valid CAC number, e.g. RC123456 or BN1234567.';
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
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not save your profile. Please try again.');
      return;
    }
    navigate('/');
  }

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Complete your facility profile</CardTitle>
          <CardDescription>
            Tell us about your facility. An admin verifies it before you can post shifts.
          </CardDescription>
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
                aria-invalid={Boolean(errors.facilityName)}
              />
              {errors.facilityName && (
                <p className="text-sm text-destructive">{errors.facilityName}</p>
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
                aria-invalid={Boolean(errors.facilityType)}
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
              {errors.facilityType && (
                <p className="text-sm text-destructive">{errors.facilityType}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cacNumber" className="text-sm font-medium text-foreground">
                CAC registration number
              </label>
              <Input
                id="cacNumber"
                name="cacNumber"
                value={form.cacNumber}
                onChange={handleChange}
                aria-invalid={Boolean(errors.cacNumber)}
              />
              {errors.cacNumber && <p className="text-sm text-destructive">{errors.cacNumber}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="address" className="text-sm font-medium text-foreground">Address</label>
              <Textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                aria-invalid={Boolean(errors.address)}
                placeholder="Street address of the facility."
              />
              {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
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
                aria-invalid={Boolean(errors.city)}
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
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
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
                aria-invalid={Boolean(errors.contactName)}
              />
              {errors.contactName && (
                <p className="text-sm text-destructive">{errors.contactName}</p>
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
                aria-invalid={Boolean(errors.contactPhone)}
              />
              {errors.contactPhone && (
                <p className="text-sm text-destructive">{errors.contactPhone}</p>
              )}
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
