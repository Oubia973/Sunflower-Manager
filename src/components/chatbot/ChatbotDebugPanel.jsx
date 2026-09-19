import React from "react";

export const parseDebugStatus = (statusLog = []) => {
    const state = {
      route: "",
      outputMode: "",
      answerMode: "",
      confidence: "",
      knowledge: "",
      theme: "",
      data: "",
      depth: "",
      leanContext: "",
      evidencePlan: "",
      evidenceMode: "",
      evidenceShape: "",
      evidenceNeeds: [],
      evidenceRequired: [],
      evidenceTargets: [],
      evidenceKinds: [],
      evidenceSources: [],
      sections: [],
      blocks: [],
      tools: [],
      toolsFiltered: [],
      docs: "",
      localDoc: "",
      wikiDoc: "",
      githubDoc: "",
      githubLatestDoc: "",
      topics: [],
      signals: "",
      knowledgeMode: "",
      intentPolicy: "",
      farmPlan: "",
      timing: "",
      generation: "",
      model: "",
      queue: "",
      steps: [],
      raw: [],
    };
    (Array.isArray(statusLog) ? statusLog : []).forEach((entry) => {
      const text = String(entry || "");
      state.raw.push(text);
      const genericMatch = text.match(/^([^:]+):\s*(.+)$/);
      if (genericMatch) {
        const label = genericMatch[1].trim().toLowerCase();
        const detail = genericMatch[2].trim();
        state.steps.push({ label: genericMatch[1].trim(), detail });
        if (label === "intentpolicy") {
          state.intentPolicy = detail;
          const leanMatch = detail.match(/\blean\s+(yes|no)\b/i);
          if (leanMatch) state.leanContext = leanMatch[1].toLowerCase();
        }
        if (label === "farmplan") state.farmPlan = detail;
        if (label === "evidenceplan") {
          state.evidencePlan = detail;
          const modeMatch = detail.match(/\bmode\s+([a-z0-9_-]+)/i);
          const shapeMatch = detail.match(/\bshape\s+([a-z0-9_-]+)/i);
          const needsMatch = detail.match(/\bneeds\s+([^|]+)/i);
          const requiredMatch = detail.match(/\brequired\s+([^|]+)/i);
          const marketMatch = detail.match(/\bmarket\s+([^|]+)/i);
          const kindsMatch = detail.match(/\bkinds\s+([^|]+)/i);
          const sourcesMatch = detail.match(/\bsources\s+(.+)$/i);
          const leanMatch = detail.match(/\blean\s+(yes|no)\b/i);
          if (modeMatch) state.evidenceMode = modeMatch[1].trim();
          if (shapeMatch) state.evidenceShape = shapeMatch[1].trim();
          if (needsMatch) state.evidenceNeeds = needsMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
          if (requiredMatch) state.evidenceRequired = requiredMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
          if (marketMatch) state.evidenceTargets = marketMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
          if (kindsMatch) state.evidenceKinds = kindsMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
          if (sourcesMatch) {
            state.evidenceSources = sourcesMatch[1]
              .split(/\s*\|\|\s*/)
              .map((part) => part.trim())
              .filter(Boolean);
          }
          if (leanMatch) state.leanContext = leanMatch[1].toLowerCase();
        }
        if (label === "lean") state.leanContext = detail;
        if (label === "toolsfiltered") {
          state.toolsFiltered = detail && !/^none$/i.test(detail)
            ? detail.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean)
            : [];
        }
        if (label === "timing") state.timing = detail;
        if (label === "generation") state.generation = detail;
        if (label === "model") state.model = detail;
        if (label === "queue") state.queue = detail;
      }
      if (text.startsWith("Route: ")) {
        const match = text.match(/^Route:\s*([^|]+)(?:\|\s*confidence\s*([0-9.]+))?/i);
        if (match) {
          state.route = match[1].trim();
          state.confidence = match[2] ? Number(match[2]).toFixed(2) : state.confidence;
        }
      }
      if (text.startsWith("Intent: ")) {
        const routeMatch = text.match(/route\s+([a-z0-9_-]+)/i);
        const outputModeMatch = text.match(/output\s+([a-z0-9_-]+)/i);
        const confMatch = text.match(/confidence\s+([0-9.]+)/i);
        const depthMatch = text.match(/depth\s+([0-9.]+)/i);
        if (!state.route && routeMatch) state.route = routeMatch[1].trim();
        if (!state.outputMode && outputModeMatch) state.outputMode = outputModeMatch[1].trim();
        if (!state.confidence && confMatch) state.confidence = Number(confMatch[1]).toFixed(2);
        if (!state.depth && depthMatch) state.depth = Number(depthMatch[1]).toFixed(2);
      }
      if (text.startsWith("Intent: ")) {
        const sectionsMatch = text.match(/sections\s+([^|]+)/i);
        const blocksMatch = text.match(/blocks\s+([^|]+)/i);
        const modeMatch = text.match(/mode\s+([a-z0-9_-]+)/i);
        if (sectionsMatch) {
          state.sections = sectionsMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
        }
        if (blocksMatch) {
          state.blocks = blocksMatch[1].split(",").map((part) => part.trim()).filter(Boolean);
        }
        if (!state.answerMode && modeMatch) state.answerMode = modeMatch[1].trim();
      }
      if (text.startsWith("IntentPolicy: ")) {
        state.intentPolicy = text.slice("IntentPolicy: ".length).trim();
      }
      if (text.startsWith("FarmPlan: ")) {
        state.farmPlan = text.slice("FarmPlan: ".length).trim();
      }
      if (text.startsWith("Knowledge: ")) {
        const knowledgeMatch = text.match(/^Knowledge:\s*([^|]+)(?:\|\s*local\s*([0-9]+)c)?(?:\|\s*wiki\s*([0-9]+)c)?(?:\|\s*github\s*([0-9]+)c)?(?:\|\s*latest\s*([0-9]+)c)?/i);
        if (knowledgeMatch) {
          state.knowledge = knowledgeMatch[1].trim();
          state.localDoc = knowledgeMatch[2] ? `${knowledgeMatch[2]}c` : state.localDoc;
          state.wikiDoc = knowledgeMatch[3] ? `${knowledgeMatch[3]}c` : state.wikiDoc;
          state.githubDoc = knowledgeMatch[4] ? `${knowledgeMatch[4]}c` : state.githubDoc;
          state.githubLatestDoc = knowledgeMatch[5] ? `${knowledgeMatch[5]}c` : state.githubLatestDoc;
        }
      }
      if (text.startsWith("KnowledgeMode: ")) {
        state.knowledgeMode = text.slice("KnowledgeMode: ".length).trim();
      }
      if (text.startsWith("Theme: ")) {
        state.theme = text.slice("Theme: ".length).trim();
      }
      if (text.startsWith("Data: ")) {
        state.data = text.slice("Data: ".length).trim();
      }
      if (text.startsWith("Docs: ")) {
        const localMatch = text.match(/local\s+([0-9]+)c/i);
        const wikiMatch = text.match(/wiki\s+([0-9]+)c/i);
        const githubMatch = text.match(/github\s+([0-9]+)c/i);
        const latestMatch = text.match(/latest\s+([0-9]+)c/i);
        if (localMatch) state.localDoc = `${localMatch[1]}c`;
        if (wikiMatch) state.wikiDoc = `${wikiMatch[1]}c`;
        if (githubMatch) state.githubDoc = `${githubMatch[1]}c`;
        if (latestMatch) state.githubLatestDoc = `${latestMatch[1]}c`;
        state.docs = text;
      }
      if (text.startsWith("Topics: ")) {
        const topicText = text.slice("Topics: ".length).trim();
        state.topics = topicText && !/^none$/i.test(topicText)
          ? topicText.split(/\s*\|\|\s*/).map((part) => part.trim()).filter(Boolean)
          : [];
      }
      if (text.startsWith("Signals: ")) {
        state.signals = text.slice("Signals: ".length).trim();
      }
      if (text.startsWith("Tools: ")) {
        const toolText = text.slice("Tools: ".length).replace(/\s*\+\s*(doc chunks|no doc chunk|legacy context)\s*$/i, "").trim();
        const docsSuffix = text.match(/\+\s*(doc chunks|no doc chunk|legacy context)\s*$/i)?.[1];
        if (docsSuffix) state.docs = docsSuffix;
        if (toolText && !/^legacy context/i.test(toolText)) {
          state.tools = toolText.split(",").map((part) => part.trim()).filter(Boolean);
        }
      }
      if (text.startsWith("ToolsFiltered: ")) {
        const filteredText = text.slice("ToolsFiltered: ".length).trim();
        state.toolsFiltered = filteredText && !/^none$/i.test(filteredText)
          ? filteredText.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean)
          : [];
      }
    });
    return state;
};

const ACTIVITY_GROUPS = {
  analysis: { label: "Analyzing request", labels: ["thinking", "intent", "intentpolicy", "route"] },
  farm: { label: "Checking your farm", labels: ["farmplan", "theme", "data", "signals"] },
  sources: { label: "Searching sources", labels: ["knowledge", "knowledgemode", "docs", "topics", "wikirag"] },
  tools: { label: "Preparing tools and data", labels: ["evidenceplan", "lean", "tools", "toolsfiltered"] },
  answer: { label: "Preparing answer", labels: ["model", "generation"] },
  queue: { label: "Waiting for processing", labels: ["queue"] },
};

function parseStatusEntry(entry) {
  const raw = String(entry || "").trim();
  const match = raw.match(/^([^:]+):\s*(.*)$/);
  return { raw, label: match ? match[1].trim() : "", detail: match ? match[2].trim() : raw };
}

function findActivityGroup(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized === "context") return "analysis";
  return Object.entries(ACTIVITY_GROUPS).find(([, group]) => group.labels.includes(normalized))?.[0] || "other";
}

function getReadableDetail(label, detail) {
  const normalized = String(label || "").toLowerCase();
  if (normalized === "thinking") return "Analyzing the question";
  if (normalized === "context") return "Selecting relevant data and sources";
  if (["intent", "intentpolicy", "route"].includes(normalized)) return "Request type identified";
  if (normalized === "farmplan") return "Relevant farm data identified";
  if (normalized === "theme") return detail && !/^none$/i.test(detail) ? `Themes: ${detail}` : "Farm themes checked";
  if (normalized === "data") return detail && !/^none$/i.test(detail) ? `Data: ${detail}` : "No additional data required";
  if (normalized === "signals") return "Data availability checked";
  if (["knowledge", "knowledgemode"].includes(normalized)) return "Knowledge sources selected";
  if (normalized === "docs") return "Available documentation checked";
  if (normalized === "topics") return detail && !/^none$/i.test(detail) ? `Topics found: ${detail}` : "No external topic required";
  if (normalized === "wikirag") return "Relevant information found in the wiki";
  if (normalized === "evidenceplan") return "Information required for the answer identified";
  if (normalized === "tools") return detail && !/^none$/i.test(detail) ? `Selected: ${detail}` : "No specialized tool required";
  if (["lean", "toolsfiltered"].includes(normalized)) return null;
  if (normalized === "model") return "Answer method selected";
  if (normalized === "generation") {
    const duration = detail.match(/\b(\d+)ms\b/i)?.[1];
    return duration ? `Answer generated in ${(Number(duration) / 1000).toFixed(1)} s` : "Answer generated";
  }
  if (normalized === "queue") return detail ? `Server: ${detail}` : "Request accepted";
  return "Internal step completed";
}

export const buildActivitySteps = (statusLog = [], isActive = false) => {
  const steps = [];
  (Array.isArray(statusLog) ? statusLog : []).forEach((entry) => {
    const parsed = parseStatusEntry(entry);
    if (!parsed.raw) return;
    const id = findActivityGroup(parsed.label);
    const definition = ACTIVITY_GROUPS[id] || { label: "Processing request" };
    let step = steps.find((candidate) => candidate.id === id);
    if (!step) {
      step = { id, label: definition.label, details: [] };
      steps.push(step);
    }
    const detail = getReadableDetail(parsed.label, parsed.detail);
    if (detail && !step.details.includes(detail)) step.details.push(detail);
  });
  return steps.map((step, index) => ({
    ...step,
    state: isActive && index === steps.length - 1 ? "active" : "complete",
  }));
};

function ActivityStep({ step }) {
  const hasDetails = step.details.length > 0;
  const content = (
    <>
      <span className={`chatbot-activity-marker is-${step.state}`} aria-hidden="true">
        {step.state === "active" ? "" : "✓"}
      </span>
      <span className="chatbot-activity-step-copy">
        <span className="chatbot-activity-step-label">{step.label}</span>
      </span>
      {hasDetails ? <span className="chatbot-activity-chevron" aria-hidden="true" /> : null}
    </>
  );

  if (!hasDetails) return <div className="chatbot-activity-step chatbot-activity-step-static">{content}</div>;
  return (
    <details className="chatbot-activity-step">
      <summary>{content}</summary>
      <ul className="chatbot-activity-details">
        {step.details.map((detail, index) => <li key={`${step.id}-${index}`}>{detail}</li>)}
      </ul>
    </details>
  );
}

export default function ChatbotDebugPanel({ statusLog, messageIndex, isActive = false }) {
  if (!statusLog?.length) return null;
  const debug = parseDebugStatus(statusLog);
  const steps = buildActivitySteps(statusLog, isActive);
  const currentStep = steps[steps.length - 1];
  const summaryLabel = isActive && currentStep
    ? `${currentStep.label}…`
    : "Answer steps";

  return (
    <details className="chatbot-activity">
      <summary className="chatbot-activity-summary">
        <span className={`chatbot-activity-summary-dot ${isActive ? "is-active" : ""}`} aria-hidden="true" />
        <span>{summaryLabel}</span>
        <span className="chatbot-activity-chevron" aria-hidden="true" />
      </summary>
      <div className="chatbot-activity-timeline">
        {steps.map((step) => <ActivityStep key={step.id} step={step} />)}
      </div>
      <details className="chatbot-technical-details">
        <summary>Technical details</summary>
        <ol className="chatbot-debug-steps">
          {debug.raw.map((status, statusIndex) => (
            <li key={`${messageIndex}-status-${statusIndex}`} className="chatbot-debug-step">
              <span className="chatbot-debug-step-index">{statusIndex + 1}</span>
              <span className="chatbot-debug-step-text">{status}</span>
            </li>
          ))}
        </ol>
      </details>
    </details>
  );
}
