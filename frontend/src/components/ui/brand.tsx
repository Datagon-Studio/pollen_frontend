import { cn } from "@/lib/utils";

type BrandSymbolProps = {
  className?: string;
  alt?: string;
};

type BrandWordmarkProps = {
  className?: string;
  alt?: string;
};

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

type BrandFullLogoProps = {
  className?: string;
  symbolClassName?: string;
  wordmarkClassName?: string;
  alt?: string;
};

export function BrandSymbol({
  className,
  alt = "Pollean logo",
}: BrandSymbolProps) {
  return (
    <img
      src="/logos/Pollean-Symbol-Gold.png"
      alt={alt}
      className={cn("object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}

export function BrandLogo({ className, alt = "Pollean logo" }: BrandLogoProps) {
  return (
    <img
      src="/logos/Pollean-Logo.svg"
      alt={alt}
      className={cn("object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}

export function BrandWordmark({
  className,
  alt = "Pollean",
}: BrandWordmarkProps) {
  return (
    <>
      <img
        src="/logos/Pollean-Wordmark-Black.png"
        alt={alt}
        className={cn("object-contain dark:hidden", className)}
        loading="eager"
        decoding="async"
      />
      <img
        src="/logos/Pollean-Wordmark-White.png"
        alt={alt}
        className={cn("hidden object-contain dark:block", className)}
        loading="eager"
        decoding="async"
      />
    </>
  );
}

export function BrandFullLogo({
  className,
  symbolClassName,
  wordmarkClassName,
  alt = "Pollean",
}: BrandFullLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandSymbol
        className={cn("h-8 w-8 shrink-0", symbolClassName)}
        alt={`${alt} symbol`}
      />
      <BrandWordmark
        className={cn("h-5 w-auto", wordmarkClassName)}
        alt={alt}
      />
    </div>
  );
}
