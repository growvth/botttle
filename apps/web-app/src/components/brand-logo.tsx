import { BotttleMark } from '@botttle/ui';

type BrandLogoProps = {
  className?: string;
};

/** Theme-colored logo mark (decorative next to “botttle” text). */
export function BrandLogo({ className }: BrandLogoProps) {
  return <BotttleMark className={className} aria-hidden="true" />;
}
