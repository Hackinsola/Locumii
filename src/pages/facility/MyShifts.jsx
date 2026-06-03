import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFacilityShifts } from '@/hooks/useShifts';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

function MyShifts() {
  const navigate = useNavigate();
  const { shifts, loading, error } = useFacilityShifts();

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-medium text-foreground">Your shifts</h1>
            <p className="text-sm text-muted-foreground">Manage bids on the shifts you’ve posted.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/facility/post-shift')}>
              Post a shift
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Home
            </Button>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load your shifts.</p>}
        {!loading && !error && shifts.length === 0 && (
          <p className="text-sm text-muted-foreground">You haven’t posted any shifts yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {shifts.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">{shift.role_required}</h3>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {formatNaira(shift.pay_rate_naira)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {shift.city} · <span className="capitalize">{shift.status}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatShiftRange(shift.start_time, shift.end_time)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 self-start"
                  onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}
                >
                  Manage bids
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyShifts;
