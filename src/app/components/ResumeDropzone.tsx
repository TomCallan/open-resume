import { useState, useEffect } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import {
  getHasUsedAppBefore,
  saveStateToLocalStorage,
} from "lib/redux/local-storage";
import { type ShowForm, initialSettings, type Settings } from "lib/redux/settingsSlice";
import { initialResumeState } from "lib/redux/resumeSlice";
import { deepMerge } from "lib/deep-merge";
import type { Resume } from "lib/redux/types";
import { useRouter } from "next/navigation";
import addPdfSrc from "public/assets/add-pdf.svg";
import Image from "next/image";
import { cx } from "lib/cx";
import { deepClone } from "lib/deep-clone";

const defaultFileState = {
  name: "",
  size: 0,
  fileUrl: "",
};

export const ResumeDropzone = ({
  onFileUrlChange,
  className,
  playgroundView = false,
}: {
  onFileUrlChange: (fileUrl: string) => void;
  className?: string;
  playgroundView?: boolean;
}) => {
  const [file, setFile] = useState(defaultFileState);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isHoveredOnDropzone, setIsHoveredOnDropzone] = useState(false);
  const [hasUnsupportedFile, setHasUnsupportedFile] = useState(false);
  const router = useRouter();

  const hasFile = Boolean(file.name);

  useEffect(() => {
    return () => {
      if (file.fileUrl) {
        URL.revokeObjectURL(file.fileUrl);
      }
    };
  }, [file.fileUrl]);

  const setNewFile = (newFile: File) => {
    if (file.fileUrl) {
      URL.revokeObjectURL(file.fileUrl);
    }

    const { name, size } = newFile;
    const fileUrl = URL.createObjectURL(newFile);
    setRawFile(newFile);
    setFile({ name, size, fileUrl });
    onFileUrlChange(fileUrl);
  };

  const isSupportedFile = (fileName: string) => {
    if (playgroundView) return fileName.endsWith(".pdf");
    return fileName.endsWith(".pdf") || fileName.endsWith(".json");
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const newFile = event.dataTransfer.files[0];
    if (newFile && isSupportedFile(newFile.name)) {
      setHasUnsupportedFile(false);
      setNewFile(newFile);
    } else {
      setHasUnsupportedFile(true);
    }
    setIsHoveredOnDropzone(false);
  };

  const onInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFile = files[0];
    if (isSupportedFile(newFile.name)) {
      setHasUnsupportedFile(false);
      setNewFile(newFile);
    } else {
      setHasUnsupportedFile(true);
    }
  };

  const onRemove = () => {
    if (file.fileUrl) {
      URL.revokeObjectURL(file.fileUrl);
    }
    setRawFile(null);
    setFile(defaultFileState);
    onFileUrlChange("");
  };

  const onImportClick = async () => {
    if (rawFile && rawFile.name.endsWith(".json")) {
      try {
        const text = await rawFile.text();
        const parsed = JSON.parse(text);
        let resume: Resume;
        let settings: Settings = deepClone(initialSettings);

        if (parsed.resume) {
          resume = deepMerge(initialResumeState, parsed.resume) as Resume;
          if (parsed.settings) {
            settings = deepMerge(initialSettings, parsed.settings) as Settings;
          }
        } else {
          resume = deepMerge(initialResumeState, parsed) as Resume;
        }

        saveStateToLocalStorage({ resume, settings });
        router.push("/resume-builder");
        return;
      } catch (err) {
        alert("Invalid JSON resume format.");
        return;
      }
    }

    const resume = await parseResumeFromPdf(file.fileUrl);
    const settings = deepClone(initialSettings);

    // Set formToShow settings based on uploaded resume if users have used the app before
    if (getHasUsedAppBefore()) {
      const sections = Object.keys(settings.formToShow) as ShowForm[];
      const sectionToFormToShow: Record<ShowForm, boolean> = {
        workExperiences: resume.workExperiences.length > 0,
        educations: resume.educations.length > 0,
        projects: resume.projects.length > 0,
        skills: resume.skills.descriptions.length > 0,
        custom: resume.custom.descriptions.length > 0,
      };
      for (const section of sections) {
        settings.formToShow[section] = sectionToFormToShow[section];
      }
    }

    saveStateToLocalStorage({ resume, settings });
    router.push("/resume-builder");
  };

  return (
    <div
      className={cx(
        "flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 ",
        isHoveredOnDropzone && "border-sky-400",
        playgroundView ? "pb-6 pt-4" : "py-12",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsHoveredOnDropzone(true);
      }}
      onDragLeave={() => setIsHoveredOnDropzone(false)}
      onDrop={onDrop}
    >
      <div
        className={cx(
          "text-center",
          playgroundView ? "space-y-2" : "space-y-3"
        )}
      >
        {!playgroundView && (
          <Image
            src={addPdfSrc}
            className="mx-auto h-14 w-14"
            alt="Add file"
            aria-hidden="true"
            priority
          />
        )}
        {!hasFile ? (
          <>
            <p
              className={cx(
                "pt-3 text-gray-700",
                !playgroundView && "text-lg font-semibold"
              )}
            >
              {!playgroundView
                ? "Browse a PDF / JSON file or drop it here"
                : "Browse a pdf file or drop it here"}
            </p>
            <p className="flex text-sm text-gray-500">
              <LockClosedIcon className="mr-1 mt-1 h-3 w-3 text-gray-400" />
              File data is used locally and never leaves your browser
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 pt-3">
            <div className="pl-7 font-semibold text-gray-900">
              {file.name} - {getFileSizeString(file.size)}
            </div>
            <button
              type="button"
              className="outline-theme-blue rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              title="Remove file"
              onClick={onRemove}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
        <div className="pt-4">
          {!hasFile ? (
            <>
              <label
                className={cx(
                  "within-outline-theme-purple cursor-pointer rounded-full px-6 pb-2.5 pt-2 font-semibold shadow-sm",
                  playgroundView ? "border" : "bg-primary"
                )}
              >
                Browse file
                <input
                  type="file"
                  className="sr-only"
                  accept={playgroundView ? ".pdf" : ".pdf,.json"}
                  onChange={onInputChange}
                />
              </label>
              {hasUnsupportedFile && (
                <p className="mt-6 text-red-400">
                  {playgroundView
                    ? "Only PDF file is supported in parser playground"
                    : "Only PDF or JSON files are supported"}
                </p>
              )}
            </>
          ) : (
            <>
              {!playgroundView && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onImportClick}
                >
                  Import and Continue <span aria-hidden="true">→</span>
                </button>
              )}
              <p className={cx(" text-gray-500", !playgroundView && "mt-6")}>
                Note: {!playgroundView ? "Import" : "Parser"} works best on
                single column resume
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const getFileSizeString = (fileSizeB: number) => {
  const fileSizeKB = fileSizeB / 1024;
  const fileSizeMB = fileSizeKB / 1024;
  if (fileSizeKB < 1000) {
    return fileSizeKB.toPrecision(3) + " KB";
  } else {
    return fileSizeMB.toPrecision(3) + " MB";
  }
};
