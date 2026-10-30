import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AnimalsReadableTable from "./AnimalsReadable.jsx";
import { useAppCtx } from "../context/AppCtx";

jest.mock("../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("../fct.js", () => ({ frmtNb: value => String(value), ColorValue: () => "inherit", PBar: () => null }));

function context(mode, tryChecked = false, species = "Pig") {
  const it = {
    Truffle: { animal: "Pig", matcat: 1, img: "/icon/chapter16/truffle.webp" },
    "Pig Bristles": { img: "/icon/chapter16/pig_bristles.webp" },
    Egg: { animal: "Chicken", matcat: 1, img: "/egg.png" },
    Feather: { animal: "Chicken", matcat: 2, img: "/feather.png" },
    Corn: { img: "/corn.png" },
  };
  const row = { lvl: 5, yield1: 2, yield1try: 2.6, yield2: species === "Chicken" ? 1 : undefined, food: "Corn", foodtry: "Corn", quantfood: 5, quantfoodtry: 4, costFood: 10, costFoodtry: 8, costyield1: 5, costyield1try: 3 };
  return {
    data: { dataSet: { options: { coinsRatio: 1000 } }, dataSetFarm: {
      Animals: { [species]: { a: row } }, animalsAllLvl: { [species]: { 5: row } },
      itables: { it, mutant: {} }, boostables: { nft: {} },
    } },
    ui: { selectedAnimalLvl: mode, selectedAnimalPettings: 0, TryChecked: tryChecked },
    actions: { handleTooltip: jest.fn() },
    img: { imgchkn: "/chicken.png", imgcow: "/cow.png", imgsheep: "/sheep.png", imgna: "/missing.png" },
  };
}

test.each(["farm", "all"])("compact Animals shows Pig icon and its single Truffle product in %s mode", mode => {
  useAppCtx.mockReturnValue(context(mode));
  const html = renderToStaticMarkup(<AnimalsReadableTable />);
  expect(html).toContain("/icon/res/pig.webp");
  expect(html).toContain('title="Truffle"');
  expect(html).toContain("2.00");
  expect(html).not.toContain("Product 1");
  expect(html).not.toContain("Product 2");
  expect(html).not.toContain('title="Pig Bristles"');
  expect(html).not.toContain('src="/missing.png"');
});

test("compact Animals uses Try output and retains two products for Chicken", () => {
  useAppCtx.mockReturnValue(context("all", true));
  expect(renderToStaticMarkup(<AnimalsReadableTable />)).toContain("2.60");
  useAppCtx.mockReturnValue(context("farm", false, "Chicken"));
  const html = renderToStaticMarkup(<AnimalsReadableTable />);
  expect(html).toContain('title="Egg"');
  expect(html).toContain('title="Feather"');
});
