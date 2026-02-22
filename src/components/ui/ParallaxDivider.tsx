interface ParallaxDividerProps {
  imageUrl: string;
  height?: string;
  overlay?: string;
}

export function ParallaxDivider({
  imageUrl,
  height = 'h-32 sm:h-48',
  overlay = 'bg-gradient-to-r from-secondary-500/60 via-primary-500/40 to-secondary-500/60',
}: ParallaxDividerProps) {
  return (
    <div className={`relative overflow-hidden ${height}`}>
      {/* Fixed background — image stays still, page scrolls over it */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  );
}
