import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PanelTable from "./PanelTable";
import { useAppCtx } from "../context/AppCtx";

jest.mock("../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("./Inv", () => function MockClassicInventory() { return <div>Classic inventory</div>; });
jest.mock("./InvReadable", () => function MockModernInventory() { return <div>Modern inventory</div>; });

test.each([
  ["classic", "Classic inventory"],
  ["compact", "Modern inventory"],
])("Inv follows interface mode %s", (mode, expected) => {
  useAppCtx.mockReturnValue({ ui: { selectedInv: "inv", interfaceMode: mode } });
  expect(renderToStaticMarkup(<PanelTable />)).toContain(expected);
});
