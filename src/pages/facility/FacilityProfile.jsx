import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RatingStars from '@/components/profile/RatingStars';
import RatingList from '@/components/profile/RatingList';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { useFacilityProfile } from '@/hooks/useProfile';
import { useUserRatings } from '@/hooks/useRatings';
import { FACILITY_TYPES } from '@/constants/options';
import { formatDate } from '@/utils/dateTime';
import PageContainer from '@/components/layout/PageContainer';

const FACILITY_TYPE_LABELS = Object.fromEntries(
  FACILITY_TYPES.map((item) => [item.value, item.label])
);

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

function FacilityProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { profile, loading, error } = useFacilityProfile(userId);
  const { ratings, loading: ratingsLoading } = useUserRatings(userId);

  const typeLabel = profile?.facility_type
    ? FACILITY_TYPE_LABELS[profile.facility_type] ?? profile.facility_type
    : null;
  const location = profile ? [profile.city, profile.state].filter(Boolean).join(', ') : null;

  return (
    <PageContainer>
        <Button variant="outline" className="self-start" onClick={() => navigate(-1)}>
          Back
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load this profile.</p>}
        {!loading && !error && !profile && (
          <p className="text-sm text-muted-foreground">This facility has no profile yet.</p>
        )}

        {profile && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{profile.facility_name}</CardTitle>
                  <VerifiedBadge verified={profile.is_verified} />
                </div>
                {typeLabel && <p className="text-sm text-muted-foreground">{typeLabel}</p>}
                <RatingStars value={profile.avg_rating} reviewCount={ratings.length} />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {location && <DetailRow label="Location" value={location} />}
                {profile.address && <DetailRow label="Address" value={profile.address} />}
                {profile.contact_name && (
                  <DetailRow label="Contact" value={profile.contact_name} />
                )}
                <DetailRow label="Member since" value={formatDate(profile.created_at)} />
              </CardContent>
            </Card>

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

export default FacilityProfile;
