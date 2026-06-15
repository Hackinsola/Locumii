import { useState } from 'react';
import { Building2, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFacilityReferral } from '@/hooks/useWaitlist';

// Spec 13 — post-signup facility nomination. A professional names a clinic they know
// that uses locums; it's stored as a warm lead and bumps their waitlist position.
// Collapsed behind a button by default; expands into the form (accordion).

const FACILITY_TYPES = [
  'Private clinic',
  'Hospital',
  'Pharmacy',
  'Diagnostic / Lab centre',
  'Other',
];

const RELATIONSHIPS = [
  'I have worked locum shifts there',
  'I know someone who works there',
  "I've heard they hire locums",
  'Other',
];

// Native <select> styled to match the Input component.
const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm';

const EMPTY = {
  facilityName: '',
  city: '',
  facilityType: '',
  contactName: '',
  contactInfo: '',
  relationship: '',
};

function FacilityReferralForm({ refereeEmail, onPositionChange }) {
  const { nominate, status } = useFacilityReferral();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [lastFacility, setLastFacility] = useState(null);

  const submitting = status === 'submitting';

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.facilityName.trim()) {
      next.facilityName = 'Enter the facility name.';
    }
    if (!form.city.trim()) {
      next.city = 'Enter the city or area.';
    }
    if (!form.relationship) {
      next.relationship = 'Tell us how you know this facility.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    const { position, error } = await nominate({ refereeEmail, ...form });
    if (error) {
      return;
    }
    setLastFacility(form.facilityName.trim());
    setForm(EMPTY);
    if (typeof position === 'number') {
      onPositionChange?.(position);
    }
  }

  // After a successful nomination — confirmation + "nominate another".
  if (lastFacility && status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand-green/30 bg-brand-green/5 p-5 text-center">
        <CheckCircle2 className="size-7 text-brand-green" aria-hidden="true" />
        <p className="text-sm text-foreground">
          Thanks! We&rsquo;ll reach out to{' '}
          <span className="font-semibold">{lastFacility}</span> on your behalf — and you&rsquo;ve
          moved up the waitlist.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLastFacility(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nominate another facility
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Building2 className="size-4" aria-hidden="true" />
        Nominate a facility
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex animate-in flex-col gap-3 rounded-xl border border-border bg-card p-4 duration-300 fade-in slide-in-from-top-1"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="facilityName" className="text-sm font-medium text-foreground">
          Facility name
        </label>
        <Input
          id="facilityName"
          name="facilityName"
          placeholder="e.g. Cedarcrest Hospital"
          value={form.facilityName}
          onChange={handleChange}
          aria-invalid={Boolean(errors.facilityName)}
        />
        {errors.facilityName && <p className="text-sm text-destructive">{errors.facilityName}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="city" className="text-sm font-medium text-foreground">
          City / area
        </label>
        <Input
          id="city"
          name="city"
          placeholder="e.g. Wuse 2, Abuja"
          value={form.city}
          onChange={handleChange}
          aria-invalid={Boolean(errors.city)}
        />
        {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="facilityType" className="text-sm font-medium text-foreground">
          Facility type <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <select
          id="facilityType"
          name="facilityType"
          className={selectClass}
          value={form.facilityType}
          onChange={handleChange}
        >
          <option value="">Select a type</option>
          {FACILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactName" className="text-sm font-medium text-foreground">
          Contact person <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="contactName"
          name="contactName"
          placeholder="e.g. Dr. Amaka (Medical Director)"
          value={form.contactName}
          onChange={handleChange}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactInfo" className="text-sm font-medium text-foreground">
          Contact phone or email{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="contactInfo"
          name="contactInfo"
          placeholder="Phone or email, if you have it"
          value={form.contactInfo}
          onChange={handleChange}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="relationship" className="text-sm font-medium text-foreground">
          How do you know this facility?
        </label>
        <select
          id="relationship"
          name="relationship"
          className={selectClass}
          value={form.relationship}
          onChange={handleChange}
          aria-invalid={Boolean(errors.relationship)}
        >
          <option value="">Select one</option>
          {RELATIONSHIPS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.relationship && <p className="text-sm text-destructive">{errors.relationship}</p>}
      </div>

      <Button type="submit" className="mt-1 w-full" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit facility'}
      </Button>
    </form>
  );
}

export default FacilityReferralForm;
