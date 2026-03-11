interface PageHeroProps {
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt?: string;
  children?: React.ReactNode;
}

export function PageHero({ title, subtitle, imageSrc, imageAlt, children }: PageHeroProps) {
  return (
    <div className="relative h-40 overflow-hidden" data-testid={`hero-${imageAlt?.toLowerCase().replace(/\s/g, "-") || "page"}`}>
      <img
        src={imageSrc}
        alt={imageAlt || title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(152,40%,18%/0.9)] via-[hsl(152,35%,22%/0.8)] to-[hsl(152,30%,25%/0.6)]" />
      <div className="relative z-10 h-full flex items-center px-8">
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-white/75 text-sm max-w-lg">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="shrink-0 flex gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
