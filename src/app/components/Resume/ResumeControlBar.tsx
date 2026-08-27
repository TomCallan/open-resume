"use client";
import { useEffect, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { usePDF } from "@react-pdf/renderer";
import dynamic from "next/dynamic";

const ResumeControlBar = ({
  document,
  fileName,
}: {
  document: JSX.Element;
  fileName: string;
}) => {
  const [debouncedDocument, setDebouncedDocument] = useState(document);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDocument(document);
    }, 500);
    return () => clearTimeout(timer);
  }, [document]);

  const [instance, update] = usePDF({ document: debouncedDocument });

  // Hook to update pdf when debounced document changes
  useEffect(() => {
    update();
  }, [update, debouncedDocument]);

  const isDownloadDisabled = !instance.url || instance.loading;

  return (
    <a
      className={`flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-sm ${
        isDownloadDisabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-gray-100"
      }`}
      href={instance.url || undefined}
      download={fileName}
      aria-disabled={isDownloadDisabled}
      onClick={(e) => {
        if (isDownloadDisabled) {
          e.preventDefault();
        }
      }}
    >
      <ArrowDownTrayIcon className="h-4 w-4" />
      <span>{instance.loading ? "Preparing PDF..." : "Download"}</span>
    </a>
  );
};

/**
 * Load ResumeControlBar client side since it uses usePDF, which is a web specific API
 */
export const ResumeControlBarCSR = dynamic(
  () => Promise.resolve(ResumeControlBar),
  {
    ssr: false,
  }
);
