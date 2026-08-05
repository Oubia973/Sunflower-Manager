import { createChatbotStreamParser, STREAM_FINAL_PREFIX, STREAM_STATUS_PREFIX } from "./streamParser.js";

function collectParserEvents() {
  const events = [];
  const parser = createChatbotStreamParser({
    onText: (text) => events.push({ type: "text", text }),
    onStatus: (payload) => events.push({ type: "status", payload }),
    onFinal: (payload) => events.push({ type: "final", payload }),
  });
  return { events, parser };
}

test("parses text, split status frames and final frames", () => {
  const { events, parser } = collectParserEvents();

  parser.push("hello ");
  parser.push("[[SFLM_STA");
  parser.push('TUS]]{"label":"Search","detail":"wiki"}\n');
  parser.push("world");
  parser.push(`${STREAM_FINAL_PREFIX}{"answer":"done","chatbotUsed":2}\n`);
  parser.flush();

  expect(events).toEqual([
    { type: "text", text: "hello " },
    { type: "status", payload: { label: "Search", detail: "wiki" } },
    { type: "text", text: "world" },
    { type: "final", payload: { answer: "done", chatbotUsed: 2 } },
  ]);
});

test("keeps partial marker text pending until it can identify the frame", () => {
  const { events, parser } = collectParserEvents();

  parser.push("abc[[SFLM");

  expect(events).toEqual([{ type: "text", text: "abc" }]);
  expect(parser.getPending()).toBe("[[SFLM");

  parser.push('_STATUS]]{"label":"A","detail":"B"}\n');

  expect(events).toEqual([
    { type: "text", text: "abc" },
    { type: "status", payload: { label: "A", detail: "B" } },
  ]);
  expect(parser.getPending()).toBe("");
});

test("ignores malformed status frames and preserves forced malformed final frames as text", () => {
  const { events, parser } = collectParserEvents();

  parser.push(`${STREAM_STATUS_PREFIX}{bad}\n`);
  parser.push(`${STREAM_FINAL_PREFIX}{bad}`);
  parser.flush();

  expect(events).toEqual([
    { type: "text", text: `${STREAM_FINAL_PREFIX}{bad}` },
  ]);
});
