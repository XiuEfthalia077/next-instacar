"use client";

import {
  Bold,
  Code,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  RotateCcw,
  Underline,
} from "lucide-react";
import * as React from "react";

import { LoadingButton } from "@/components/common/loading-button";
import { saveRentalAgreementAction } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

type RentalAgreementEditorProps = {
  initialContent: string;
};

export function RentalAgreementEditor({
  initialContent,
}: RentalAgreementEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = React.useState(initialContent || "");
  const [showCode, setShowCode] = React.useState(false);

  // Sync initial content on mount
  React.useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  return (
    <form action={saveRentalAgreementAction} className="space-y-3">
      {/* Hidden textarea holding the HTML payload for the Server Action */}
      <input
        type="hidden"
        name="rental_agreement_html"
        value={htmlContent}
      />

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1.5 text-foreground">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="rounded-lg p-1.5 transition hover:bg-muted hover:text-[#ffcc00]"
          title="Bold (Ctrl+B)"
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="rounded-lg p-1.5 transition hover:bg-muted hover:text-[#ffcc00]"
          title="Italic (Ctrl+I)"
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="rounded-lg p-1.5 transition hover:bg-muted hover:text-[#ffcc00]"
          title="Underline (Ctrl+U)"
        >
          <Underline className="size-4" />
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          type="button"
          onClick={() => exec("formatBlock", "<h1>")}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-muted hover:text-[#ffcc00]"
          title="Heading 1"
        >
          <Heading1 className="size-3.5" />
          <span>H1</span>
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h2>")}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-muted hover:text-[#ffcc00]"
          title="Heading 2"
        >
          <Heading2 className="size-3.5" />
          <span>H2</span>
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h3>")}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-muted hover:text-[#ffcc00]"
          title="Heading 3"
        >
          <Heading3 className="size-3.5" />
          <span>H3</span>
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<p>")}
          className="rounded-lg px-2 py-1 text-xs font-bold transition hover:bg-muted hover:text-[#ffcc00]"
          title="Normal Paragraph"
        >
          Paragraph
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="rounded-lg p-1.5 transition hover:bg-muted hover:text-[#ffcc00]"
          title="Bullet List"
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className="rounded-lg p-1.5 transition hover:bg-muted hover:text-[#ffcc00]"
          title="Numbered List"
        >
          <ListOrdered className="size-4" />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition",
              showCode
                ? "bg-[#ffcc00] text-black"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            title="Toggle Raw HTML view"
          >
            {showCode ? <Eye className="size-3.5" /> : <Code className="size-3.5" />}
            <span>{showCode ? "Visual Mode" : "HTML Source"}</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas or HTML Source Editor */}
      {showCode ? (
        <textarea
          value={htmlContent}
          onChange={(e) => {
            setHtmlContent(e.target.value);
            if (editorRef.current) {
              editorRef.current.innerHTML = e.target.value;
            }
          }}
          rows={11}
          className="w-full rounded-xl border border-border bg-[#090b0e] p-4 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffcc00]"
          placeholder="Paste or write raw HTML markup..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="min-h-[240px] max-h-[420px] overflow-y-auto rounded-xl border border-border bg-[#090b0e] p-4 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-[#ffcc00] prose prose-invert prose-xs max-w-none"
        />
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-muted-foreground">
          Changes will take effect immediately in the customer booking agreement modal.
        </p>
        <LoadingButton
          type="submit"
          className="bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633]"
        >
          Save Agreement
        </LoadingButton>
      </div>
    </form>
  );
}
