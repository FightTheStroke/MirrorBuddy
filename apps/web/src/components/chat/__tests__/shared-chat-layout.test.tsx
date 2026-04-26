/**
 * Unit tests for SharedChatLayout component
 * Ensures fixed ChatGPT-style layout with proper viewport handling
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharedChatLayout } from "../shared-chat-layout";

describe("SharedChatLayout", () => {
  const mockHeader = <div data-testid="mock-header">Header</div>;
  const mockFooter = <div data-testid="mock-footer">Footer</div>;
  const mockChildren = <div data-testid="mock-children">Messages</div>;
  const mockRightPanel = <div data-testid="mock-right-panel">Right Panel</div>;
  const mockToolPanel = <div data-testid="mock-tool-panel">Tool Panel</div>;

  it("renders header, children, and footer", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
    expect(screen.getByTestId("mock-children")).toBeInTheDocument();
    expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
  });

  it("has full viewport height with h-dvh", () => {
    const { container } = render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer.className).toMatch(/h-dvh/);
  });

  it("uses flex column layout", () => {
    const { container } = render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer.className).toMatch(/flex/);
    expect(outerContainer.className).toMatch(/flex-col/);
  });

  it("header has flex-shrink-0", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const header = screen.getByTestId("mock-header").parentElement;
    expect(header?.className).toMatch(/flex-shrink-0/);
  });

  it("messages area has flex-1 and overflow-y-auto", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const messagesArea = screen.getByTestId("mock-children").parentElement;
    expect(messagesArea?.className).toMatch(/flex-1/);
    expect(messagesArea?.className).toMatch(/overflow-y-auto/);
  });

  it("footer has flex-shrink-0", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const footer = screen.getByTestId("mock-footer").parentElement;
    expect(footer?.className).toMatch(/flex-shrink-0/);
  });

  it("renders right panel when showRightPanel is true", () => {
    render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        rightPanel={mockRightPanel}
        showRightPanel={true}
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    expect(screen.getByTestId("mock-right-panel")).toBeInTheDocument();
  });

  it("does not render right panel when showRightPanel is false", () => {
    render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        rightPanel={mockRightPanel}
        showRightPanel={false}
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    expect(screen.queryByTestId("mock-right-panel")).not.toBeInTheDocument();
  });

  it("right panel has correct desktop classes", () => {
    render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        rightPanel={mockRightPanel}
        showRightPanel={true}
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    const rightPanel = screen.getByTestId("mock-right-panel").parentElement;
    // Desktop: visible on lg+, flex, border-l
    expect(rightPanel?.className).toMatch(/hidden/);
    expect(rightPanel?.className).toMatch(/lg:flex/);
    expect(rightPanel?.className).toMatch(/border-l/);
  });

  it("renders tool panel when provided", () => {
    render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        toolPanel={mockToolPanel}
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    expect(screen.getByTestId("mock-tool-panel")).toBeInTheDocument();
  });

  it("applies custom className to outer container", () => {
    const { container } = render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        className="custom-layout-class"
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer.className).toMatch(/custom-layout-class/);
  });

  it("has proper ARIA landmarks", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    // Main content area should have role="main"
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
  });

  it("right panel has complementary role when visible", () => {
    render(
      <SharedChatLayout
        header={mockHeader}
        footer={mockFooter}
        rightPanel={mockRightPanel}
        showRightPanel={true}
      >
        {mockChildren}
      </SharedChatLayout>,
    );

    const complementary = screen.getByRole("complementary");
    expect(complementary).toBeInTheDocument();
  });

  it("messages area has overscroll-contain", () => {
    render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const messagesArea = screen.getByTestId("mock-children").parentElement;
    expect(messagesArea?.className).toMatch(/overscroll-contain/);
  });

  it("uses min-h-0 for proper flexbox sizing", () => {
    const { container } = render(
      <SharedChatLayout header={mockHeader} footer={mockFooter}>
        {mockChildren}
      </SharedChatLayout>,
    );

    const outerContainer = container.firstChild as HTMLElement;
    // Should have min-h-0 somewhere in the hierarchy
    expect(outerContainer.innerHTML).toMatch(/min-h-0/);
  });
});
