import { useState, useEffect, useCallback } from "react";
import { transformIdeaText } from "../services/aiService";
import type { Idea } from "../components/ideas/types";

type TransformMode =
  | "enhance"
  | "complete"
  | "shorten"
  | "summarize"
  | "cocreate";

export interface IdeaEditorState {
  selection: { start: number; end: number; text: string };
  selectionMenu: { text: string; x: number; y: number } | null;
  aiTransforming: TransformMode | null;
  captureSelection: () => void;
  replaceSelection: (replacement: string) => void;
  insertAtCursor: (text: string) => void;
  handleTransform: (mode: TransformMode) => Promise<void>;
  setSelectionMenu: React.Dispatch<
    React.SetStateAction<{ text: string; x: number; y: number } | null>
  >;
}

export function useIdeaEditor(
  idea: Idea | null,
  setIdea: (idea: Idea) => void,
  editorRef: React.RefObject<HTMLDivElement>,
  language: "en" | "es" | "zh",
  t: (key: string) => string,
): IdeaEditorState {
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    text: string;
  }>({
    start: 0,
    end: 0,
    text: "",
  });
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [aiTransforming, setAiTransforming] = useState<TransformMode | null>(
    null,
  );

  const captureSelection = useCallback(() => {
    const el = document.querySelector(
      "#idea-content-editor",
    ) as HTMLTextAreaElement;
    if (!el || !editorRef.current) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const text = el.value.slice(start, end);
    setSelection({ start, end, text });

    if (text.trim().length >= 3 && start !== end) {
      setTimeout(() => {
        const textBeforeSelection = el.value.slice(0, start);
        const linesBefore = textBeforeSelection.split("\n");
        const currentLineIndex = linesBefore.length - 1;

        const computedStyle = getComputedStyle(el);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 16;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 12;
        const fontSize = parseFloat(computedStyle.fontSize) || 14;

        const charWidth = fontSize * 0.6;
        const lineStart = textBeforeSelection.lastIndexOf("\n") + 1;
        const charsInLine = start - lineStart;
        const selectionLength = end - start;
        const selectionMiddleInLine = charsInLine + selectionLength / 2;
        const textareaWidth = el.offsetWidth;
        const xPixel = paddingLeft + selectionMiddleInLine * charWidth;
        const xPercent = (xPixel / textareaWidth) * 100;
        const y = paddingTop + currentLineIndex * lineHeight + lineHeight / 2;
        const clampedXPercent = Math.max(15, Math.min(85, xPercent));

        setSelectionMenu({
          text: text.trim(),
          x: clampedXPercent,
          y: y,
        });
      }, 10);
    } else {
      setSelectionMenu(null);
    }
  }, [editorRef]);

  const replaceSelection = useCallback(
    (replacement: string) => {
      if (!idea) return;
      const el = document.querySelector(
        "#idea-content-editor",
      ) as HTMLTextAreaElement;
      const content = idea.content || "";
      if (selection.text && selection.end > selection.start) {
        const before = content.slice(0, selection.start);
        const after = content.slice(selection.end);
        const newContent = `${before}${replacement}${after}`;
        const newStart = selection.start;
        const newEnd = selection.start + replacement.length;

        setIdea({ ...idea, content: newContent });
        setSelection({ start: newStart, end: newEnd, text: replacement });

        requestAnimationFrame(() => {
          if (el) {
            el.focus();
            el.setSelectionRange(newStart, newEnd);
          }
        });
      } else {
        setIdea({ ...idea, content: replacement });
        const newStart = 0;
        const newEnd = replacement.length;
        setSelection({ start: newStart, end: newEnd, text: replacement });
        requestAnimationFrame(() => {
          if (el) {
            el.focus();
            el.setSelectionRange(newStart, newEnd);
          }
        });
      }
    },
    [idea, setIdea, selection],
  );

  const insertAtCursor = useCallback(
    (textToInsert: string) => {
      if (!idea) return;
      const el = document.querySelector(
        "#idea-content-editor",
      ) as HTMLTextAreaElement;
      if (!el) return;

      const content = idea.content || "";
      const cursorPos = el.selectionStart || 0;
      const before = content.slice(0, cursorPos);
      const after = content.slice(cursorPos);
      const newContent = `${before}${textToInsert}${after}`;
      const newPos = cursorPos + textToInsert.length;

      setIdea({ ...idea, content: newContent });
      setSelection({ start: newPos, end: newPos, text: "" });

      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        }
      });
    },
    [idea, setIdea],
  );

  const handleTransform = useCallback(
    async (mode: TransformMode) => {
      if (!idea) return;

      let targetText = "";
      let contextText = "";

      try {
        setAiTransforming(mode);

        switch (mode) {
          case "enhance":
            if (!selection.text || selection.text.trim().length === 0) {
              alert(t("ideaDetail.selectTextToEnhance"));
              return;
            }
            targetText = selection.text;
            break;

          case "complete":
            contextText = idea.content.slice(0, selection.start);
            targetText = contextText;
            break;

          case "shorten":
            if (!selection.text || selection.text.trim().length === 0) {
              alert(t("ideaDetail.selectTextToShorten"));
              return;
            }
            targetText = selection.text;
            break;

          case "summarize":
            targetText = idea.content || "";
            break;

          case "cocreate": {
            const beforeCursor = idea.content.slice(0, selection.start);
            const paragraphs = beforeCursor.split(/\n\n+/);
            const lastParagraph =
              paragraphs[paragraphs.length - 1] || beforeCursor;
            targetText = lastParagraph.trim();
            contextText = beforeCursor;
            break;
          }
        }

        if (!targetText.trim()) {
          alert(t("ideaDetail.noContentToTransform"));
          return;
        }

        const result = await transformIdeaText(
          mode,
          targetText,
          {
            title: idea.title,
            content: idea.content,
            cursorPosition: selection.start,
            fullContext: contextText,
          },
          language,
        );

        if (mode === "complete" || mode === "cocreate") {
          insertAtCursor(result);
        } else if (mode === "enhance" || mode === "shorten") {
          replaceSelection(result);
        } else if (mode === "summarize") {
          setIdea({ ...idea, content: result });
          setSelection({ start: 0, end: result.length, text: result });
        }
      } catch (error) {
        console.error("Error transforming text:", error);
      } finally {
        setAiTransforming(null);
      }
    },
    [idea, setIdea, selection, language, t, insertAtCursor, replaceSelection],
  );

  // Close selection menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectionMenu &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionMenu) {
        setSelectionMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectionMenu, editorRef]);

  return {
    selection,
    selectionMenu,
    aiTransforming,
    captureSelection,
    replaceSelection,
    insertAtCursor,
    handleTransform,
    setSelectionMenu,
  };
}
