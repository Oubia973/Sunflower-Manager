import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ChatbotMarkdown from "./ChatbotMarkdown.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("uses the backend item image and keeps the name when the image fails", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(<ChatbotMarkdown role="assistant" content="[[item:Kale|/icon/res/kale.png]]" />);
  });
  expect(container.querySelector("img")?.getAttribute("src")).toContain("/icon/res/kale.png");
  expect(container.textContent).toContain("Kale");
  act(() => {
    container.querySelector("img").dispatchEvent(new Event("error"));
  });
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toContain("Kale");
  act(() => root.unmount());
});

test("shows the current currency name if its icon fails", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<ChatbotMarkdown role="assistant" content="[[item:SFL|/icon/res/flowertoken.webp|iconOnly]]" />));
  act(() => container.querySelector("img").dispatchEvent(new Event("error")));
  expect(container.textContent).toContain("FLOWER");
  act(() => root.unmount());
});

test("keeps item markers with underscores in image paths intact", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<ChatbotMarkdown role="assistant" content="Use **[[item:Iron Hustle|/icon/skillr/iron_hustle.png]]** and [[item:Gold|/icon/res/gold_ore.png]]." />));
  const images = [...container.querySelectorAll("img")];
  expect(images).toHaveLength(2);
  expect(images[0].getAttribute("src")).toContain("/icon/skillr/iron_hustle.png");
  expect(images[1].getAttribute("src")).toContain("/icon/res/gold_ore.png");
  expect(container.textContent).toBe("Use Iron Hustle and Gold.");
  act(() => root.unmount());
});
