export const STREAM_STATUS_PREFIX = "[[SFLM_STATUS]]";
export const STREAM_FINAL_PREFIX = "[[SFLM_FINAL]]";

function getPartialPrefixLength(value) {
  const prefixes = [STREAM_STATUS_PREFIX, STREAM_FINAL_PREFIX];
  let keepLength = 0;
  prefixes.forEach((prefix) => {
    const max = Math.min(value.length, prefix.length - 1);
    for (let length = max; length > 0; length -= 1) {
      if (prefix.startsWith(value.slice(-length))) {
        keepLength = Math.max(keepLength, length);
        break;
      }
    }
  });
  return keepLength;
}

function getNextMarkerIndex(value) {
  const indexes = [STREAM_STATUS_PREFIX, STREAM_FINAL_PREFIX]
    .map((prefix) => value.indexOf(prefix))
    .filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

export function createChatbotStreamParser({ onText, onStatus, onFinal } = {}) {
  let buffer = "";

  const emitText = (text) => {
    if (text) onText?.(text);
  };

  const parseLine = (line, force = false) => {
    if (line.startsWith(STREAM_STATUS_PREFIX)) {
      try {
        const payload = JSON.parse(line.slice(STREAM_STATUS_PREFIX.length));
        onStatus?.(payload, line);
      } catch {
        // Ignore malformed status frames and keep answer parsing alive.
      }
      return;
    }

    if (line.startsWith(STREAM_FINAL_PREFIX)) {
      try {
        const payload = JSON.parse(line.slice(STREAM_FINAL_PREFIX.length));
        onFinal?.(payload, line);
      } catch {
        if (force) emitText(line);
      }
      return;
    }

    emitText(line);
  };

  const consume = (force = false) => {
    while (buffer) {
      const markerIndex = getNextMarkerIndex(buffer);
      if (markerIndex < 0) {
        if (force) {
          emitText(buffer);
          buffer = "";
          return;
        }

        const keepLength = getPartialPrefixLength(buffer);
        const readyText = keepLength > 0 ? buffer.slice(0, -keepLength) : buffer;
        emitText(readyText);
        buffer = keepLength > 0 ? buffer.slice(-keepLength) : "";
        return;
      }

      if (markerIndex > 0) {
        emitText(buffer.slice(0, markerIndex));
        buffer = buffer.slice(markerIndex);
      }

      const lineEndIndex = buffer.indexOf("\n");
      if (lineEndIndex < 0) {
        if (force) {
          parseLine(buffer.replace(/\r$/, ""), true);
          buffer = "";
        }
        return;
      }

      const line = buffer.slice(0, lineEndIndex).replace(/\r$/, "");
      parseLine(line, false);
      buffer = buffer.slice(lineEndIndex + 1);
    }
  };

  return {
    push(chunk) {
      buffer += String(chunk || "");
      consume(false);
    },
    flush() {
      consume(true);
    },
    getPending() {
      return buffer;
    },
    reset() {
      buffer = "";
    },
  };
}
