import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Toggle from '@/components/ui/Toggle';
import SelectChip from '@/components/ui/SelectChip';
import SectionLabel from '@/components/ui/SectionLabel';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useProfessionalProfile, useSaveAvailability } from '@/hooks/useProfile';
import { normalizeSchedule, WEEK_DAYS } from '@/utils/availability';
import { FCT_CITIES } from '@/constants/options';
import { cn } from '@/lib/utils';

function Availability() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { profile, loading, error: profileError } = useProfessionalProfile(userId);
  const { saveAvailability, loading: saving } = useSaveAvailability();

  const [available, setAvailable] = useState(true);
  const [schedule, setSchedule] = useState(() => normalizeSchedule({}));
  const [areas, setAreas] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Seed local form state once the profile loads (one-way sync from the fetch).
  useEffect(() => {
    if (!profile) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setAvailable(profile.available_for_locum ?? true);
    setSchedule(normalizeSchedule(profile.availability));
    setAreas(profile.preferred_cities ?? []);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  function toggleDay(key) {
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], on: !prev[key].on } }));
    setSaved(false);
  }

  function setTime(key, field, value) {
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSaved(false);
  }

  function toggleArea(city) {
    setAreas((prev) =>
      prev.includes(city) ? prev.filter((item) => item !== city) : [...prev, city]
    );
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    for (const day of WEEK_DAYS) {
      const value = schedule[day.key];
      if (value.on && value.start >= value.end) {
        setError(`Invalid time window for ${day.label}: start time must be before end time.`);
        return;
      }
    }

    const { error: saveError } = await saveAvailability({
      availableForLocum: available,
      availability: schedule,
      preferredCities: areas,
    });
    if (saveError) {
      setError(saveError.message ?? 'Could not save your availability. Please try again.');
      return;
    }
    setSaved(true);
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/professional/profile')}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Profile
        </button>
        <h1 className="text-base font-bold text-foreground">Availability</h1>
        <Button size="sm" onClick={handleSave} disabled={saving || loading || profileError}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Master toggle */}
      <Card>
        <CardContent className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Available for locum</p>
            <p className="text-xs text-muted-foreground">
              Turn off to hide your profile from job listings.
            </p>
          </div>
          <Toggle
            checked={available}
            onChange={(value) => {
              setAvailable(value);
              setSaved(false);
            }}
            label="Available for locum"
          />
        </CardContent>
      </Card>

      {/* Weekly schedule */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Weekly schedule</SectionLabel>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {WEEK_DAYS.map((day) => {
              const value = schedule[day.key];
              return (
                <div key={day.key} className="flex items-center gap-2.5 py-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    aria-pressed={value.on}
                    aria-label={`${day.label} ${value.on ? 'available' : 'unavailable'}`}
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                      value.on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-transparent'
                    )}
                  >
                    {value.on && <Check className="size-4" aria-hidden="true" />}
                  </button>
                  <span
                    className={cn(
                      'w-20 shrink-0 truncate text-sm font-medium',
                      value.on ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {day.label}
                  </span>
                  {value.on ? (
                    <div className="flex flex-1 items-center justify-end gap-1.5">
                      <input
                        type="time"
                        value={value.start}
                        onChange={(event) => setTime(day.key, 'start', event.target.value)}
                        className="w-[5.25rem] rounded-lg bg-muted px-1.5 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={value.end}
                        onChange={(event) => setTime(day.key, 'end', event.target.value)}
                        className="w-[5.25rem] rounded-lg bg-muted px-1.5 py-1 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-right text-sm text-muted-foreground">Unavailable</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Preferred areas */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Preferred areas</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {FCT_CITIES.map((city) => (
            <SelectChip key={city} selected={areas.includes(city)} onClick={() => toggleArea(city)}>
              {city}
            </SelectChip>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-status-success">Availability saved.</p>}

      <Button size="lg" className="w-full" onClick={handleSave} disabled={saving || loading || profileError}>
        {saving ? 'Saving…' : 'Save availability'}
      </Button>
    </PageContainer>
  );
}

export default Availability;
