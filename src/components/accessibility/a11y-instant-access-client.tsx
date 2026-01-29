"use client";

/**
 * A11y Instant Access Client
 * Internal client-side implementation of the A11y instant access UI
 * Separated from wrapper to enable SSR: false dynamic import
 */

import { useState } from "react";
import { A11yFloatingButton } from "./a11y-floating-button";
import { A11yQuickPanel } from "./a11y-quick-panel";

export default function A11yInstantAccessClient() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleToggle = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsPanelOpen(false);
  };

  return (
    <>
      <A11yFloatingButton onClick={handleToggle} isExpanded={isPanelOpen} />
      <A11yQuickPanel isOpen={isPanelOpen} onClose={handleClose} />
    </>
  );
}
