import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FishTable from "./Fish.jsx";
import { useAppCtx } from "../context/AppCtx";

jest.mock("../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("../dlist.jsx", () => () => null);

function context(tryChecked, tryMultiplier = 0.8) {
  const bait = { cat: "Bait", img: "/bait.webp", quant: 0, bait: "", chum: "", chumimgs: "", weather: "", period: "" };
  return {
    data: {
      dataSet: { options: { coinsRatio: 1000 } }, priceData: [1, 1, 1],
      dataSetFarm: {
        Fish: { agingSlots: 1, agingTimeMultiplier: 1, agingTimeMultipliertry: tryMultiplier },
        itables: {
          fish: {
            Earthworm: bait, Grub: bait, "Red Wiggler": bait,
            Anchovy: { cat: "Basic fish", img: "/anchovy.webp", bait: "", chum: "", chumimgs: "", weather: "", period: "", agexp: 10, agexptry: 10, agetime: "10:00:00", salt: 1, myield: 1, myieldtry: 1 },
          },
          crustacean: {}, it: {}, bounty: {}, petit: {}, pfood: {}, tool: {},
        },
      },
    },
    ui: {
      TryChecked: tryChecked, fishView: "fish", fishMode: "aging", selectedSeason: "all",
      selectedQuantFish: "aged", selectedQuantFishXp: "unit", selectedCurr: "SFL",
      xListeColFish: Array.from({ length: 14 }, (_, i) => [String(i), 1]), xListeColCrusta: [],
    },
    img: {}, actions: { handleUIChange: jest.fn(), handleOptionChange: jest.fn(), handleTooltip: jest.fn() },
  };
}

test("Fish aging switches between Active and Try duration multipliers", () => {
  useAppCtx.mockReturnValue(context(false));
  const active = renderToStaticMarkup(<FishTable />);
  useAppCtx.mockReturnValue(context(true));
  const tried = renderToStaticMarkup(<FishTable />);
  expect(active).toContain("10:00:00");
  expect(tried).toContain("08:00:00");
  expect(tried).not.toContain("10:00:00");
});

test("Fish aging can render an older response without a Try multiplier", () => {
  useAppCtx.mockReturnValue(context(true, null));
  expect(renderToStaticMarkup(<FishTable />)).toContain("10:00:00");
});
