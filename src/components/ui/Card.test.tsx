import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import Card from "./Card";

describe("Card", () => {
  it("renders children content", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    const { container } = render(<Card>Default</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-white");
    expect(card.className).toContain("border");
    expect(card.className).toContain("border-gray-200");
  });

  it("applies elevated variant with shadow class", () => {
    const { container } = render(<Card variant="elevated">Elevated</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("shadow-lg");
  });

  it("applies outlined variant with border class", () => {
    const { container } = render(<Card variant="outlined">Outlined</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-2");
  });

  it("applies correct padding classes for each size", () => {
    const { container, rerender } = render(<Card padding="none">None</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("p-3");
    expect(card.className).not.toContain("p-4");
    expect(card.className).not.toContain("p-6");

    rerender(<Card padding="sm">Small</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-3");

    rerender(<Card padding="md">Medium</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-4");

    rerender(<Card padding="lg">Large</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("p-6");
  });

  it("adds hover and cursor styles when interactive is true", () => {
    const { container } = render(<Card interactive>Interactive</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("cursor-pointer");
    expect(card.className).toContain("hover:shadow-md");
  });

  it("merges custom className with default classes", () => {
    const { container } = render(
      <Card className="my-custom-class">Custom</Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("my-custom-class");
    expect(card.className).toContain("rounded-2xl");
  });

  it("forwards ref to the underlying div element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.tagName).toBe("DIV");
  });
});
