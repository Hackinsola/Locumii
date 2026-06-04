import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ShiftCard from '@/components/shifts/ShiftCard';
import { FCT_CITIES } from '@/constants/options';
import { useOpenShifts } from '@/hooks/useShifts';
import { nairaToKobo } from '@/utils/money';

const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
const EMPTY_FILTERS = { city: '', role: '', date: '', minPay: '' };

function ShiftFeed() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { shifts, loading, error, hasMore, loadMore } = useOpenShifts({
    city: filters.city,
    role: filters.role,
    date: filters.date,
    minPayKobo: Number(filters.minPay) > 0 ? nairaToKobo(filters.minPay) : undefined,
  });

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <PageContainer>
        <PageHeader title="Open shifts" subtitle="Browse and bid on available shifts." />

        <div className="flex flex-col gap-2">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            <Input
              name="minPay"
              type="number"
              min="0"
              step="1000"
              placeholder="Min pay (₦)"
              value={filters.minPay}
              onChange={handleFilterChange}
              aria-label="Filter by minimum pay in Naira"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="self-start text-sm text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">Could not load shifts.</p>}
        {!loading && !error && shifts.length === 0 && (
          <EmptyState icon={SearchX}>
            No open shifts match your filters. Check back soon.
          </EmptyState>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {shifts.map((shift) => (
            <Link key={shift.id} to={`/professional/shifts/${shift.id}`} className="block">
              <ShiftCard shift={shift} />
            </Link>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && hasMore && (
          <Button variant="outline" className="self-center" onClick={loadMore}>
            Load more
          </Button>
        )}
    </PageContainer>
  );
}

export default ShiftFeed;
