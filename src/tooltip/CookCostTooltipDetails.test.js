import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CookCostTooltipDetails from "./CookCostTooltipDetails.jsx";

test("renders only the backend cost tree selected for the current season", () => {
  const calls = [];
  const setCompoTable = (name, quantity, options) => {
    calls.push({ name, quantity, options });
    return { table: <div>{options.label}</div> };
  };
  const seasonalCostTree = {
    spring: { nodes: { Sunflower: { qty: 1 } } },
    summer: { nodes: { Tomato: { qty: 1 } } },
    autumn: { nodes: { Pumpkin: { qty: 1 } } },
    winter: { nodes: { Kale: { qty: 1 } } },
  };
  const html = renderToStaticMarkup(<CookCostTooltipDetails
    contracts={[{ itemName: "Seasonal Soup", itemImage: "soup.png", seasonalCostTree }]}
    quantity={3}
    season="autumn"
    initialSeason="spring"
    renderSeasonButtons={() => <div>seasons</div>}
    setCompoTable={setCompoTable}
    fallbackImage="na.png"
  />);

  expect(calls[0].quantity).toBe(3);
  expect(calls[0].options.costTree).toBe(seasonalCostTree.autumn);
  expect(calls[0].options.img).toBe("soup.png");
  expect(html).toContain("Seasonal Soup - Autumn");
  expect(html).toContain("seasons");
});

test("does not rebuild a missing recipe from frontend tables", () => {
  const html = renderToStaticMarkup(<CookCostTooltipDetails
    contracts={[{ itemName: "Unknown Food" }]}
    quantity={1}
    setCompoTable={() => ({ table: null })}
  />);
  expect(html).toContain("Unknown Food: cost details unavailable");
});
