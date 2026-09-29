import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AdminTooltipContent from "./AdminTooltipContent.jsx";
import { fetchJson } from "../services/apiClient.js";

jest.mock("../services/apiClient.js", () => ({ fetchJson: jest.fn() }));
const value = { view: { adminConfig: {
  labels: { vipPanel: "VIP panel", validate: "Validate", checking: "Checking", validatedFarm: "Farm: " },
  messages: { farmIdRequired: "Farm required", vipValidationFailed: "Validation failed" },
  actionIds: ["summary", "import", "delete", "unused", "checkVip", "addVip", "addVip3", "removeVip"],
} } };
let root, container, admin;
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockReset(); admin = jest.fn().mockResolvedValue({ result: { active: true } });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(<AdminTooltipContent value={value} onAdminFetch={admin} API_URL="" />));
  const panel = [...container.querySelectorAll("button")].find(button => button.textContent.includes("VIP panel"));
  await act(async () => panel.click());
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function validate(inputValue) {
  const input = container.querySelector('input[placeholder="farm id ou username"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, inputValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const button = [...container.querySelectorAll("button")].find(entry => entry.textContent === "Validate");
  await act(async () => button.click());
}
test("numeric VIP target bypasses farm calculation lookup", async () => {
  await validate("901");
  expect(fetchJson).not.toHaveBeenCalled();
  expect(admin).toHaveBeenCalledWith({ action: "checkVip", farmId: 901 }, true);
  expect(container.textContent).toContain("Farm: 901");
});
test.each([
  { frmid: 901, username: "Synthetic" },
  { farmData: { _id: 901, username: "Synthetic" } },
  { result: { farmId: 901 } },
])("username lookup accepts existing response shape %j", async response => {
  fetchJson.mockResolvedValue(response);
  await validate(" Synthetic ");
  expect(fetchJson).toHaveBeenCalledWith("", "/getfarm", {
    method: "POST", credentials: "include", body: { frmid: "Synthetic" },
  });
  expect(admin).toHaveBeenCalledWith({ action: "checkVip", farmId: 901 }, true);
});
test("invalid resolved farm prevents the subsequent admin request", async () => {
  fetchJson.mockResolvedValue({ frmid: 0 });
  await validate("Synthetic");
  expect(admin).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Unable to resolve VIP farm");
});
test("lookup error is displayed without submitting an admin request", async () => {
  fetchJson.mockRejectedValue(new Error("offline"));
  await validate("Synthetic");
  expect(admin).not.toHaveBeenCalled();
  expect(container.textContent).toContain("offline");
});
