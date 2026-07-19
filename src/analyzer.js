const CHECKS = [
  {
    id: "TX_ORIGIN",
    severity: "high",
    pattern: /\btx\.origin\b/g,
    title: "tx.origin authorization",
    recommendation: "Use msg.sender or explicit signature-based authorization."
  },
  {
    id: "DELEGATECALL",
    severity: "high",
    pattern: /\.delegatecall\s*\(/g,
    title: "delegatecall usage",
    recommendation: "Restrict the target and carefully validate storage-layout assumptions."
  },
  {
    id: "SELFDESTRUCT",
    severity: "medium",
    pattern: /\bselfdestruct\s*\(/g,
    title: "selfdestruct usage",
    recommendation: "Avoid relying on selfdestruct behavior and document the shutdown model."
  },
  {
    id: "LOW_LEVEL_CALL",
    severity: "medium",
    pattern: /\.call\s*\{/g,
    title: "low-level call",
    recommendation: "Check success, apply checks-effects-interactions, and consider reentrancy protection."
  },
  {
    id: "UNCHECKED_BLOCK",
    severity: "low",
    pattern: /\bunchecked\s*\{/g,
    title: "unchecked arithmetic",
    recommendation: "Prove bounds for every unchecked operation."
  },
  {
    id: "BLOCK_TIMESTAMP",
    severity: "low",
    pattern: /\bblock\.timestamp\b/g,
    title: "timestamp dependence",
    recommendation: "Allow for validator timestamp tolerance and avoid exact-time assumptions."
  },
  {
    id: "INLINE_ASSEMBLY",
    severity: "medium",
    pattern: /\bassembly\s*\{/g,
    title: "inline assembly",
    recommendation: "Minimize assembly and test memory/storage invariants."
  }
];

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

export function analyzeSource(source) {
  const normalized = String(source ?? "");
  const findings = [];

  for (const check of CHECKS) {
    const count = countMatches(normalized, check.pattern);
    if (count > 0) {
      findings.push({
        id: check.id,
        severity: check.severity,
        title: check.title,
        occurrences: count,
        recommendation: check.recommendation
      });
    }
  }

  const externalCalls = countMatches(normalized, /\.(call|delegatecall|staticcall)\s*(\{|\()/g);
  const hasReentrancyGuard =
    /\bnonReentrant\b/.test(normalized) ||
    /\bReentrancyGuard\b/.test(normalized);

  if (externalCalls > 0 && !hasReentrancyGuard) {
    findings.push({
      id: "REENTRANCY_REVIEW",
      severity: "medium",
      title: "external calls without an obvious reentrancy guard",
      occurrences: externalCalls,
      recommendation: "Review state-update ordering and add a guard where appropriate."
    });
  }

  const weights = { high: 25, medium: 12, low: 4 };
  const penalty = findings.reduce(
    (sum, finding) => sum + weights[finding.severity] * Math.min(finding.occurrences, 3),
    0
  );
  const score = Math.max(0, 100 - penalty);

  return {
    score,
    riskLevel: score >= 85 ? "low" : score >= 60 ? "medium" : "high",
    findings,
    stats: {
      characters: normalized.length,
      lines: normalized ? normalized.split(/\r?\n/).length : 0,
      findings: findings.length
    },
    disclaimer:
      "Automated heuristic review only. It is not a security audit and must not be used as the sole basis for deploying or funding a contract."
  };
}
