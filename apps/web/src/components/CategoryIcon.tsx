interface CategoryIconProps {
  name: string | null | undefined;
  size?: number;
}

const FALLBACK_EMOJI = '🪙';

export function CategoryIcon({ name, size = 18 }: CategoryIconProps) {
  return (
    <span
      role="img"
      aria-label="category icon"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {name || FALLBACK_EMOJI}
    </span>
  );
}
