import botttleLogoUrl from '@botttle/ui/botttle.svg?url';

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

/** Logo asset from `packages/ui/public/botttle.svg` (via `@botttle/ui` export). */
export function BrandLogo({ className, alt = 'botttle' }: BrandLogoProps) {
  return <img src={botttleLogoUrl} alt={alt} className={className} />;
}
