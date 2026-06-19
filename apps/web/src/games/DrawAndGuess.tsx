import { useEffect, useRef, useState } from 'react';
import type { DrawAndGuessState, DrawStroke } from '@play-nepal/shared';
import { getSocket } from '@/lib/socket';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const SIZE = 340;
const COLORS = ['#0f172a', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export function DrawAndGuess({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as DrawAndGuessState;
  const roomId = snapshot.roomId;
  const amDrawer = state.players[state.drawer] === myPlayerId;
  const word = state.words[state.wordIndex % state.words.length] ?? '';
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]!);
  const [guess, setGuess] = useState('');

  const ctx = () => canvas.current?.getContext('2d') ?? null;
  const segment = (s: DrawStroke) => {
    const c = ctx(); if (!c) return;
    c.strokeStyle = s.color; c.lineWidth = s.width; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.x0 * SIZE, s.y0 * SIZE); c.lineTo(s.x1 * SIZE, s.y1 * SIZE); c.stroke();
  };

  // Receive strokes + clears from the room.
  useEffect(() => {
    const s = getSocket();
    const onStroke = (st: DrawStroke) => segment(st);
    const onClear = () => ctx()?.clearRect(0, 0, SIZE, SIZE);
    s.on('draw:stroke', onStroke);
    s.on('draw:clear', onClear);
    return () => { s.off('draw:stroke', onStroke); s.off('draw:clear', onClear); };
  }, []);

  // Clear the canvas whenever the word changes.
  useEffect(() => { ctx()?.clearRect(0, 0, SIZE, SIZE); }, [state.wordIndex]);

  const pointer = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };
  const down = (e: React.PointerEvent) => { if (!amDrawer) return; drawing.current = true; last.current = pointer(e); };
  const move = (e: React.PointerEvent) => {
    if (!amDrawer || !drawing.current || !last.current) return;
    const p = pointer(e);
    const stroke: DrawStroke = { x0: last.current.x, y0: last.current.y, x1: p.x, y1: p.y, color, width: 4 };
    segment(stroke);
    getSocket().emit('draw:stroke', { roomId, stroke });
    last.current = p;
  };
  const up = () => { drawing.current = false; last.current = null; };
  const clearBoard = () => { ctx()?.clearRect(0, 0, SIZE, SIZE); getSocket().emit('draw:clear', { roomId }); };

  if (state.finished) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="text-5xl">🎨</div>
        <h3 className="mt-2 text-xl font-bold">Game over!</h3>
        <p className="text-muted-foreground">Your score: {state.scores[myPlayerId] ?? 0}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span>Round {Math.min(state.round + 1, state.totalRounds)}/{state.totalRounds}</span>
        <span className="font-semibold">{amDrawer ? <>Draw: <b className="text-primary">{word}</b></> : `${state.names[state.drawer]} is drawing`}</span>
        <span>Score: <b className="text-primary">{state.scores[myPlayerId] ?? 0}</b></span>
      </div>

      <canvas ref={canvas} width={SIZE} height={SIZE}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className={cn('mx-auto block rounded-xl border border-border bg-white', amDrawer ? 'cursor-crosshair touch-none' : '')} />

      {amDrawer ? (
        <div className="flex items-center justify-center gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-full border-2', color === c ? 'border-primary' : 'border-transparent')} style={{ background: c }} />
          ))}
          <Button size="sm" variant="outline" onClick={clearBoard}>Clear</Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => onMove({ type: 'skip' })}>Skip</Button>
          <Button size="sm" disabled={pending} onClick={() => onMove({ type: 'end' })}>End turn</Button>
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (guess.trim()) { onMove({ type: 'guess', text: guess }); setGuess(''); } }}>
          <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess…" maxLength={40} />
          <Button type="submit" disabled={pending || !guess.trim()}>Guess</Button>
        </form>
      )}

      <div className="max-h-24 space-y-1 overflow-y-auto text-sm">
        {state.recentGuesses.map((g, i) => (
          <div key={i} className={cn(g.correct && 'font-bold text-emerald-400')}>
            <b>{state.names[state.players.indexOf(g.player)]}:</b> {g.correct ? '✅ got it!' : g.text}
          </div>
        ))}
      </div>
    </div>
  );
}
