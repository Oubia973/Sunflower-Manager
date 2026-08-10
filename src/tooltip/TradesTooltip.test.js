import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TradesTooltip from "./TradesTooltip.jsx";
import { buildTradesTooltipContract } from "./tradesTooltipContract.js";

test("builds trade rows and net totals from trades plus backend header metadata", () => {
  const contract = buildTradesTooltipContract({
    a: { items: { Wood: 2 }, sfl: 1, fulfilledAt: 123, createdAt: "2026-01-01T00:00:00Z" },
  }, [{ name: "Wood", img: "wood.png", floor: 0.2, category: "resources", netRate: 0.9 }]);
  expect(contract.rows[0].marketPrice).toBe(0.4);
  expect(contract.rows[0].marketDiffPercent).toBeCloseTo(150, 12);
  expect(contract.totals[0].soldPriceNet).toBe(0.9);
  const html = renderToStaticMarkup(<TradesTooltip contract={contract} />);
  expect(html).toContain("wood.png");
  expect(html).toContain("150.00%");
  expect(html).toContain("Resources");
});

test("uses header-only rows without reading item tables", () => {
  const contract = buildTradesTooltipContract(null, [{ name: "Bear", img: "bear.png", fulfilledAt: 1 }]);
  const html = renderToStaticMarkup(<TradesTooltip contract={contract} />);
  expect(html).toContain("Bear");
  expect(html).toContain("bear.png");
});
