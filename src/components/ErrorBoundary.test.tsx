import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ErrorBoundary,
  withErrorBoundary,
  MinimalErrorFallback,
} from "./ErrorBoundary";

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>Working content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("shows error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("displays the section label when provided", () => {
    render(
      <ErrorBoundary section="Journal">
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("in Journal")).toBeInTheDocument();
  });

  it("does not display a section label when not provided", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.queryByText(/^in /)).not.toBeInTheDocument();
  });

  it("calls onError callback with error and errorInfo", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test error");
    expect(onError.mock.calls[0][1]).toHaveProperty("componentStack");
  });

  it("shows Try Again button that resets the error state", () => {
    let shouldThrow = true;
    function Conditional() {
      if (shouldThrow) throw new Error("Test error");
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // After reset, ErrorBoundary re-renders children
    rerender(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders custom fallback prop instead of default error UI", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders the Try Again button as a button element", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });
});

describe("withErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps a component with ErrorBoundary using the provided section", () => {
    const Wrapped = withErrorBoundary(ThrowingComponent, "Ideas");
    render(<Wrapped />);
    expect(screen.getByText("in Ideas")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("uses component displayName as section when section is not provided", () => {
    // ThrowingComponent's name is "ThrowingComponent"
    const Wrapped = withErrorBoundary(ThrowingComponent);
    render(<Wrapped />);
    expect(screen.getByText("in ThrowingComponent")).toBeInTheDocument();
  });
});

describe("MinimalErrorFallback", () => {
  it("renders default message when no message prop is provided", () => {
    render(<MinimalErrorFallback />);
    expect(screen.getByText("Failed to load this section")).toBeInTheDocument();
  });

  it("renders custom message when message prop is provided", () => {
    render(<MinimalErrorFallback message="Something broke" />);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
    expect(
      screen.queryByText("Failed to load this section"),
    ).not.toBeInTheDocument();
  });
});
