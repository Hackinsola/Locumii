import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Uploads one credential document to the private `credentials` bucket and records
// it in the credentials table as `pending`. Storage RLS requires the object's
// first path segment to be the user's id, so the path is {userId}/{docType}/{name}.
export function useUploadCredential() {
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadCredential = useCallback(
    async ({ docType, file }) => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          throw new Error('You must be signed in to upload documents.');
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${userId}/${docType}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('credentials')
          .upload(storagePath, file, { upsert: true, contentType: file.type });
        if (uploadError) {
          throw uploadError;
        }

        const { error: insertError } = await supabase.from('credentials').insert({
          professional_id: userId,
          doc_type: docType,
          storage_path: storagePath,
          status: 'pending',
        });
        if (insertError) {
          throw insertError;
        }

        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { uploadCredential, loading, error };
}
