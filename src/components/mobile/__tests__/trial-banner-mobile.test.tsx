import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrialBannerMobile } from "../trial-banner-mobile";

// Mock useDeviceType hook
vi.mock("@/hooks/use-device-type", () => ({
  useDeviceType: vi.fn(),
}));

// Mock Framer Motion - handle both motion and AnimatePresence properly
vi.mock("framer-motion", () => ({
  motion: {
    div: (props: any) => {
      const { children, ...restProps } = props;
      return (
        <div data-testid={props["data-testid"]} {...restProps}>
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: any) => {
    // Only render the visible child
    return <>{children}</>;
  },
}));

import { useDeviceType } from "@/hooks/use-device-type";

const mockUseDeviceType = useDeviceType as ReturnType<typeof vi.fn>;

const defaultTrialStatus = {
  isTrialMode: true,
  chatsUsed: 2,
  chatsRemaining: 8,
  maxChats: 10,
};

describe("TrialBannerMobile", () => {
  beforeEach(() => {
    // Default to desktop view
    mockUseDeviceType.mockReturnValue({
      deviceType: "desktop",
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render nothing when not in trial mode", () => {
    const { container } = render(
      <TrialBannerMobile
        trialStatus={{
          isTrialMode: false,
          chatsUsed: 0,
          chatsRemaining: 0,
          maxChats: 10,
        }}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render full banner on desktop", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "desktop",
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    // Desktop shows full banner info
    expect(
      screen.getByText(/Trial: 8\/10 messages remaining/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upgrade to Base tier for unlimited access/i),
    ).toBeInTheDocument();
  });

  it("should render compact indicator on mobile (phone)", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "phone",
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    // Should show compact form
    expect(screen.getByText(/Trial: 8\/10 msgs/i)).toBeInTheDocument();
  });

  it("should expand full banner when tapping expand button on mobile", async () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "phone",
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    // Find and click expand button
    const expandButtons = screen.getAllByLabelText(/expand/i);
    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      // Should now show expanded content
      expect(
        screen.getByText(/You're using the free trial/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Upgrade to Base Tier/i)).toBeInTheDocument();
    });
  });

  it("should collapse expanded banner when tapping collapse button", async () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "phone",
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    // Expand
    const expandButtons = screen.getAllByLabelText(/expand/i);
    fireEvent.click(expandButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/You're using the free trial/i),
      ).toBeInTheDocument();
    });

    // Collapse
    const collapseButton = screen.getByLabelText(/collapse/i);
    fireEvent.click(collapseButton);

    // Should return to compact form
    await waitFor(() => {
      expect(
        screen.queryByText(/You're using the free trial/i),
      ).not.toBeInTheDocument();
    });
  });

  it("should show warning color when chats remaining is low (3 or fewer)", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "phone",
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    const { container } = render(
      <TrialBannerMobile
        trialStatus={{
          isTrialMode: true,
          chatsUsed: 7,
          chatsRemaining: 3,
          maxChats: 10,
        }}
      />,
    );

    // Should have warning styling (amber)
    const banner = container.querySelector(
      "[data-testid='trial-banner-compact']",
    );
    expect(banner).toBeTruthy();
    const classStr = banner?.className || "";
    expect(classStr).toMatch(/amber|orange/);
  });

  it("should show normal color when chats remaining is healthy", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "phone",
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    const { container } = render(
      <TrialBannerMobile trialStatus={defaultTrialStatus} />,
    );

    // Should have normal styling (purple)
    const banner = container.querySelector(
      "[data-testid='trial-banner-compact']",
    );
    expect(banner).toBeTruthy();
    const classStr = banner?.className || "";
    expect(classStr).toMatch(/purple/);
  });

  it("should render on tablet as mobile compact form", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "tablet",
      isPhone: false,
      isTablet: true,
      isDesktop: false,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    // Tablets show compact form too
    expect(screen.getByText(/Trial: 8\/10 msgs/i)).toBeInTheDocument();
  });

  it("should have accessible link to upgrade in desktop view", () => {
    mockUseDeviceType.mockReturnValue({
      deviceType: "desktop",
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      orientation: "portrait",
      isPortrait: true,
      isLandscape: false,
    });

    render(<TrialBannerMobile trialStatus={defaultTrialStatus} />);

    const upgradeLinks = screen.getAllByRole("link", { name: /upgrade/i });
    expect(upgradeLinks.length).toBeGreaterThan(0);
    expect(upgradeLinks[0]).toHaveAttribute("href", "/invite/request");
  });
});
