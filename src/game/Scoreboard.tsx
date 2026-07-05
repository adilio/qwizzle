import type { Stats } from "../engine";

export function Scoreboard({ stats }: { stats: Stats }) {
  const items: Array<[string, number]> = [
    ["Score", stats.score],
    ["Played", stats.played],
    ["Wins", stats.won],
    ["Streak", stats.streak],
    ["Best", stats.best],
  ];
  return (
    <section className="scoreboard" aria-label="Player stats">
      {items.map(([label, value]) => (
        <div key={label} className="score">
          <span className="score__label">{label}</span>
          <span className="score__value">{value}</span>
        </div>
      ))}
    </section>
  );
}
