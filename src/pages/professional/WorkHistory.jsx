import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Clock, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ShiftCard from '@/components/shifts/ShiftCard';
import EmptyState from '@/components/ui/EmptyState';
import StatTile from '@/components/ui/StatTile';
import PageContainer from '@/components/layout/PageContainer';
import { useProfessionalBids } from '@/hooks/useBids';
import { shiftDurationHours } from '@/utils/dateTime';

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function WorkHistory() {
  const navigate = useNavigate();
  const { bids, loading, error } = useProfessionalBids();

  // Completed shifts the professional actually worked: accepted bid + completed shift.
  const completed = bids
    .filter((bid) => {
      const shift = single(bid.shifts);
      return bid.status === 'accepted' && shift?.status === 'completed';
    })
    .sort((a, b) => {
      const aStart = single(a.shifts)?.start_time ?? '';
      const bStart = single(b.shifts)?.start_time ?? '';
      return bStart.localeCompare(aStart); // most recent first
    });

  const totalHours = completed.reduce((sum, bid) => {
    const shift = single(bid.shifts);
    return sum + shiftDurationHours(shift.start_time, shift.end_time);
  }, 0);
  const clinics = new Set(
    completed.map((bid) => single(single(bid.shifts)?.facility_profiles)?.facility_name).filter(Boolean)
  ).size;

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate('/professional/profile')}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Profile
      </button>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">Work history</h1>

      <Card>
        <CardContent className="grid grid-cols-3 divide-x divide-border">
          <StatTile icon={History} value={completed.length} label="Shifts" />
          <StatTile icon={Clock} value={`${Math.round(totalHours)}h`} label="Hours" />
          <StatTile icon={Building2} value={clinics} label="Clinics" />
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your work history.</p>}
      {!loading && !error && completed.length === 0 && (
        <EmptyState icon={Building2}>
          No completed shifts yet. Your work history builds up as you finish shifts.
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {completed.map((bid) => {
          const shift = single(bid.shifts);
          return (
            <button
              key={bid.id}
              type="button"
              onClick={() => navigate(`/professional/shifts/${shift.id}`)}
              className="block w-full text-left"
            >
              <ShiftCard shift={shift} badge />
            </button>
          );
        })}
      </div>
    </PageContainer>
  );
}

export default WorkHistory;
