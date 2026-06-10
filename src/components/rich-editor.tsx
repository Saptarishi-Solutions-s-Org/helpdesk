"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, Underline as UnderlineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function RichEditor({
  value,
  onChange,
  placeholder = "Describe the issue clearly...",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const blockType = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : "p";

  const setBlockType = (value: string) => {
    if (value === "h1") {
      editor?.chain().focus().toggleHeading({ level: 1 }).run();
      return;
    }
    if (value === "h2") {
      editor?.chain().focus().toggleHeading({ level: 2 }).run();
      return;
    }
    editor?.chain().focus().setParagraph().run();
  };
  const activeToolClassName = "bg-blue-50 text-blue-700 hover:bg-blue-100";

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border bg-white">
      <div className={cn("flex w-full min-w-0 flex-wrap gap-1 border-b p-2", compact && "p-1.5")}>
        <Select value={blockType} onValueChange={setBlockType}>
          <SelectTrigger
            className={cn(
              "h-9 w-[140px]",
              compact && "h-8 w-[128px] text-xs",
              blockType !== "p" && activeToolClassName,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Normal Text</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compact && "h-8 w-8", editor?.isActive("bold") && activeToolClassName)}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compact && "h-8 w-8", editor?.isActive("italic") && activeToolClassName)}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compact && "h-8 w-8", editor?.isActive("underline") && activeToolClassName)}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compact && "h-8 w-8", editor?.isActive("bulletList") && activeToolClassName)}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm w-full max-w-none min-w-0 overflow-hidden p-3 text-sm [&_.ProseMirror]:min-h-32 [&_.ProseMirror]:max-w-full [&_.ProseMirror]:break-all [&_.ProseMirror]:outline-none [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6",
          compact && "max-h-36 overflow-y-auto p-2 [&_.ProseMirror]:min-h-24",
        )}
      />
    </div>
  );
}
