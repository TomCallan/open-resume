"use client";
import { useState } from "react";
import { Provider } from "react-redux";
import { useSearchParams } from "next/navigation";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { VersionHistoryPanel } from "components/VersionHistoryPanel";
import { EditorSectionNav } from "components/EditorSectionNav";
import { cx } from "lib/cx";

export default function Create() {
  const params = useSearchParams();
  const documentId = params.get("document");
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <Provider store={store}>
      <main className="relative flex h-full min-h-screen flex-col bg-gray-50">
        <VersionHistoryPanel documentId={documentId} />
        <div className="relative flex flex-1 overflow-hidden">
          <EditorSectionNav />
          <div className="min-w-0 flex-1 overflow-y-auto">
            <ResumeForm documentId={documentId} />
          </div>
          <div
            className={cx(
              "relative w-[45%] min-w-[420px] border-l border-gray-200 md:block",
              previewOpen ? "block" : "hidden"
            )}
          >
            <Resume />
          </div>
          <button
            onClick={() => setPreviewOpen((o) => !o)}
            className="absolute right-3 top-3 z-10 hidden rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 md:block"
          >
            {previewOpen ? "Hide preview" : "Show preview"}
          </button>
        </div>
      </main>
    </Provider>
  );
}