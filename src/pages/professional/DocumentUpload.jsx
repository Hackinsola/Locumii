import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ACCEPTED_DOC_MIME_TYPES, CREDENTIAL_DOC_TYPES } from '@/constants/options';
import { validateFileUpload } from '@/utils/validators';
import { useOwnCredentials, useUploadCredential } from '@/hooks/useCredentials';
import PageContainer from '@/components/layout/PageContainer';
import { cn } from '@/lib/utils';

// Chip per current review status. A doc only needs a (re-)upload when it has
// never been submitted or was rejected.
const STATUS_CHIPS = {
  approved: { label: 'Approved', className: 'bg-status-success-bg text-status-success' },
  pending: { label: 'Under review', className: 'bg-status-warning-bg text-status-warning' },
  rejected: { label: 'Not approved', className: 'bg-destructive/10 text-destructive' },
};

function DocumentUpload() {
  const navigate = useNavigate();
  const { uploadCredential } = useUploadCredential();
  const { credentials, loading: credentialsLoading, refetch } = useOwnCredentials();
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Rows come newest-first, so the first row per doc type is its latest status.
  const latestByType = useMemo(() => {
    const map = {};
    for (const row of credentials) {
      if (!map[row.doc_type]) {
        map[row.doc_type] = row;
      }
    }
    return map;
  }, [credentials]);

  function needsUpload(docType) {
    const status = latestByType[docType]?.status;
    return !status || status === 'rejected';
  }

  const outstanding = CREDENTIAL_DOC_TYPES.filter(({ value }) => needsUpload(value));
  const allSettled = !credentialsLoading && outstanding.length === 0;

  function handleFileChange(docType, event) {
    const file = event.target.files?.[0] ?? null;
    setFiles((prev) => ({ ...prev, [docType]: file }));
    setErrors((prev) => ({ ...prev, [docType]: validateFileUpload(file) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    // Only the missing/rejected documents are required; already-submitted ones
    // (pending or approved) never have to be uploaded again.
    const nextErrors = {};
    outstanding.forEach(({ value }) => {
      nextErrors[value] = validateFileUpload(files[value]);
    });
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    for (const { value, label } of outstanding) {
      const { error } = await uploadCredential({ docType: value, file: files[value] });
      if (error) {
        setSubmitError(`Could not upload your ${label}. ${error.message ?? ''}`.trim());
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    refetch();
    navigate('/');
  }

  const hasRejected = CREDENTIAL_DOC_TYPES.some(
    ({ value }) => latestByType[value]?.status === 'rejected'
  );

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your credential documents</CardTitle>
          <CardDescription>
            {hasRejected
              ? 'One or more documents were not approved — upload a new file for each one marked below.'
              : 'All three documents are required. An admin reviews them before you can bid — accepted formats: PDF, PNG, or JPEG, up to 10 MB each.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {CREDENTIAL_DOC_TYPES.map(({ value, label }) => {
              const status = latestByType[value]?.status;
              const chip = status ? STATUS_CHIPS[status] : null;
              return (
                <div key={value} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={value} className="text-sm font-medium text-foreground">
                      {label}
                    </label>
                    {chip && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          chip.className
                        )}
                      >
                        {chip.label}
                      </span>
                    )}
                  </div>
                  {needsUpload(value) ? (
                    <>
                      <Input
                        id={value}
                        name={value}
                        type="file"
                        accept={ACCEPTED_DOC_MIME_TYPES.join(',')}
                        onChange={(event) => handleFileChange(value, event)}
                        aria-invalid={Boolean(errors[value])}
                      />
                      {errors[value] && <p className="text-sm text-destructive">{errors[value]}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {status === 'approved'
                        ? 'Verified by the Locumii team.'
                        : 'Submitted — an admin will review it shortly.'}
                    </p>
                  )}
                </div>
              );
            })}

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            {allSettled ? (
              <p className="rounded-xl bg-status-success-bg px-4 py-3 text-sm text-status-success">
                All documents are in. You can head back to your dashboard while we review them.
              </p>
            ) : (
              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting || credentialsLoading}>
                {submitting ? 'Uploading…' : 'Submit documents'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default DocumentUpload;
