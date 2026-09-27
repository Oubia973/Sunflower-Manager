import { imgfloatingIsland, imgconfirm, imgcancel } from "../../constants/images.js";
import "./floating-island-card.css";

export default function FloatingIslandCard({ schedule, games, gamesDay, prizeClaims, now, formatRemaining }) {
  const today = new Date(now).toISOString().slice(0, 10);
  const todayGames = gamesDay === today && Array.isArray(games) ? games : [];
  const claimedToday = new Set((Array.isArray(prizeClaims) ? prizeClaims : [])
    .filter((claim) => Number.isFinite(claim?.claimedAt) && claim.claimedAt <= now && new Date(claim.claimedAt).toISOString().slice(0, 10) === today)
    .map((claim) => claim.game));
  const visits = (Array.isArray(schedule) ? schedule : [])
    .filter((entry) => Number.isFinite(entry?.startAt) && Number.isFinite(entry?.endAt) && entry.startAt > 0 && entry.endAt > entry.startAt)
    .slice().sort((a, b) => a.startAt - b.startAt);
  const active = visits.find(({ startAt, endAt }) => now >= startAt && now <= endAt);
  const next = visits.find(({ startAt }) => startAt > now);
  const previous = visits.filter(({ endAt }) => endAt < now).at(-1);
  const target = active?.endAt ?? next?.startAt;
  const from = active?.startAt ?? previous?.endAt;
  const following = next && visits.find(({ startAt }) => startAt > next.endAt);
  const estimatedWait = !active && !previous && next && following ? following.startAt - next.endAt : 0;
  const totalMs = target && from ? target - from : estimatedWait;
  const hasProgress = totalMs > 0;
  const progress = hasProgress ? Math.max(0, Math.min(100, (1 - (target - now) / totalMs) * 100)) : 0;
  const remaining = target ? formatRemaining(Math.max(1, target - now)) : "—";
  const label = target ? `${active ? "Closes" : "Opens"} in ${remaining}` : "Schedule unavailable";

  return (
    <div className={`home-floating-island ${active ? "is-ready" : "is-cooling"}`} title={`Floating Island\n${label}${estimatedWait ? "\nBar estimate based on the next scheduled interval" : ""}`} aria-label={`Floating Island: ${label}`}>
      <div className="home-floating-island-heading">
        <img src={imgfloatingIsland} alt="Floating Island" className="home-power-skill-icon" />
        {todayGames.map((game) => {
          const done = claimedToday.has(game.game);
          const status = done ? "Reward claimed today (UTC)" : "Reward not claimed today (UTC)";
          return (
            <span className="home-floating-island-game" key={game.game} title={`${game.name}: ${status}`}>
              <img src={game.img} alt={game.name} className="home-power-skill-icon" />
              <img src={done ? imgconfirm : imgcancel} alt={status} className="home-floating-island-game-status" />
            </span>
          );
        })}
      </div>
      <div className="home-power-skill-bar" role="progressbar" aria-label={active ? "Floating Island visit elapsed" : "Floating Island wait elapsed"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasProgress ? Math.round(progress) : undefined} aria-valuetext={label}>
        <span className={`home-power-skill-bar-fill${target && !hasProgress ? " is-indeterminate" : ""}`} style={{ width: `${target && !hasProgress ? 100 : progress}%` }} />
      </div>
      <span className="home-power-skill-time">{remaining}</span>
    </div>
  );
}
