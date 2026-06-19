import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Duration of a dice tumble; games delay token movement by this. */
export const ROLL_MS = 850;

const PIPS: Record<number, number[]> = {
  1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
};

/**
 * A die that visibly *rolls* — it tumbles and flickers through faces for
 * ~850ms whenever `rollId` changes, then settles on `value`.
 */
export function Dice({ value, rollId, size = 56, className }: { value: number | null; rollId?: number | string; size?: number; className?: string }) {
  const [face, setFace] = useState(value && value >= 1 && value <= 6 ? value : 1);
  const [rolling, setRolling] = useState(false);
  const controls = useAnimationControls();
  const firstRoll = useRef(true);

  useEffect(() => {
    if (rollId === undefined || value == null) return;
    // Skip the very first mount roll only when there's no real value yet.
    if (firstRoll.current && value == null) { firstRoll.current = false; return; }
    firstRoll.current = false;

    setRolling(true);
    const flick = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    void controls.start({
      rotateX: [0, 220, 480, 680, 900],
      rotateZ: [0, 160, 300, 420, 540],
      scale: [1, 1.12, 0.96, 1.06, 1],
      transition: { duration: ROLL_MS / 1000, ease: 'easeOut' },
    });
    const done = setTimeout(() => {
      clearInterval(flick);
      setFace(value);
      setRolling(false);
      void controls.start({ rotateX: 0, rotateZ: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 12 } });
    }, ROLL_MS);
    return () => { clearInterval(flick); clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  // Keep a static die in sync when not rolling.
  useEffect(() => { if (!rolling && value && value >= 1 && value <= 6) setFace(value); }, [value, rolling]);

  const pips = PIPS[face] ?? [];
  return (
    <div style={{ perspective: 500, width: size, height: size }} className={cn('shrink-0', className)}>
      <motion.div
        animate={controls}
        className="grid h-full w-full place-content-center rounded-xl bg-gradient-to-br from-white to-zinc-200"
        style={{ boxShadow: rolling ? '0 10px 22px -6px rgba(0,0,0,0.55)' : '0 4px 10px -3px rgba(0,0,0,0.4)', transformStyle: 'preserve-3d' }}
      >
        <div className="grid grid-cols-3 gap-[3px] p-2" style={{ width: size, height: size }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={cn('m-auto rounded-full', pips.includes(i + 1) ? 'bg-zinc-800' : 'bg-transparent')}
              style={{ width: size * 0.14, height: size * 0.14, boxShadow: pips.includes(i + 1) ? 'inset 0 1px 1px rgba(0,0,0,0.5)' : undefined }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
