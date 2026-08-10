import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BoostTooltipDetails from "./BoostTooltipDetails.jsx";
import { buildBoostTooltipContract, buildPetYieldTooltipContract } from "./boostTooltipContract.js";

test("selects backend Active/Try references without filtering boost tables", () => {
  const index = {
    catalog: {
      Beaver: { name: "Beaver", img: "beaver.png", boost: "-50% time" },
      Scarecrow: { name: "Scarecrow", img: "scarecrow.png", boost: "+1 yield" },
    },
    items: { Wood: { active: { time: ["Beaver"] }, try: { time: ["Scarecrow"] } } },
    xpExtras: [],
  };
  const contract = buildBoostTooltipContract(index, "Wood", { img: "wood.png" }, "try", "timechg");
  expect(contract.rows.map((row) => row.name)).toEqual(["Scarecrow"]);
  const html = renderToStaticMarkup(<BoostTooltipDetails contract={contract} fallbackImage="na.png" />);
  expect(html).toContain("Wood time");
  expect(html).toContain("scarecrow.png");
});

test("combines yield, time and cost references already resolved by the backend", () => {
  const index = {
    catalog: {
      A: { name: "A", boost: "yield" }, B: { name: "B", boost: "time" }, C: { name: "C", boost: "cost" },
    },
    items: { Sunflower: { active: { yield: ["A"], time: ["B"], cost: ["C"] } } },
  };
  const contract = buildBoostTooltipContract(index, "Sunflower", { myield: 2, harvestnode: 3 }, "active", "yield");
  expect(contract.rows.map((row) => row.name)).toEqual(["A", "B", "C"]);
  expect(contract.yieldValue).toBe(2);
});

test("normalizes an authoritative Pets yield detail into display rows", () => {
  const contract = buildPetYieldTooltipContract(
    { totalYield: 2, details: [{ n: "Base", a: 1 }, { n: "Pet perk", a: 1 }] },
    "Acorn", "acorn.png", {}, "na.png", "xp.png",
  );
  expect(contract.rows).toEqual([{ name: "Pet perk", image: "xp.png", boost: "+1 yield" }]);
});
