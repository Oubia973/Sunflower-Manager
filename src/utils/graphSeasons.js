import { imgwinterPath, imgspringPath, imgsummerPath, imgautumnPath } from "../constants/images.js";

const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];
export const SEASON_STYLES = Object.fromEntries([
  ["spring", imgspringPath, "104, 179, 91"],
  ["summer", imgsummerPath, "230, 185, 59"],
  ["autumn", imgautumnPath, "205, 120, 54"],
  ["winter", imgwinterPath, "87, 168, 224"],
].map(([season, icon, rgb]) => [season, {
  icon,
  fillStart: `rgba(${rgb}, 0.18)`,
  fillEnd: `rgba(${rgb}, 0.04)`,
  line: `rgba(${rgb}, 0.34)`,
}]));

export function getSeasonAtMonday(cursorMs, currentSeason, currentMondayMs) {
  const normalizedSeason = SEASON_ORDER.includes(currentSeason) ? currentSeason : "spring";
  const weekOffset = Math.round((cursorMs - currentMondayMs) / 604_800_000);
  const seasonIndex = ((SEASON_ORDER.indexOf(normalizedSeason) + weekOffset) % 4 + 4) % 4;
  return SEASON_ORDER[seasonIndex];
}

function startOfMondayUTC(time) {
  const date = new Date(time);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.getTime();
}

export function getMondaySeasonMarkers(start, end, currentSeason, now = Date.now()) {
  const markers = [];
  const currentMonday = startOfMondayUTC(now);
  let time = startOfMondayUTC(start);
  if (time < start) time += 604_800_000;
  for (; time <= end; time += 604_800_000) {
    const season = getSeasonAtMonday(time, currentSeason, currentMonday);
    markers.push({ time, season, ...SEASON_STYLES[season] });
  }
  return markers;
}
