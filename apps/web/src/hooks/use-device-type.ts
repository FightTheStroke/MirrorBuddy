/**
 * useDeviceType - Device type (phone/tablet/desktop) + orientation detection
 * Uses matchMedia for performance (not resize events). SSR-safe.
 */

import { useState, useEffect } from "react";

export type DeviceType = "phone" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface UseDeviceTypeReturn {
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;
}

const DEFAULT: UseDeviceTypeReturn = {
  deviceType: "desktop",
  isPhone: false,
  isTablet: false,
  isDesktop: true,
  orientation: "portrait",
  isPortrait: true,
  isLandscape: false,
};

export function useDeviceType(): UseDeviceTypeReturn {
  const [state, setState] = useState<UseDeviceTypeReturn>(DEFAULT);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = {
      phone: window.matchMedia("(max-width: 639px)"),
      tablet: window.matchMedia("(min-width: 640px) and (max-width: 1023px)"),
      desktop: window.matchMedia("(min-width: 1024px)"),
      portrait: window.matchMedia("(orientation: portrait)"),
      landscape: window.matchMedia("(orientation: landscape)"),
    };
    const update = () => {
      const isPhone = mq.phone.matches;
      const isTablet = mq.tablet.matches;
      const isDesktop = mq.desktop.matches;
      const isPortrait = mq.portrait.matches;
      setState({
        deviceType: isPhone ? "phone" : isTablet ? "tablet" : "desktop",
        isPhone,
        isTablet,
        isDesktop,
        orientation: isPortrait ? "portrait" : "landscape",
        isPortrait,
        isLandscape: mq.landscape.matches,
      });
    };
    update();
    Object.values(mq).forEach((q) => q.addEventListener("change", update));
    return () =>
      Object.values(mq).forEach((q) => q.removeEventListener("change", update));
  }, []);

  return state;
}
