import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InvReadableTable from "./InvReadable";

jest.mock("./Inv", () => function MockInventory({ dashboardPreview }) {
  return <div data-dashboard-preview={dashboardPreview ? "yes" : "no"}>Complete inventory table</div>;
});

test("modern inventory reuses the complete table with the item dashboard enabled", () => {
  const html = renderToStaticMarkup(<InvReadableTable />);
  expect(html).toContain('data-dashboard-preview="yes"');
  expect(html).toContain("Complete inventory table");
});
