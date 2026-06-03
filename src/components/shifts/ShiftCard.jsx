import { Card, CardContent } from '@/components/ui/card';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

// Dumb presentational card for one shift. Receives a shift row (with the facility
// embedded) and renders it — no data fetching, no navigation.
function ShiftCard({ shift }) {
  const facility = Array.isArray(shift.facility_profiles)
    ? shift.facility_profiles[0]
    : shift.facility_profiles;

  return (
    <Card className="transition-shadow hover:ring-foreground/20">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">{shift.role_required}</h3>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatNaira(shift.pay_rate_naira)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {facility?.facility_name ?? 'Facility'} · {shift.city}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatShiftRange(shift.start_time, shift.end_time)}
        </p>
      </CardContent>
    </Card>
  );
}

export default ShiftCard;
