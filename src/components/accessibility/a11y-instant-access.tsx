"use client";

/**
 * A11y Instant Access
 * Container component combining the floating button and quick settings panel
 */

import { useState } from "react";
import { A11yFloatingButton } from "./a11y-floating-button";
import { A11yQuickPanel } from "./a11y-quick-panel";

export function A11yInstantAccess() {
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
