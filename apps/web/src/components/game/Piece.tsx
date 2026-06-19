import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Layered radial gradients that turn a flat colour into a glossy 3D sphere. */
export function discBackground(base: string): string {
  return [
    'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9), rgba(255,255,255,0) 42%)',
    'radial-gradient(circle at 70% 82%, rgba(0,0,0,0.45), rgba(0,0,0,0) 55%)',
    base,
  ].join(', ');
}

export function GamePiece({
  color,
  size,
  selected,
  label,
  className,
  style,
}: {
  color: string;
  size: number | string;
  selected?: boolean;
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('flex items-center justify-center rounded-full', selected && 'ring-[3px] ring-white', className)}
      style={{
        width: size,
        height: size,
        background: discBackground(color),
        boxShadow: '0 5px 9px -2px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.25)',
        ...style,
      }}
    >
      {label}
    </div>
  );
}
