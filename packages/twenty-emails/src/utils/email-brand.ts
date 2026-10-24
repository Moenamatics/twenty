// Server-side configuration shared by every production system-email template.
export const emailBrand = () => ({
  name: process.env.EMAIL_FROM_NAME || 'FireCRM',
  url: process.env.SERVER_URL || '/',
  logo: process.env.FIRECRM_BRAND_LOGO_URL,
});
