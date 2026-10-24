import { CLIENT_CONFIG_BOOTSTRAP_ELEMENT_ID } from 'twenty-shared/constants';

import { type ClientConfig } from 'src/engine/core-modules/client-config/client-config.entity';

export const renderFrontendHtml = (
  template: string,
  clientConfig: ClientConfig,
): string => {
  const serializedConfig = JSON.stringify(clientConfig)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const escapeAttribute = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const title = escapeAttribute(process.env.FIRECRM_BRAND_NAME || 'FireCRM');
  const description = escapeAttribute(process.env.FIRECRM_BRAND_DESCRIPTION || process.env.FIRECRM_BRAND_NAME || 'FireCRM');
  const icon = escapeAttribute(process.env.FIRECRM_BRAND_ICON || '/firecrm-icon.svg');
  const branding = `<title>${title}</title><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><link rel="icon" href="${icon}"><link rel="apple-touch-icon" href="${icon}"><link rel="stylesheet" href="/firecrm-token-bridge.css">`;

  return template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["'](?:icon|apple-touch-icon|manifest)["'][^>]*>/gi, '')
    .replace(
      /<!-- BEGIN: Twenty Config -->[\s\S]*?<!-- END: Twenty Config -->/,
      '<script id="twenty-env-config">window._env_ = {};</script>',
    )
    .replace(
      '</head>',
      () =>
        `${branding}<script id="${CLIENT_CONFIG_BOOTSTRAP_ELEMENT_ID}" type="application/json">${serializedConfig}</script></head>`,
    );
};
