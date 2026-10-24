import { type I18n } from '@lingui/core';
import { Container } from 'react-email';
import { Link } from 'src/components/Link';
import { ShadowText } from 'src/components/ShadowText';
import { emailBrand } from 'src/utils/email-brand';

type FooterProps = { i18n: I18n };

export const Footer = (_props: FooterProps) => {
  const brand = emailBrand();

  return (
    <Container style={{ marginTop: '12px' }}>
      <ShadowText><Link href={brand.url} value={brand.name} aria-label={brand.name} /></ShadowText>
    </Container>
  );
};
