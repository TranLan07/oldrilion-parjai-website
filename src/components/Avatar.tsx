type Props = {
  src?: string | null;
  name: string;
  size?: number;
  color?: string;
  className?: string;
};

// Avatar rond : image uploadée si disponible, sinon initiale colorée (fallback historique).
export default function Avatar({ src, name, size = 32, color, className = "" }: Props) {
  const style = {
    width: size, height: size,
    background: src ? undefined : `${color ?? "#c9a84c"}20`,
    color: color ?? "#c9a84c",
    fontFamily: "var(--font-display)",
    fontSize: Math.max(10, size * 0.4),
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} style={style} />
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold ${className}`} style={style}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
