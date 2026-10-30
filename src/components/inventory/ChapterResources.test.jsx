import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChapterResources from "./ChapterResources.jsx";

jest.mock("../../fct.js", () => ({ frmtNb: value => String(value) }));

test("chapter stock displays exact quantities without invented costs or absent items", () => {
  const markup = renderToStaticMarkup(<ChapterResources
    inventory={{ Mud: 12, "Pig Bristles": 3, "Green Beetle": 0, Potato: 25 }}
    items={{ Mud: { cat: "chapter", img: "mud.webp", cost: null }, "Pig Bristles": { cat: "chapter", img: "bristles.webp" }, "Green Beetle": { cat: "chapter" }, Potato: { cat: "crop" } }}
  />);
  expect(markup).toContain("Mud: 12");
  expect(markup).toContain("Pig Bristles: 3");
  expect(markup).not.toContain("Green Beetle");
  expect(markup).not.toContain("Potato");
  expect(markup).not.toContain("cost");
  expect(renderToStaticMarkup(<ChapterResources inventory={{ Mud: 0 }} items={{ Mud: { cat: "chapter" } }} />)).toBe("");
});
