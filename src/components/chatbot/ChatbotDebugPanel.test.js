import { buildActivitySteps, parseDebugStatus } from "./ChatbotDebugPanel.jsx";

describe("ChatbotDebugPanel activity presentation", () => {
  test("groups technical statuses into readable activity steps", () => {
    const steps = buildActivitySteps([
      "Thinking: Analysing the question",
      "Context: Selecting the relevant route, sources, and tools",
      "Data: inventory, crops",
      "Docs: local 240c | wiki 120c | github 0c | latest 0c",
      "Tools: inventory-status, crop-status + doc chunks",
      "Model: Generating answer",
    ]);

    expect(steps.map((step) => step.label)).toEqual([
      "Analyzing request",
      "Checking your farm",
      "Searching sources",
      "Preparing tools and data",
      "Preparing answer",
    ]);
    expect(steps[0].details).toContain("Analyzing the question");
    expect(steps[3].details).toContain("Selected: inventory-status, crop-status + doc chunks");
    expect(steps.every((step) => step.state === "complete")).toBe(true);
  });

  test("marks only the latest visible step as active", () => {
    const steps = buildActivitySteps([
      "Thinking: Analysing the question",
      "Model: Generating answer",
    ], true);

    expect(steps.map((step) => step.state)).toEqual(["complete", "active"]);
  });

  test("keeps the existing technical parser available", () => {
    const debug = parseDebugStatus(["Route: farm | confidence 0.91", "Tools: inventory-status"]);

    expect(debug.route).toBe("farm");
    expect(debug.confidence).toBe("0.91");
    expect(debug.tools).toEqual(["inventory-status"]);
  });
});
