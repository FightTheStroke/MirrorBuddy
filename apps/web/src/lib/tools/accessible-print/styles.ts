import type { AccessibilitySettings } from "@/lib/accessibility";

export function getAccessibilityStyles(
  settings: Partial<AccessibilitySettings>,
): string {
  const fontFamily = settings.dyslexiaFont
    ? "'OpenDyslexic', 'Comic Sans MS', Arial, sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const baseFontSize = settings.fontSize || 1;
  const dyslexiaMultiplier = settings.dyslexiaFont ? 1.4 : 1;
  const largeTextMultiplier = settings.largeText ? 1.2 : 1;
  const fontSize = `${baseFontSize * dyslexiaMultiplier * largeTextMultiplier * 16}px`;

  const lineHeight = settings.increasedLineHeight
    ? Math.max(settings.lineSpacing || 1.5, 1.8)
    : settings.lineSpacing || 1.5;

  const letterSpacing = settings.extraLetterSpacing ? "0.05em" : "normal";

  const backgroundColor = settings.highContrast
    ? "#000000"
    : settings.customBackgroundColor || "#ffffff";

  const textColor = settings.highContrast
    ? "#ffff00"
    : settings.customTextColor || "#1e293b";

  return `
    @import url('https://fonts.cdnfonts.com/css/opendyslexic');

    @page {
      size: A4;
      margin: 2cm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    * {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
    }

    body {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing};
      color: ${textColor};
      background-color: ${backgroundColor};
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      ${settings.dyslexiaFont ? "text-transform: uppercase;" : ""}
    }

    h1 {
      font-size: 1.75em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? "#ffffff" : "#0f172a"};
      border-bottom: 3px solid ${settings.highContrast ? "#ffff00" : "#3b82f6"};
      padding-bottom: 0.5em;
      page-break-after: avoid;
    }

    h2 {
      font-size: 1.4em;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? "#00ffff" : "#1e40af"};
      page-break-after: avoid;
    }

    h3 {
      font-size: 1.2em;
      margin-top: 1em;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? "#00ff00" : "#334155"};
      page-break-after: avoid;
    }

    p {
      margin-bottom: 1em;
      max-width: ${settings.dyslexiaFont ? "60ch" : "75ch"};
    }

    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }

    li {
      margin-bottom: 0.5em;
    }

    li::marker {
      color: ${settings.highContrast ? "#ffff00" : "#3b82f6"};
    }

    .card {
      margin-bottom: 1.5em;
      padding: 1em;
      background: ${settings.highContrast ? "#1a1a1a" : "#f8fafc"};
      border-radius: 8px;
      border-left: 4px solid ${settings.highContrast ? "#ffff00" : "#3b82f6"};
      page-break-inside: avoid;
    }

    .card-title {
      font-weight: 600;
      margin-bottom: 0.5em;
      color: ${settings.highContrast ? "#ffffff" : "#1e293b"};
    }

    .flashcard {
      display: flex;
      flex-direction: column;
      margin-bottom: 1.5em;
      border: 2px solid ${settings.highContrast ? "#ffff00" : "#e2e8f0"};
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .flashcard-front {
      padding: 1em;
      background: ${settings.highContrast ? "#1a1a1a" : "#f1f5f9"};
      font-weight: 600;
    }

    .flashcard-back {
      padding: 1em;
      background: ${settings.highContrast ? "#0d0d0d" : "#ffffff"};
      border-top: 1px dashed ${settings.highContrast ? "#666666" : "#cbd5e1"};
    }

    .flashcard-label {
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${settings.highContrast ? "#00ffff" : "#64748b"};
      margin-bottom: 0.25em;
    }

    .quiz-question {
      margin-bottom: 1.5em;
      padding: 1em;
      background: ${settings.highContrast ? "#1a1a1a" : "#ffffff"};
      border: 2px solid ${settings.highContrast ? "#ffff00" : "#e2e8f0"};
      border-radius: 8px;
      page-break-inside: avoid;
    }

    .quiz-question-number {
      font-weight: 700;
      color: ${settings.highContrast ? "#00ffff" : "#3b82f6"};
      margin-bottom: 0.5em;
    }

    .quiz-options {
      margin-top: 0.75em;
      padding-left: 1em;
    }

    .quiz-option {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
      margin-bottom: 0.5em;
      padding: 0.5em;
      border-radius: 4px;
    }

    .quiz-option.correct {
      background: ${settings.highContrast ? "#003300" : "#dcfce7"};
      border: 1px solid ${settings.highContrast ? "#00ff00" : "#22c55e"};
    }

    .quiz-option-marker {
      font-weight: 600;
      min-width: 1.5em;
    }

    .mindmap-node {
      margin-left: 1.5em;
      padding: 0.25em 0;
    }

    .mindmap-node.level-0 {
      margin-left: 0;
      font-weight: 700;
      font-size: 1.2em;
      color: ${settings.highContrast ? "#ffffff" : "#0f172a"};
    }

    .mindmap-node.level-1 {
      color: ${settings.highContrast ? "#00ffff" : "#1e40af"};
      font-weight: 600;
    }

    .mindmap-node.level-2 {
      color: ${settings.highContrast ? "#00ff00" : "#059669"};
    }

    .mindmap-node::before {
      content: '├─ ';
      color: ${settings.highContrast ? "#666666" : "#94a3b8"};
    }

    .mindmap-node.level-0::before {
      content: '';
    }

    .timeline {
      border-left: 3px solid ${settings.highContrast ? "#ffff00" : "#3b82f6"};
      padding-left: 1.5em;
      margin-left: 0.5em;
    }

    .timeline-event {
      position: relative;
      margin-bottom: 1.5em;
      page-break-inside: avoid;
    }

    .timeline-event::before {
      content: '';
      position: absolute;
      left: -1.75em;
      top: 0.25em;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${settings.highContrast ? "#ffff00" : "#3b82f6"};
    }

    .timeline-date {
      font-weight: 600;
      color: ${settings.highContrast ? "#00ffff" : "#3b82f6"};
      margin-bottom: 0.25em;
    }

    .timeline-title {
      font-weight: 600;
      margin-bottom: 0.25em;
    }

    .summary-section {
      margin-bottom: 1.5em;
      page-break-inside: avoid;
    }

    .summary-key-points {
      background: ${settings.highContrast ? "#1a1a1a" : "#f0f9ff"};
      padding: 1em;
      border-radius: 8px;
      margin-top: 0.5em;
    }

    .meta {
      font-size: 0.875em;
      color: ${settings.highContrast ? "#999999" : "#64748b"};
      margin-bottom: 1.5em;
    }

    .footer {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid ${settings.highContrast ? "#333333" : "#e2e8f0"};
      font-size: 0.75em;
      color: ${settings.highContrast ? "#666666" : "#94a3b8"};
      text-align: center;
    }

    .a11y-indicator {
      font-size: 0.75em;
      color: ${settings.highContrast ? "#00ffff" : "#6366f1"};
      margin-bottom: 1em;
      padding: 0.5em;
      background: ${settings.highContrast ? "#1a1a1a" : "#f5f3ff"};
      border-radius: 4px;
    }
  `;
}
