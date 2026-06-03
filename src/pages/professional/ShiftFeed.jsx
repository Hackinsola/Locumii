import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShiftCard from '@/components/shifts/ShiftCard';
import { FCT_CITIES } from '@/constants/options';
import { useOpenShifts } from '@/hooks/useShifts';

const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function ShiftFeed() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ city: '', role: '', date: '' });
  const { shifts, loading, error } = useOpenShifts(filters);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-foreground">Open shifts</h1>
            <p className="text-sm text-muted-foreground">Browse and bid on available shifts.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Home
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <select
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
            className={selectClasses}
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {FCT_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <Input
            name="role"
            placeholder="Role contains…"
            value={filters.role}
            onChange={handleFilterChange}
            aria-label="Filter by role"
          />
          <Input
            name="date"
            type="date"
            value={filters.date}
            onChange={handleFilterChange}
            aria-label="Filter by date"
          />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load shifts.</p>}
        {!loading && !error && shifts.length === 0 && (
          <p className="text-sm text-muted-foreground">No open shifts match your filters.</p>
        )}

        <div className="flex flex-col gap-3">
          {shifts.map((shift) => (
            <Link key={shift.id} to={`/professional/shifts/${shift.id}`} className="block">
              <ShiftCard shift={shift} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShiftFeed;
