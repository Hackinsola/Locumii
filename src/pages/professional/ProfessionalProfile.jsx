import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RatingStars from '@/components/profile/RatingStars';
import RatingList from '@/components/profile/RatingList';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { useProfessionalProfile } from '@/hooks/useProfile';
import { useProfessionalCredentials, useCredentialDocumentUrl } from '@/hooks/useCredentials';
import { useUserRatings } from '@/hooks/useRatings';
import { CREDENTIAL_DOC_TYPES, PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { formatDate } from '@/utils/dateTime';
import PageContainer from '@/components/layout/PageContainer';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);
const DOC_LABELS = Object.fromEntries(CREDENTIAL_DOC_TYPES.map((item) => [item.value, item.label]));

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function ProfessionalProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile, loading, error } = useProfessionalProfile(userId);
  const { credentials } = useProfessionalCredentials(userId);
  const { getDocumentUrl } = useCredentialDocumentUrl();
  const { ratings, loading: ratingsLoading } = useUserRatings(userId);
  const [documentError, setDocumentError] = useState(null);

  async function handleViewDocument(storagePath) {
    setDocumentError(null);
    const { url, error: urlError } = await getDocumentUrl(storagePath);
    if (urlError || !url) {
      setDocumentError('Could not open this document. Please try again.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const specialtyLabel = profile?.specialty
    ? SPECIALTY_LABELS[profile.specialty] ?? profile.specialty
    : null;
  const preferredCities =
    profile?.preferred_cities && profile.preferred_cities.length > 0
      ? profile.preferred_cities.join(', ')
      : null;

  return (
    <PageContainer>
        <Button variant="outline" className="self-start" onClick={() => navigate(-1)}>
          Back
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load this profile.</p>}
        {!loading && !error && !profile && (
          <p className="text-sm text-muted-foreground">This professional has no profile yet.</p>
        )}

        {profile && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                  <VerifiedBadge verified={profile.is_verified} />
                </div>
                {specialtyLabel && (
                  <p className="text-sm text-muted-foreground">{specialtyLabel}</p>
                )}
                <RatingStars value={profile.avg_rating} reviewCount={ratings.length} />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <DetailRow
                  label="Experience"
                  value={`${profile.years_experience} year${profile.years_experience === 1 ? '' : 's'}`}
                />
                {preferredCities && <DetailRow label="Preferred locations" value={preferredCities} />}
                {profile.bio && <DetailRow label="About" value={profile.bio} />}
                <DetailRow label="Member since" value={formatDate(profile.created_at)} />
              </CardContent>
            </Card>

            {/* Only rendered when RLS returned rows: the owner, an admin, or a
                facility this professional has a live bid with. */}
            {credentials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Credentials</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Documents verified by the Locumii team.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {credentials.map((credential) => (
                    <div
                      key={credential.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-foreground">
                          {DOC_LABELS[credential.doc_type] ?? credential.doc_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Approved
                          {credential.expires_at
                            ? ` · expires ${formatDate(credential.expires_at)}`
                            : ''}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocument(credential.storage_path)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  {documentError && <p className="text-sm text-destructive">{documentError}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                {ratingsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading ratings…</p>
                ) : (
                  <RatingList ratings={ratings} />
                )}
              </CardContent>
            </Card>
          </>
        )}
    </PageContainer>
  );
}

export default ProfessionalProfile;
