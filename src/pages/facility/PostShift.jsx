import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FCT_CITIES } from '@/constants/options';
import { useCreateShift } from '@/hooks/useShifts';
import { nairaToKobo } from '@/utils/money';

const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20';

function PostShift() {
  const navigate = useNavigate();
  const { createShift, loading } = useCreateShift();
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

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const { error } = await createShift({
      roleRequired: form.roleRequired.trim(),
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      payRateKobo: nairaToKobo(form.payRate),
      requirements: form.requirements.trim(),
      city: form.city,
    });
    if (error) {
      setSubmitError(
        'Could not post the shift. Make sure your facility profile is complete, then try again.'
      );
      return;
    }
    navigate('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Post a shift</CardTitle>
          <CardDescription>
            Verified professionals can bid on open shifts. Payment is collected in a later step.
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

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? 'Posting…' : 'Post shift'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PostShift;
