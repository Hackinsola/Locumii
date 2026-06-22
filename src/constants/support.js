// Support contact endpoints for the Help & Support action sheet. Centralised so the
// address/number is changed in one place. The WhatsApp number is in international
// format without the leading "+" (wa.me requirement).
export const SUPPORT_EMAIL = 'support@locumii.com';
export const SUPPORT_PHONE = '+2347062426582';
export const SUPPORT_WHATSAPP_NUMBER = '2347062426582';
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`;
export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE}`;
