import { type I18n } from '@lingui/core';
import { Img, Text } from 'react-email';
import { emailBrand } from 'src/utils/email-brand';

const logoStyle = {
  marginBottom: '40px',
};

type LogoProps = {
  i18n: I18n;
};

export const Logo = (_props: LogoProps) => {
  const brand = emailBrand();
  const initials = brand.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toLocaleUpperCase();

  return brand.logo ? (
    <Img
      src={brand.logo}
      alt={brand.name}
      width="40"
      height="40"
      style={logoStyle}
    />
  ) : <Text style={logoStyle} aria-label={brand.name}>{initials}</Text>;
};
