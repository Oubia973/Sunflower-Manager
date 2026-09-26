import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PanelTable from "./PanelTable";
import { useAppCtx } from "../context/AppCtx";

jest.mock("../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("./Inv", () => function MockClassicInventory() { return <div>Classic inventory</div>; });
jest.mock("./InvReadable", () => function MockModernInventory() { return <div>Modern inventory</div>; });

const previousFlag = process.env.REACT_APP_INV_MODERN;
afterAll(() => { process.env.REACT_APP_INV_MODERN = previousFlag; });

test.each([
  [undefined, "compact", "Classic inventory"],
  ["0", "compact", "Classic inventory"],
  ["1", "classic", "Classic inventory"],
  ["1", "compact", "Modern inventory"],
])("Inv requires both the flag %s and mode %s", (flag, mode, expected) => {
  if (flag === undefined) delete process.env.REACT_APP_INV_MODERN;
  else process.env.REACT_APP_INV_MODERN = flag;
  useAppCtx.mockReturnValue({ ui: { selectedInv: "inv", interfaceMode: mode } });
  expect(renderToStaticMarkup(<PanelTable />)).toContain(expected);
});
