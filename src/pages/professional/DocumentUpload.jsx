import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ACCEPTED_DOC_MIME_TYPES, CREDENTIAL_DOC_TYPES } from '@/constants/options';
import { validateFileUpload } from '@/utils/validators';
import { useUploadCredential } from '@/hooks/useCredentials';
import PageContainer from '@/components/layout/PageContainer';

function DocumentUpload() {
  const navigate = useNavigate();
  const { uploadCredential } = useUploadCredential();
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(docType, event) {
    const file = event.target.files?.[0] ?? null;
    setFiles((prev) => ({ ...prev, [docType]: file }));
    setErrors((prev) => ({ ...prev, [docType]: validateFileUpload(file) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = {};
    CREDENTIAL_DOC_TYPES.forEach(({ value }) => {
      nextErrors[value] = validateFileUpload(files[value]);
    });
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    for (const { value, label } of CREDENTIAL_DOC_TYPES) {
      const { error } = await uploadCredential({ docType: value, file: files[value] });
      if (error) {
        setSubmitError(`Could not upload your ${label}. ${error.message ?? ''}`.trim());
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
    navigate('/');
  }

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Upload your credentials</CardTitle>
          <CardDescription>
            All three documents are required. An admin reviews them before you can bid — accepted
            formats: PDF, PNG, or JPEG, up to 10 MB each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {CREDENTIAL_DOC_TYPES.map(({ value, label }) => (
              <div key={value} className="flex flex-col gap-1.5">
                <label htmlFor={value} className="text-sm font-medium text-foreground">
                  {label}
                </label>
                <Input
                  id={value}
                  name={value}
                  type="file"
                  accept={ACCEPTED_DOC_MIME_TYPES.join(',')}
                  onChange={(event) => handleFileChange(value, event)}
                  aria-invalid={Boolean(errors[value])}
                />
                {errors[value] && <p className="text-sm text-destructive">{errors[value]}</p>}
              </div>
            ))}

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Submit documents'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default DocumentUpload;
