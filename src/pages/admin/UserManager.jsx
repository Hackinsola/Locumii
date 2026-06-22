import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import ConfirmModal from '@/components/ui/ConfirmModal';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import PageHeader from '@/components/layout/PageHeader';
import { useUsers, useUpdateUserStatus, useCompletedShiftCounts } from '@/hooks/useAdmin';
import { formatDate } from '@/utils/dateTime';
import PageContainer from '@/components/layout/PageContainer';

// Spec 11 admin flag: a professional rated below 3.0 after enough completed shifts.
const FLAG_MIN_RATING = 3.0;
const FLAG_MIN_COMPLETED = 5;

const ROLE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'professional', label: 'Professional' },
  { value: 'facility', label: 'Facility' },
];
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function displayName(user) {
  const professional = single(user.professional_profiles);
  const facility = single(user.facility_profiles);
  return professional?.full_name ?? facility?.facility_name ?? '—';
}

function UserManager() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { users, loading, error, refetch } = useUsers({
    role: roleFilter,
    status: statusFilter,
    search,
    page,
  });
  const { suspendUser, reactivateUser, loading: updating } = useUpdateUserStatus();

  // Completed-shift counts for the professionals on this page, to drive the flag.
  const professionalIds = users.filter((user) => user.role === 'professional').map((user) => user.id);
  const { counts: completedCounts } = useCompletedShiftCounts(professionalIds);

  function isFlagged(user) {
    if (user.role !== 'professional') {
      return false;
    }
    const avg = single(user.professional_profiles)?.avg_rating;
    return (
      avg != null && avg < FLAG_MIN_RATING && (completedCounts[user.id] ?? 0) >= FLAG_MIN_COMPLETED
    );
  }

  function changeRole(value) {
    setRoleFilter(value);
    setPage(0);
  }

  function changeStatus(event) {
    setStatusFilter(event.target.value);
    setPage(0);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  }

  async function handleConfirm() {
    setActionError(null);
    const action = pendingAction.type === 'suspend' ? suspendUser : reactivateUser;
    const { error: updateError } = await action(pendingAction.user.id);
    if (updateError) {
      setActionError(updateError.message ?? 'Could not update this user.');
      setPendingAction(null);
      return;
    }
    setPendingAction(null);
    refetch();
  }

  function viewProfile(user) {
    if (user.role === 'professional') {
      navigate(`/professionals/${user.id}`);
    } else if (user.role === 'facility') {
      navigate(`/facilities/${user.id}`);
    }
  }

  return (
    <PageContainer>
        <PageHeader
          title="Users"
          subtitle="Search, filter, and manage accounts."
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
              Dashboard
            </Button>
          }
        />

        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by email"
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((filter) => (
              <Button
                key={filter.value || 'all'}
                size="sm"
                variant={roleFilter === filter.value ? 'default' : 'outline'}
                onClick={() => changeRole(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
            <select
              value={statusFilter}
              onChange={changeStatus}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value || 'all'} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load users.</p>}
        {!loading && !error && users.length === 0 && (
          <p className="text-sm text-muted-foreground">No users match these filters.</p>
        )}
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar
                    name={displayName(user) === '—' ? user.email : displayName(user)}
                    size="md"
                    tone={user.status === 'suspended' ? 'neutral' : 'brand'}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {displayName(user)}
                      {isFlagged(user) && (
                        <Flag
                          className="size-4 fill-current text-destructive"
                          aria-label="Low rating — review"
                        />
                      )}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="capitalize">{user.role}</span> ·{' '}
                      <span className="capitalize">{user.status}</span> · joined{' '}
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.role !== 'admin' && (
                    <Button size="sm" variant="outline" onClick={() => viewProfile(user)}>
                      View profile
                    </Button>
                  )}
                  {user.role !== 'admin' && user.status !== 'suspended' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingAction({ user, type: 'suspend' })}
                      disabled={updating}
                    >
                      Suspend
                    </Button>
                  )}
                  {user.status === 'suspended' && (
                    <Button
                      size="sm"
                      onClick={() => setPendingAction({ user, type: 'reactivate' })}
                      disabled={updating}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={users.length < 20 || loading}
          >
            Next
          </Button>
        </div>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.type === 'suspend' ? 'Suspend this user?' : 'Reactivate this user?'}
        message={
          pendingAction
            ? pendingAction.type === 'suspend'
              ? `${displayName(pendingAction.user)} will be blocked from using the app until reactivated.`
              : `${displayName(pendingAction.user)} will regain access to the app.`
            : ''
        }
        confirmLabel={pendingAction?.type === 'suspend' ? 'Suspend' : 'Reactivate'}
        isDestructive={pendingAction?.type === 'suspend'}
        busy={updating}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </PageContainer>
  );
}

export default UserManager;
