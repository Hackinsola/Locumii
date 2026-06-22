import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import PageHeader from '@/components/layout/PageHeader';
import { FACILITY_TYPES } from '@/constants/options';
import { usePendingFacilities, useVerifyFacility } from '@/hooks/useAdmin';
import { formatDate } from '@/utils/dateTime';
import PageContainer from '@/components/layout/PageContainer';

const FACILITY_TYPE_LABELS = Object.fromEntries(
  FACILITY_TYPES.map((item) => [item.value, item.label])
);

function FacilityQueue() {
  const navigate = useNavigate();
  const { facilities, loading, error, refetch } = usePendingFacilities();
  const { approveFacility, loading: approving } = useVerifyFacility();
  const [pendingApproval, setPendingApproval] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleConfirmApprove() {
    setActionError(null);
    const { error: approveError } = await approveFacility(pendingApproval.user_id);
    if (approveError) {
      setActionError(approveError.message ?? 'Could not verify this facility.');
      setPendingApproval(null);
      return;
    }
    setPendingApproval(null);
    refetch();
  }

  return (
    <PageContainer>
        <PageHeader
          title="Facility verification"
          subtitle="Clinics awaiting manual verification."
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
              Dashboard
            </Button>
          }
        />

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load the facility queue.</p>}
        {!loading && !error && facilities.length === 0 && (
          <p className="text-sm text-muted-foreground">No facilities are awaiting verification.</p>
        )}
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        {facilities.map((facility) => (
          <Card key={facility.user_id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <InitialsAvatar name={facility.facility_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {facility.facility_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {FACILITY_TYPE_LABELS[facility.facility_type] ?? facility.facility_type} ·{' '}
                      {facility.city}
                    </span>
                    <VerifiedBadge pending />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">CAC: {facility.cac_number}</p>
              <p className="text-sm text-muted-foreground">
                {facility.contact_name}
                {facility.contact_phone ? ` · ${facility.contact_phone}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted {formatDate(facility.created_at)}
              </p>
              <Button
                className="mt-1 self-start"
                onClick={() => setPendingApproval(facility)}
                disabled={approving}
              >
                Verify facility
              </Button>
            </CardContent>
          </Card>
        ))}

      <ConfirmModal
        isOpen={Boolean(pendingApproval)}
        title="Verify this facility?"
        message={
          pendingApproval
            ? `Mark ${pendingApproval.facility_name} as verified. They will be able to post shifts.`
            : ''
        }
        confirmLabel="Verify"
        busy={approving}
        onConfirm={handleConfirmApprove}
        onCancel={() => setPendingApproval(null)}
      />
    </PageContainer>
  );
}

export default FacilityQueue;
