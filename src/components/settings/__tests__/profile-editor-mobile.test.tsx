import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileEditorMobile } from "../profile-editor-mobile";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("ProfileEditorMobile", () => {
  const mockProfile = {
    name: "Test Student",
    avatar: "",
    bio: "My bio",
    gradeLevel: "high",
  };

  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it("renders the component", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    expect(screen.getByText(/Profilo/i)).toBeTruthy();
  });

  it("has large input fields with 16px+ font size for iOS accessibility", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const nameInput = screen.getByDisplayValue(mockProfile.name);
    // Check for large font size (iOS zoom prevention requires 16px minimum)
    expect(nameInput).toHaveClass(/text-base|text-lg|text-xl/);
  });

  it("renders avatar editor with camera capture button", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const cameraButton = screen.getByRole("button", {
      name: /camera|capture|foto/i,
    });
    expect(cameraButton).toBeTruthy();
  });

  it("stacks form fields vertically on mobile using xs breakpoint", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const formContainer = screen.getByTestId("profile-form-container");
    // Should use flex-col on mobile (xs breakpoint)
    expect(formContainer).toHaveClass(/flex-col/);
  });

  it("has sticky save button at bottom on mobile", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const saveButton = screen.getByRole("button", {
      name: /salva|save/i,
    });
    const buttonContainer = saveButton.closest("[data-sticky-footer]");
    expect(buttonContainer).toBeTruthy();
    expect(buttonContainer).toHaveClass(/fixed|sticky/);
  });

  it("updates name field on input change", async () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const nameInput = screen.getByDisplayValue(
      mockProfile.name,
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    await waitFor(() => {
      expect(nameInput.value).toBe("New Name");
    });
  });

  it("calls onSave with updated profile on save button click", async () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const saveButton = screen.getByRole("button", {
      name: /salva|save/i,
    });
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it("renders form with keyboard-aware scrolling support", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const scrollContainer = screen.getByTestId("keyboard-aware-container");
    expect(scrollContainer).toHaveClass("pb-24"); // Padding for sticky footer
  });

  it("uses TouchTarget size for interactive elements (min 44px)", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const saveButton = screen.getByRole("button", {
      name: /salva|save/i,
    });
    // Button should have min-h-12 or higher for 48px (44px minimum touch target)
    expect(saveButton).toHaveClass(/min-h-12|h-12|py-3/);
  });

  it("handles avatar file input and camera access", async () => {
    const { getByTestId } = render(
      <ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />,
    );
    const fileInput = getByTestId("avatar-file-input") as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toContain("image");
  });

  it("displays validation errors for required fields", async () => {
    const emptyProfile = { ...mockProfile, name: "" };
    render(<ProfileEditorMobile profile={emptyProfile} onSave={mockOnSave} />);
    const saveButton = screen.getByRole("button", {
      name: /salva|save/i,
    });
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/required|obbligatorio/i)).toBeTruthy();
    });
  });

  it("shows avatar preview with update capability", () => {
    const profileWithAvatar = {
      ...mockProfile,
      avatar:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
    render(
      <ProfileEditorMobile profile={profileWithAvatar} onSave={mockOnSave} />,
    );
    const avatarPreview = screen.getByTestId("avatar-preview");
    expect(avatarPreview).toBeTruthy();
  });

  it("prevents iOS auto-zoom on input focus with proper font sizing", () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      // All inputs must have 16px or larger font to prevent iOS auto-zoom
      expect(input).toHaveClass(/text-base|text-lg|text-xl/);
    });
  });

  it("maintains form state during keyboard interaction", async () => {
    render(<ProfileEditorMobile profile={mockProfile} onSave={mockOnSave} />);
    const bioInput = screen.getByDisplayValue(
      mockProfile.bio,
    ) as HTMLTextAreaElement;
    fireEvent.focus(bioInput);
    fireEvent.change(bioInput, { target: { value: "Updated bio" } });
    expect(bioInput.value).toBe("Updated bio");
    fireEvent.blur(bioInput);
    expect(bioInput.value).toBe("Updated bio");
  });
});
