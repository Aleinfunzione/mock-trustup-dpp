// src/components/vc/CopyJsonBox.tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";

type Props = {
  json: unknown;
  filename?: string; // opzionale, default: vc.json
};

export default function CopyJsonBox({ json, filename = "vc.json" }: Props) {
  const text = React.useMemo(() => JSON.stringify(json, null, 2), [json]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copia
        </Button>
        <Button size="sm" variant="secondary" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
      <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30 whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}
