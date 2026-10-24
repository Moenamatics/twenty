import { type I18n } from '@lingui/core';
import { Font, Head } from 'react-email';

import { canvasTheme } from 'src/common-style';
import { emailBrand } from 'src/utils/email-brand';

type BaseHeadProps = {
  i18n: I18n;
};

export const BaseHead = (_props: BaseHeadProps) => {
  return (
    <Head>
      <title>{emailBrand().name}</title>
      <Font
        fontFamily={canvasTheme.font.family}
        fallbackFontFamily="sans-serif"
        fontStyle="normal"
        fontWeight={canvasTheme.font.weight.regular}
      />
    </Head>
  );
};
