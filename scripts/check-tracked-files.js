"use strict";

const fs = require("fs");
const { execFileSync } = require("child_process");

const MAX_SCANNED_BYTES = 5 * 1024 * 1024;
const forbiddenNamePatterns = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)keystore\.properties$/i,
  /\.(?:jks|keystore|p12|pfx|pem|key)$/i,
];
const forbiddenContentPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /mongodb(?:\+srv)?:\/\/[^\s:/]+:[^\s@/]+@/i,
];

function isAllowedExample(filePath) {
  return /(^|\/)\.env\.example$/i.test(filePath);
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const violations = [];
for (const filePath of trackedFiles()) {
  const normalized = filePath.replace(/\\/g, "/");
  if (!isAllowedExample(normalized) && forbiddenNamePatterns.some((pattern) => pattern.test(normalized))) {
    violations.push(`${normalized}: forbidden tracked filename`);
    continue;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > MAX_SCANNED_BYTES) continue;

  const content = fs.readFileSync(filePath, "utf8");
  if (forbiddenContentPatterns.some((pattern) => pattern.test(content))) {
    violations.push(`${normalized}: private credential pattern detected`);
  }
}

if (violations.length > 0) {
  console.error("Tracked credential check failed:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log("Tracked credential check: ok");
