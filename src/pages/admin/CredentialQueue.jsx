import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import PageHeader from '@/components/layout/PageHeader';
import { CREDENTIAL_DOC_TYPES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { usePendingCredentials, useReviewCredential } from '@/hooks/useAdminCredentials';
import PageContainer from '@/components/layout/PageContainer';

const DOC_LABELS = Object.fromEntries(CREDENTIAL_DOC_TYPES.map((item) => [item.value, item.label]));
const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);

// Group flat credential rows by professional so each card shows one person's docs.
function groupByProfessional(credentials) {
  const map = new Map();
  for (const credential of credentials) {
    const profile = Array.isArray(credential.professional_profiles)
      ? credential.professional_profiles[0]
      : credential.professional_profiles;
    const group = map.get(credential.professional_id) ?? {
      professionalId: credential.professional_id,
      fullName: profile?.full_name ?? 'Unknown professional',
      specialty: profile?.specialty ?? null,
      isVerified: Boolean(profile?.is_verified),
      docs: [],
    };
    group.docs.push(credential);
    map.set(credential.professional_id, group);
  }
  return Array.from(map.values());
}

function CredentialQueue() {
  const { credentials, loading, error, refetch } = usePendingCredentials();
  const { reviewCredential, verifyProfessional, getDocumentUrl, loading: acting } =
    useReviewCredential();

  const groups = useMemo(() => groupByProfessional(credentials), [credentials]);

  async function handleView(storagePath) {
    const { url } = await getDocumentUrl(storagePath);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleReview(credentialId, status) {
    const { error: reviewError } = await reviewCredential(credentialId, status);
    if (!reviewError) {
      refetch();
    }
  }

  async function handleVerify(professionalId) {
    const { error: verifyError } = await verifyProfessional(professionalId);
    if (!verifyError) {
      refetch();
    }
  }

  return (
    <PageContainer>
        <PageHeader title="Credential review" subtitle="Documents awaiting approval." />

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">Could not load the review queue.</p>
        )}
        {!loading && !error && groups.length === 0 && (
          <p className="text-sm text-muted-foreground">No credentials are awaiting review.</p>
        )}

        {groups.map((group) => (
          <Card key={group.professionalId}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <InitialsAvatar name={group.fullName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{group.fullName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {group.specialty
                        ? SPECIALTY_LABELS[group.specialty] ?? group.specialty
                        : 'Professional'}
                    </span>
                    {group.isVerified && <VerifiedBadge verified />}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {group.docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm text-foreground">
                    {DOC_LABELS[doc.doc_type] ?? doc.doc_type}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleView(doc.storage_path)}>
                      View
                    </Button>
                    <Button size="sm" onClick={() => handleReview(doc.id, 'approved')} disabled={acting}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(doc.id, 'rejected')}
                      disabled={acting}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="mt-1 self-start"
                onClick={() => handleVerify(group.professionalId)}
                disabled={acting || group.isVerified}
              >
                {group.isVerified ? 'Professional verified' : 'Mark professional verified'}
              </Button>
            </CardContent>
          </Card>
        ))}
    </PageContainer>
  );
}

export default CredentialQueue;
