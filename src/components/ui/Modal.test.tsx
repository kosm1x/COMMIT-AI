import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";

vi.mock("../../hooks/useFocusTrap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

describe("Modal", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Hidden content</p>
      </Modal>,
    );
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders children when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Visible content</p>
      </Modal>,
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("renders title in header", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Modal">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("My Modal").tagName).toBe("H2");
  });

  it("has role='dialog' and aria-modal='true'", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Accessible">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Accessible");
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Backdrop Test">
        <p>Content</p>
      </Modal>,
    );
    // The backdrop is the first child div inside the dialog (with bg-black/50)
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.querySelector(".absolute.inset-0")!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape keypress", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows close button by default with aria-label 'Close dialog'", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="With Close">
        <p>Content</p>
      </Modal>,
    );
    const closeBtn = screen.getByLabelText("Close dialog");
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.tagName).toBe("BUTTON");
  });

  it("hides close button when showClose is false", () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="No Close"
        showClose={false}
      >
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByLabelText("Close dialog")).toBeNull();
  });

  it("applies size class for size='lg'", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <p>Large modal</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    // The content container with size class is the second child (relative div)
    const contentBox = dialog.querySelector(".relative.w-full")!;
    expect(contentBox.className).toContain("max-w-lg");
  });

  it("sets document.body overflow to hidden when open", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
  });
});
