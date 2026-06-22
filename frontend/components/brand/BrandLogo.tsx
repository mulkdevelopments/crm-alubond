import Image from 'next/image';

import { cn } from '@/lib/utils';

const MARK_SIZES = {
  sm: 32,
  md: 36,
  lg: 48,
  xl: 80,
} as const;

function brandMarkSources(size: keyof typeof MARK_SIZES) {
  if (size === 'sm') {
    return {
      light: '/brand/logo-mark-sm.png',
      dark: '/brand/logo-mark-light-sm.png',
    };
  }

  return {
    light: '/brand/logo-mark.png',
    dark: '/brand/logo-mark-light.png',
  };
}

type BrandMarkProps = {
  size?: keyof typeof MARK_SIZES;
  className?: string;
  priority?: boolean;
};

export function BrandMark({ size = 'md', className, priority = false }: BrandMarkProps) {
  const px = MARK_SIZES[size];
  const sources = brandMarkSources(size);

  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: px, height: px }}
    >
      <Image
        src={sources.light}
        alt=""
        fill
        priority={priority}
        sizes={`${px}px`}
        aria-hidden
        className="object-contain dark:hidden"
      />
      <Image
        src={sources.dark}
        alt=""
        fill
        priority={priority}
        sizes={`${px}px`}
        aria-hidden
        className="hidden object-contain dark:block"
      />
    </span>
  );
}

type BrandLogoProps = {
  markSize?: keyof typeof MARK_SIZES;
  className?: string;
  priority?: boolean;
  showWordmark?: boolean;
};

export function BrandLogo({
  markSize = 'lg',
  className,
  priority = false,
  showWordmark = true,
}: BrandLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={markSize} priority={priority} />
      {showWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="font-bold tracking-tight text-[var(--text)]">Alubond</span>
          <span className="text-[10px] text-3 mt-0.5 tracking-wider uppercase whitespace-nowrap">
            Sales Intelligence
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function AuthBrandHeader({ priority = false }: { priority?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <BrandMark size="xl" priority={priority} />
      <div className="flex flex-col items-center leading-none">
        <span className="text-xl font-bold tracking-tight text-[var(--text)]">Alubond</span>
        <span className="text-[11px] text-3 mt-1 tracking-wider uppercase">Sales Intelligence</span>
      </div>
    </div>
  );
}
