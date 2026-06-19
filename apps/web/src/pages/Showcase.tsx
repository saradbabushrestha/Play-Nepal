import { getEngine, GAME_CATALOG, type MatchSnapshot } from '@play-nepal/shared';
import { GameView } from '@/games/GameView';
import { Card } from '@/components/ui';
import { emojiFor } from '@/pages/Landing';

const ME = 'me';
const OP = 'op';

function slots(n: number) {
  const ids = [ME, OP, 'p3', 'p4'];
  return Array.from({ length: n }, (_, i) => ({
    seat: i, playerId: ids[i]!, userId: ids[i]!, displayName: i === 0 ? 'You' : `P${i + 1}`, isAI: i > 0,
  }));
}

/** Build a representative mid-game state per game (valid shape via the engine). */
const SINGLE = ['2048', 'minesweeper', 'sudoku', 'number-puzzle', 'memory-challenge', 'word-search', 'langur-burja', 'gatti'];

function buildState(gameId: string): { state: unknown; turn: string } {
  const eng = getEngine(gameId)!;
  const n = gameId === 'mafia' || gameId === 'werewolf' ? 6
    : gameId === 'spin-the-wheel' || gameId === 'snakes-ladders' || gameId === 'ludo' || gameId === 'most-likely-to' ? 4
    : gameId === 'charades' || gameId === 'heads-up' || gameId === 'meme-battle' || gameId === 'guess-the-employee' || gameId === 'draw-and-guess' ? 3
    : SINGLE.includes(gameId) ? 1 : 2;
  const s: any = eng.createInitialState(slots(n), { seed: 12345 });

  switch (gameId) {
    case 'tic-tac-toe':
      s.board = ['X', 'O', 'X', null, 'O', null, null, null, null]; s.turn = 'X'; break;
    case 'connect-4':
      s.board[38] = 'R'; s.board[39] = 'Y'; s.board[31] = 'R'; s.board[32] = 'Y'; s.board[24] = 'R'; s.turn = 'Y'; break;
    case 'baghchal':
      s.phase = 'movement'; s.goatsPlaced = 20; s.goatsCaptured = 2;
      s.board = s.board.map(() => 'EMPTY');
      [0, 4, 12, 24].forEach((i: number) => (s.board[i] = 'TIGER'));
      [2, 6, 7, 8, 10, 11, 13, 16, 17, 18, 21, 22].forEach((i: number) => (s.board[i] = 'GOAT'));
      s.turn = 'TIGER'; break;
    case 'checkers': break; // initial board is already full & handsome
    case 'reversi':
      s.board[20] = 'B'; s.board[26] = 'W'; s.board[29] = 'B'; s.turn = 'B'; break;
    case 'gomoku':
      [112, 113, 128, 97, 96].forEach((i, k) => (s.board[i] = k % 2 ? 'W' : 'B'));
      s.lastMove = 96; s.turn = 'B'; break;
    case 'dots-and-boxes':
      s.hEdges[0] = true; s.hEdges[5] = true; s.vEdges[0] = true; s.vEdges[1] = true; s.owner[0] = 0;
      s.hEdges[1] = true; s.vEdges[6] = true; s.scores = [1, 0]; break;
    case 'snakes-ladders':
      s.positions = [38, 14, 6, 21]; s.lastRoll = 4; s.lastJump = { from: 36, to: 44, kind: 'ladder' }; break;
    case 'ludo':
      s.tokens = [[0, 7, -1, 56], [13, -1, 20, -1], [26, 30, -1, -1], [-1, -1, 47, 5]];
      s.phase = 'move'; s.pendingRoll = 6; s.lastRoll = 6; break;
    case '2048':
      s.board = [2, 4, 8, 16, 0, 2, 4, 0, 0, 0, 32, 64, 2, 0, 0, 128]; s.score = 1240; s.best = 128; break;
    case 'memory-match':
      s.cards = s.cards.map((_: number, i: number) => (i < 4 ? [3, 7, 3, 1][i] : -1));
      s.matched = s.matched.map((_: boolean, i: number) => i === 0 || i === 2);
      s.flipped = [1]; s.scores = [2, 1]; break;
    case 'chess': {
      const r1 = eng.applyMove(s, { from: 52, to: 36 }, ME); // 1. e4
      if (r1.ok) { const r2 = eng.applyMove(r1.state, { from: 12, to: 28 }, OP); Object.assign(s, r2.ok ? r2.state : r1.state); }
      break;
    }
    case 'minesweeper': {
      const r = eng.applyMove(s, { type: 'reveal', index: 30 }, ME);
      if (r.ok) Object.keys(r.state as object).forEach((k) => (s[k] = (r.state as any)[k]));
      break;
    }
    case 'langur-burja': {
      const r = eng.applyMove(s, { symbol: 0, amount: 100 }, ME); // solo → rolls immediately
      if (r.ok) Object.keys(r.state as object).forEach((k) => (s[k] = (r.state as any)[k]));
      break;
    }
    case 'virtual-bingo': {
      for (let i = 0; i < 12; i++) { const r = eng.applyMove(s, { type: 'call' }, ME); if (r.ok) Object.keys(r.state as object).forEach((k) => (s[k] = (r.state as any)[k])); }
      // mark a few that were called
      const called = new Set(s.callOrder.slice(0, s.callIndex));
      s.cards[ME].forEach((num: number, cell: number) => { if (cell !== 12 && called.has(num)) s.marked[ME][cell] = true; });
      break;
    }
    case 'most-likely-to': { s.votes[0] = { me: 'p3', op: 'p3', p3: 'me', p4: 'p3' }; break; }
    default: break; // sudoku / number-puzzle / memory-challenge / reaction / quiz / math render initial
  }
  const turn = eng.currentTurn(s) ?? ME;
  return { state: s, turn };
}

function snapshotFor(gameId: string): { snap: MatchSnapshot; me: string } {
  const { state, turn } = buildState(gameId);
  return {
    me: ME,
    snap: {
      matchId: 'demo', roomId: 'demo', gameId, state, turn, result: null, version: 1,
      seats: [
        { seat: 0, playerId: ME, userId: ME, displayName: 'You', isAI: false },
        { seat: 1, playerId: OP, userId: OP, displayName: 'AI', isAI: true },
      ],
    },
  };
}

const ALL_LIVE = GAME_CATALOG.filter((g) => g.status === 'live').map((g) => g.id);

export function Showcase() {
  const only = new URLSearchParams(window.location.search).get('only');
  const LIVE = only ? ALL_LIVE.filter((id) => id === only) : ALL_LIVE;
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">🎨 Game Showcase</h1>
        <p className="text-muted-foreground">All {ALL_LIVE.length} live boards with sample positions (dev gallery).</p>
      </div>
      <div className={only ? 'mx-auto max-w-xl' : 'grid gap-6 lg:grid-cols-2'}>
        {LIVE.map((gameId) => {
          const { snap, me } = snapshotFor(gameId);
          const meta = GAME_CATALOG.find((g) => g.id === gameId)!;
          return (
            <Card key={gameId} className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">{emojiFor(gameId)}</span>
                <h2 className="text-lg font-bold">{meta.name}</h2>
              </div>
              <GameView gameId={gameId} snapshot={snap} myPlayerId={me} onMove={() => {}} pending={false} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
