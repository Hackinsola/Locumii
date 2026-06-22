import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, MapPin, Rocket, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SelectChip from '@/components/ui/SelectChip';
import SectionLabel from '@/components/ui/SectionLabel';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageContainer from '@/components/layout/PageContainer';
import { FCT_CITIES } from '@/constants/options';
import { usePostPaidShift } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { openPaystackPopup } from '@/lib/paystack';
import { calculateNet, formatNaira, nairaToKobo } from '@/utils/money';
import { COMMISSION_RATE } from '@/constants/fees';

// Quick-fill title presets (the LAI "Standard / Urgent / Weekend / Night" chips).
const TITLE_PRESETS = [
  { key: 'Standard', title: 'Locum Doctor — General Practice' },
  { key: 'Urgent', title: 'Urgent Locum Cover' },
  { key: 'Weekend', title: 'Weekend Locum Doctor' },
  { key: 'Night', title: 'Night Shift Locum' },
];

const DESC_TEMPLATES = [
  { key: 'Full service', text: 'Full GP services including consultations, basic procedures, and prescriptions. Moderate patient load.' },
  { key: 'Basic clinic', text: 'Standard outpatient consultations and prescriptions. Chill clinic with a moderate patient load.' },
  { key: 'With procedures', text: 'GP duties plus minor procedures: wound suturing & dressing, I&D, injections, nebuliser.' },
];

// Local date helpers for the quick-select chips and combining date+time → ISO.
function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function combine(date, time) {
  return date && time ? new Date(`${date}T${time}`) : null;
}
const DATE_PRESETS = [
  { key: 'Tomorrow', offset: 1 },
  { key: 'In 2 days', offset: 2 },
  { key: 'In 3 days', offset: 3 },
];
const TIME_PRESETS = [
  { key: 'Morning', start: '08:00', end: '14:00' },
  { key: 'Afternoon', start: '14:00', end: '20:00' },
  { key: 'Full day', start: '08:00', end: '18:00' },
];

function PostShift() {
  const navigate = useNavigate();
  const { postPaidShift, loading: paying } = usePostPaidShift();
  const { email } = useAuth();
  const [form, setForm] = useState({
    roleRequired: '',
    requirements: '',
    date: '',
    start: '',
    end: '',
    hourlyRate: '',
    city: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  function handleChange(event) {
    update(event.target.name, event.target.value);
  }

  // Working hours + estimated total, derived from the chosen window and rate.
  const { hours, totalKobo } = useMemo(() => {
    const startDt = combine(form.date, form.start);
    const endDt = combine(form.date, form.end);
    if (!startDt || !endDt || endDt <= startDt) {
      return { hours: 0, totalKobo: 0 };
    }
    const h = Math.round(((endDt - startDt) / 3_600_000) * 10) / 10;
    const rate = Number(form.hourlyRate);
    return { hours: h, totalKobo: rate > 0 ? nairaToKobo(rate * h) : 0 };
  }, [form.date, form.start, form.end, form.hourlyRate]);

  function validate() {
    const next = {};
    if (form.roleRequired.trim().length === 0) next.roleRequired = 'Add a job title.';
    if (!form.date) next.date = 'Choose a date.';
    const startDt = combine(form.date, form.start);
    if (!form.start) next.start = 'Set a start time.';
    else if (startDt && startDt < new Date()) next.start = 'Start must be in the future.';
    if (!form.end) next.end = 'Set an end time.';
    else if (form.start && hours <= 0) next.end = 'End must be after the start.';
    if (!(Number(form.hourlyRate) > 0)) next.hourlyRate = 'Enter an hourly rate.';
    if (!FCT_CITIES.includes(form.city)) next.city = 'Choose a location.';
    return next;
  }

  function handlePublish() {
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setShowSummary(true);
  }

  async function finalisePostedShift(reference, draft) {
    const { shiftId, error } = await postPaidShift({ reference, shift: draft });
    if (error || !shiftId) {
      setSubmitError(
        error?.message ??
          'We could not confirm your payment. If you were charged, contact support before retrying.'
      );
      return;
    }
    navigate('/facility/shifts');
  }

  function handleConfirmPay() {
    setShowSummary(false);
    setSubmitError(null);
    const reference = `locumii-${crypto.randomUUID()}`;
    const draft = {
      roleRequired: form.roleRequired.trim(),
      startTime: combine(form.date, form.start).toISOString(),
      endTime: combine(form.date, form.end).toISOString(),
      payRateKobo: totalKobo,
      requirements: form.requirements.trim(),
      city: form.city,
    };
    try {
      openPaystackPopup({
        email,
        amountKobo: totalKobo,
        reference,
        onSuccess: (response) => finalisePostedShift(response?.reference ?? reference, draft),
        onClose: () => setSubmitError('Payment cancelled — your job was not posted.'),
      });
    } catch (caught) {
      setSubmitError(caught.message ?? 'Could not open the payment window.');
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <PageContainer>
        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Stethoscope className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create a new job</h1>
          <p className="text-sm text-muted-foreground">Fill in the details to post a locum position.</p>
        </div>

        {/* Job details */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Job details</SectionLabel>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {TITLE_PRESETS.map((preset) => (
                  <SelectChip
                    key={preset.key}
                    selected={form.roleRequired === preset.title}
                    onClick={() => update('roleRequired', preset.title)}
                  >
                    {preset.key}
                  </SelectChip>
                ))}
              </div>
              <Field label="Job title" error={errors.roleRequired}>
                <Input
                  name="roleRequired"
                  value={form.roleRequired}
                  onChange={handleChange}
                  placeholder="e.g. Locum Doctor Needed"
                  aria-invalid={Boolean(errors.roleRequired)}
                />
              </Field>
              <Field label="Description & requirements">
                <div className="mb-2 flex flex-wrap gap-2">
                  {DESC_TEMPLATES.map((template) => (
                    <SelectChip
                      key={template.key}
                      selected={form.requirements === template.text}
                      onClick={() => update('requirements', template.text)}
                    >
                      {template.key}
                    </SelectChip>
                  ))}
                </div>
                <Textarea
                  name="requirements"
                  value={form.requirements}
                  onChange={handleChange}
                  placeholder="Describe job duties, procedures, and any requirements…"
                  rows={4}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Date & time */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Date &amp; time</SectionLabel>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((preset) => (
                  <SelectChip
                    key={preset.key}
                    selected={form.date === isoDate(preset.offset)}
                    onClick={() => update('date', isoDate(preset.offset))}
                  >
                    {preset.key}
                  </SelectChip>
                ))}
              </div>
              <Field label="Job date" error={errors.date}>
                <Input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.date)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset) => (
                  <SelectChip
                    key={preset.key}
                    selected={form.start === preset.start && form.end === preset.end}
                    onClick={() => setForm((prev) => ({ ...prev, start: preset.start, end: preset.end }))}
                  >
                    {preset.key}
                  </SelectChip>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" error={errors.start}>
                  <Input type="time" name="start" value={form.start} onChange={handleChange} aria-invalid={Boolean(errors.start)} />
                </Field>
                <Field label="End" error={errors.end}>
                  <Input type="time" name="end" value={form.end} onChange={handleChange} aria-invalid={Boolean(errors.end)} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compensation */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Compensation</SectionLabel>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Field label="Hourly rate (₦)" error={errors.hourlyRate}>
                <div className="relative">
                  <Banknote className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="number"
                    name="hourlyRate"
                    min="0"
                    step="500"
                    value={form.hourlyRate}
                    onChange={handleChange}
                    placeholder="e.g. 15000"
                    className="pl-9"
                    aria-invalid={Boolean(errors.hourlyRate)}
                  />
                </div>
              </Field>
              <div className="rounded-xl bg-primary/10 px-4 py-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Working hours</span>
                  <span className="font-medium text-foreground">{hours}h</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Estimated total pay</span>
                  <span className="text-xl font-bold text-primary">{formatNaira(totalKobo)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-2">
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
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      </PageContainer>

      {/* Sticky publish bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="hidden flex-1 sm:block">
            <p className="text-xs text-muted-foreground">You pay upfront via Paystack</p>
            <p className="text-sm font-bold text-primary">{formatNaira(totalKobo)}</p>
          </div>
          <Button type="button" size="lg" className="w-full sm:w-auto" onClick={handlePublish} disabled={paying}>
            <Rocket className="size-4" aria-hidden="true" />
            {paying ? 'Processing…' : 'Publish job'}
            {!paying && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showSummary}
        title="Confirm payment"
        message={
          totalKobo > 0
            ? `You'll be charged ${formatNaira(totalKobo)} now for this job (${hours}h). The ${COMMISSION_RATE * 100}% platform fee is deducted from the professional's payout of ${formatNaira(calculateNet(totalKobo))}, not added on top.`
            : ''
        }
        confirmLabel="Confirm & pay"
        busy={paying}
        onConfirm={handleConfirmPay}
        onCancel={() => setShowSummary(false)}
      />
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

export default PostShift;
