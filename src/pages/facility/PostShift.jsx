import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { FCT_CITIES } from '@/constants/options';
import { usePostPaidShift } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { openPaystackPopup } from '@/lib/paystack';
import { calculateCommission, calculateNet, formatNaira, nairaToKobo } from '@/utils/money';
import { COMMISSION_RATE } from '@/constants/fees';
import PageContainer from '@/components/layout/PageContainer';

const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

function PostShift() {
  const navigate = useNavigate();
  const { postPaidShift, loading: paying } = usePostPaidShift();
  const { email } = useAuth();
  const [form, setForm] = useState({
    roleRequired: '',
    startTime: '',
    endTime: '',
    payRate: '',
    city: '',
    requirements: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const next = {};
    if (form.roleRequired.trim().length === 0) {
      next.roleRequired = 'Describe the role needed.';
    }
    if (!form.startTime) {
      next.startTime = 'Select a start time.';
    } else if (new Date(form.startTime) < new Date()) {
      next.startTime = 'Start time must be in the future.';
    }
    if (!form.endTime) {
      next.endTime = 'Select an end time.';
    } else if (form.startTime && new Date(form.endTime) <= new Date(form.startTime)) {
      next.endTime = 'End time must be after the start time.';
    }
    if (!(Number(form.payRate) > 0)) {
      next.payRate = 'Enter a pay rate greater than zero.';
    }
    if (!FCT_CITIES.includes(form.city)) {
      next.city = 'Select a location.';
    }
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    // Show the payment summary before opening Paystack.
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
    const grossKobo = nairaToKobo(form.payRate);
    const reference = `locumii-${crypto.randomUUID()}`;
    const draft = {
      roleRequired: form.roleRequired.trim(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      payRateKobo: grossKobo,
      requirements: form.requirements.trim(),
      city: form.city,
    };
    try {
      openPaystackPopup({
        email,
        amountKobo: grossKobo,
        reference,
        onSuccess: (response) => finalisePostedShift(response?.reference ?? reference, draft),
        onClose: () => setSubmitError('Payment cancelled — your shift was not posted.'),
      });
    } catch (caught) {
      setSubmitError(caught.message ?? 'Could not open the payment window.');
    }
  }

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Post a shift</CardTitle>
          <CardDescription>
            You pay for the shift upfront via Paystack. Verified professionals can then bid on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="roleRequired" className="text-sm font-medium text-foreground">
                Role needed
              </label>
              <Input
                id="roleRequired"
                name="roleRequired"
                placeholder="e.g. Locum Doctor — General Practice"
                value={form.roleRequired}
                onChange={handleChange}
                aria-invalid={Boolean(errors.roleRequired)}
              />
              {errors.roleRequired && (
                <p className="text-sm text-destructive">{errors.roleRequired}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="startTime" className="text-sm font-medium text-foreground">
                Start
              </label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                value={form.startTime}
                onChange={handleChange}
                aria-invalid={Boolean(errors.startTime)}
              />
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="endTime" className="text-sm font-medium text-foreground">
                End
              </label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                value={form.endTime}
                onChange={handleChange}
                aria-invalid={Boolean(errors.endTime)}
              />
              {errors.endTime && <p className="text-sm text-destructive">{errors.endTime}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="payRate" className="text-sm font-medium text-foreground">
                Pay rate (₦)
              </label>
              <Input
                id="payRate"
                name="payRate"
                type="number"
                min="0"
                step="100"
                placeholder="Amount in Naira, e.g. 50000"
                value={form.payRate}
                onChange={handleChange}
                aria-invalid={Boolean(errors.payRate)}
              />
              {errors.payRate && <p className="text-sm text-destructive">{errors.payRate}</p>}
              {Number(form.payRate) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Platform fee ({COMMISSION_RATE * 100}%):{' '}
                  <span className="font-mono">
                    {formatNaira(calculateCommission(nairaToKobo(form.payRate)))}
                  </span>{' '}
                  · the professional receives{' '}
                  <span className="font-mono">
                    {formatNaira(calculateNet(nairaToKobo(form.payRate)))}
                  </span>
                </p>
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
              <label htmlFor="requirements" className="text-sm font-medium text-foreground">
                Special requirements <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="requirements"
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                placeholder="e.g. Must have BLS certification."
              />
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={paying}>
              {paying ? 'Processing payment…' : 'Review & pay'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={showSummary}
        title="Confirm payment"
        message={
          Number(form.payRate) > 0
            ? `You'll be charged ${formatNaira(nairaToKobo(form.payRate))} now for this shift. The ${COMMISSION_RATE * 100}% platform fee is deducted from the professional's payout, not added on top.`
            : ''
        }
        confirmLabel="Confirm & pay"
        busy={paying}
        onConfirm={handleConfirmPay}
        onCancel={() => setShowSummary(false)}
      />
    </PageContainer>
  );
}

export default PostShift;
