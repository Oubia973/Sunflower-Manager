import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FloatingIslandCard from "./FloatingIslandCard";

const schedule = [{ startAt: 1000, endAt: 3000 }, { startAt: 5000, endAt: 7000 }];
test("game status follows today's actual claims including zero-amount rewards and timer stays below the bar", () => {
  const now = Date.UTC(2026, 8, 27, 18);
  const games = [{ game: "love_push", name: "Lover's Push", img: "./icon/ui/love_rock.png" }, { game: "love_kraken", name: "Love Kraken", img: "./icon/tools/fishing_rod.png" }];
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(<FloatingIslandCard schedule={[]} games={games} gamesDay="2026-09-27" prizeClaims={[
    { game: "love_push", claimedAt: now - 1000, amount: 0 },
    { game: "love_kraken", claimedAt: now - 86400000 },
    { game: "love_kraken", claimedAt: now + 1000 },
  ]} now={now} formatRemaining={String} />);
  const statuses = node.querySelectorAll(".home-floating-island-game-status");
  expect(statuses).toHaveLength(2);
  expect(statuses[0].getAttribute("src")).toContain("confirm.png");
  expect(statuses[1].getAttribute("src")).toContain("cancel.png");
  expect(node.querySelector('[role="progressbar"]').nextElementSibling.className).toBe("home-power-skill-time");
});

test("old game selection is hidden after UTC midnight until farm data refreshes", () => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(<FloatingIslandCard schedule={[]} games={[{ game: "love_push" }]} gamesDay="2026-09-26" now={Date.UTC(2026, 8, 27)} formatRemaining={String} />);
  expect(node.querySelectorAll(".home-floating-island-game")).toHaveLength(0);
});
const render = (now, visits = schedule) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(<FloatingIslandCard schedule={visits} now={now} formatRemaining={(ms) => `${ms}ms`} />);
  return node;
};

test.each([
  [2000, "Closes in 1000ms", 50],
  [4000, "Opens in 1000ms", 50],
  [1500, "Closes in 1500ms", 25],
  [2500, "Closes in 500ms", 75],
  [5000, "Closes in 2000ms", 0],
  [3000, "Closes in 1ms", 100],
])("Floating Island follows visit and waiting boundaries at %s", (now, label, progress) => {
  const node = render(now);
  expect(node.querySelector(".home-floating-island").getAttribute("aria-label")).toBe(`Floating Island: ${label}`);
  expect(node.querySelector('[role="progressbar"]').getAttribute("aria-valuenow")).toBe(String(progress));
  expect(node.querySelector("img").getAttribute("src")).toContain("floating_island.webp");
});

test("missing or exhausted schedule does not claim the island is ready", () => {
  for (const visits of [undefined, [null, { startAt: 2, endAt: 1 }], schedule]) {
    const node = render(8000, visits);
    expect(node.querySelector(".home-power-skill-time").textContent).toBe("—");
    expect(node.querySelector(".home-floating-island").getAttribute("aria-label")).toContain("Schedule unavailable");
  }
});

test("future-only schedule estimates absence from the next scheduled interval", () => {
  const node = render(500, [...schedule].reverse());
  expect(node.querySelector('[role="progressbar"]').getAttribute("aria-valuenow")).toBe("75");
  expect(node.querySelector(".home-power-skill-time").textContent).toBe("500ms");
  expect(node.querySelector(".home-floating-island").title).toContain("Bar estimate");
});

test("one future visit shows an indeterminate bar rather than a false zero", () => {
  const node = render(500, [schedule[0]]);
  expect(node.querySelector('[role="progressbar"]').hasAttribute("aria-valuenow")).toBe(false);
  expect(node.querySelector(".home-power-skill-bar-fill").classList.contains("is-indeterminate")).toBe(true);
  expect(node.querySelector(".home-power-skill-time").textContent).toBe("500ms");
});

test("known previous departure takes precedence over future interval estimates", () => {
  const node = render(4000, [...schedule, { startAt: 10000, endAt: 11000 }]);
  expect(node.querySelector('[role="progressbar"]').getAttribute("aria-valuenow")).toBe("50");
  expect(node.querySelector(".home-floating-island").title).not.toContain("Bar estimate");
});

test.each([
  [4000, 10, "Opens in 9000ms"],
  [8000, 50, "Opens in 5000ms"],
  [12000, 90, "Opens in 1000ms"],
  [13000, 0, "Closes in 4000ms"],
  [14000, 25, "Closes in 3000ms"],
  [16000, 75, "Closes in 1000ms"],
])("Floating Island uses the entire absence or availability duration at %s", (now, progress, label) => {
  const node = render(now, [{ startAt: 1000, endAt: 3000 }, { startAt: 13000, endAt: 17000 }]);
  const bar = node.querySelector('[role="progressbar"]');
  expect(bar.getAttribute("aria-valuenow")).toBe(String(progress));
  expect(parseFloat(node.querySelector(".home-power-skill-bar-fill").style.width)).toBeCloseTo(progress);
  expect(bar.getAttribute("aria-valuetext")).toBe(label);
});
