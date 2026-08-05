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

function DebugPill({ children, muted = false }) {
  if (!children) return null;
  return <span className={muted ? "chatbot-debug-pill chatbot-debug-pill-muted" : "chatbot-debug-pill"}>{children}</span>;
}

function DebugSection({ title, children }) {
  return (
    <div className="chatbot-debug-section">
      <div className="chatbot-debug-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function ChatbotDebugPanel({ statusLog, messageIndex }) {
  if (!statusLog?.length) return null;
  const debug = parseDebugStatus(statusLog);
  const toolCount = Array.isArray(debug.tools) ? debug.tools.length : 0;
  const filteredToolCount = Array.isArray(debug.toolsFiltered) ? debug.toolsFiltered.length : 0;

  return (
    <details className="chatbot-debug-panel">
      <summary className="chatbot-debug-summary">
        <span>activité</span>
        <DebugPill>{debug.queue ? `file ${debug.queue}` : null}</DebugPill>
        <DebugPill>{debug.route ? `route ${debug.route}` : null}</DebugPill>
        <DebugPill>{debug.answerMode ? `mode ${debug.answerMode}` : null}</DebugPill>
        <DebugPill>{debug.outputMode ? `shape ${debug.outputMode}` : null}</DebugPill>
        <DebugPill>{debug.depth ? `depth ${debug.depth}` : null}</DebugPill>
        <DebugPill>{debug.confidence ? `confidence ${debug.confidence}` : null}</DebugPill>
        <DebugPill>{debug.knowledgeMode ? `knowledge ${debug.knowledgeMode}` : null}</DebugPill>
        <DebugPill>{debug.wikiDoc ? `wiki ${debug.wikiDoc}` : null}</DebugPill>
        <DebugPill>{debug.tools?.length ? `tools ${toolCount}` : null}</DebugPill>
        <DebugPill>{filteredToolCount ? `filtered ${filteredToolCount}` : null}</DebugPill>
        <DebugPill>{debug.leanContext ? `lean ${debug.leanContext}` : null}</DebugPill>
        <DebugPill>{debug.theme ? `theme ${debug.theme}` : null}</DebugPill>
        <DebugPill>{debug.data ? `data ${debug.data}` : null}</DebugPill>
        <DebugPill>{debug.evidencePlan ? `plan ${debug.evidencePlan}` : null}</DebugPill>
        <DebugPill>{debug.blocks?.length ? `blocks ${debug.blocks.length}` : null}</DebugPill>
        <DebugPill>{debug.topics?.length ? `topics ${debug.topics.length}` : null}</DebugPill>
        <DebugPill>{debug.signals || null}</DebugPill>
      </summary>

      <DebugSection title="Summary">
        <div className="chatbot-debug-row">
          <DebugPill>{debug.knowledge ? `knowledge ${debug.knowledge}` : null}</DebugPill>
          <DebugPill>{debug.localDoc ? `local doc ${debug.localDoc}` : null}</DebugPill>
          <DebugPill>{debug.wikiDoc ? `wiki doc ${debug.wikiDoc}` : null}</DebugPill>
          <DebugPill>{debug.githubDoc ? `github doc ${debug.githubDoc}` : null}</DebugPill>
          <DebugPill>{debug.githubLatestDoc ? `latest ${debug.githubLatestDoc}` : null}</DebugPill>
        </div>
      </DebugSection>

      <DebugSection title="Decision">
        <div className="chatbot-debug-row">
          <DebugPill muted>{debug.intentPolicy}</DebugPill>
          <DebugPill muted>{debug.farmPlan}</DebugPill>
          <DebugPill muted>{debug.evidenceMode ? `evidence mode ${debug.evidenceMode}` : null}</DebugPill>
          <DebugPill muted>{debug.evidenceShape ? `evidence shape ${debug.evidenceShape}` : null}</DebugPill>
        </div>
        <div className="chatbot-debug-row">
          <DebugPill>{debug.evidenceNeeds?.length ? `needs ${debug.evidenceNeeds.join(", ")}` : null}</DebugPill>
          <DebugPill>{debug.evidenceRequired?.length ? `required ${debug.evidenceRequired.join(", ")}` : null}</DebugPill>
          <DebugPill>{debug.toolsFiltered?.length ? `filtered tools ${debug.toolsFiltered.join(", ")}` : null}</DebugPill>
          <DebugPill>{debug.tools?.length ? `active tools ${debug.tools.join(", ")}` : null}</DebugPill>
        </div>
      </DebugSection>

      <DebugSection title="Evidence plan">
        <div className="chatbot-debug-row">
          <DebugPill>{debug.evidenceTargets?.length ? `market ${debug.evidenceTargets.join(", ")}` : null}</DebugPill>
          <DebugPill>{debug.evidenceKinds?.length ? `kinds ${debug.evidenceKinds.join(", ")}` : null}</DebugPill>
          <DebugPill>{debug.evidenceSources?.length ? `sources ${debug.evidenceSources.join(" || ")}` : null}</DebugPill>
          <DebugPill>{debug.leanContext ? `lean ${debug.leanContext}` : null}</DebugPill>
        </div>
        <div className="chatbot-debug-row">
          <DebugPill muted>{debug.sections?.length ? `sections ${debug.sections.join(", ")}` : null}</DebugPill>
          <DebugPill muted>{debug.blocks?.length ? `blocks ${debug.blocks.join(", ")}` : null}</DebugPill>
          <DebugPill muted>{debug.topics?.length ? `topics ${debug.topics.join(" | ")}` : null}</DebugPill>
          <DebugPill muted>{debug.signals ? `signals ${debug.signals}` : null}</DebugPill>
        </div>
      </DebugSection>

      <DebugSection title="Timing">
        <div className="chatbot-debug-row">
          <DebugPill>{debug.queue ? `file ${debug.queue}` : null}</DebugPill>
          <DebugPill muted>{debug.timing}</DebugPill>
          <DebugPill muted>{debug.generation}</DebugPill>
          <DebugPill muted>{debug.model}</DebugPill>
        </div>
      </DebugSection>

      <DebugSection title="Raw steps">
        <ol className="chatbot-debug-steps">
          {debug.raw.map((status, statusIndex) => (
            <li key={`${messageIndex}-status-${statusIndex}`} className="chatbot-debug-step">
              <span className="chatbot-debug-step-index">{statusIndex + 1}</span>
              <span className="chatbot-debug-step-text">{status}</span>
            </li>
          ))}
        </ol>
      </DebugSection>
    </details>
  );
}
