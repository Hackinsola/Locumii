// Paystack inline popup initialisation. Third-party client init only — no business
// logic. The inline script is loaded via index.html (window.PaystackPop). The
// public key is safe to expose in the browser; the secret key lives only in the
// release-payment / verify-payment Edge Functions, never here.

const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

// Opens the Paystack inline popup to collect a payment. `amountKobo` is an integer
// in kobo (Paystack's unit). onSuccess receives the Paystack response (with the
// reference); onClose fires if the user dismisses the popup without paying.
export function openPaystackPopup({ email, amountKobo, reference, onSuccess, onClose }) {
  if (!publicKey) {
    throw new Error('Paystack is not configured (missing VITE_PAYSTACK_PUBLIC_KEY).');
  }
  if (!window.PaystackPop) {
    throw new Error('Paystack inline script has not loaded yet.');
  }
  const handler = window.PaystackPop.setup({
    key: publicKey,
    email,
    amount: amountKobo,
    ref: reference,
    currency: 'NGN',
    callback: (response) => onSuccess(response),
    onClose: () => onClose(),
  });
  handler.openIframe();
}
