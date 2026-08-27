"use client";
import { useState, useMemo } from "react";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import { ResumePDF } from "components/Resume/ResumePDF";
import {
  ResumeControlBarCSR,
  ResumeControlBarBorder,
} from "components/Resume/ResumeControlBar";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import {
  changeSettings,
  selectSettings,
  type TemplateType,
} from "lib/redux/settingsSlice";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";

export const Resume = () => {
  const [scale, setScale] = useState(0.8);
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const dispatch = useAppDispatch();
  const document = useMemo(
    () => <ResumePDF resume={resume} settings={settings} isPDF={true} />,
    [resume, settings]
  );

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  return (
    <>
      <NonEnglishFontsCSSLazyLoader />
      <div className="relative flex justify-center md:justify-start">
        <FlexboxSpacer maxWidth={50} className="hidden md:block" />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Template:</span>
              <select
                value={settings.template}
                onChange={(e) =>
                  dispatch(
                    changeSettings({
                      field: "template",
                      value: e.target.value as TemplateType,
                    })
                  )
                }
                className="rounded-md border border-gray-300 px-2 py-1"
              >
                {([
                  "modern",
                  "classic",
                  "executive",
                  "minimal",
                  "compact",
                  "latex-jakes",
                  "latex-moderncv",
                  "latex-sb2nov",
                ] as const).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
                <span className="w-10">{Math.round(scale * 100)}%</span>
              </label>
              <ResumeControlBarCSR
                document={document}
                fileName={resume.profile.name + " - Resume"}
              />
            </div>
          </div>
          <section className="h-[calc(100vh-var(--top-nav-bar-height)-var(--resume-control-bar-height))] overflow-hidden md:p-[var(--resume-padding)]">
            <ResumeIframeCSR
              documentSize={settings.documentSize}
              scale={scale}
              enablePDFViewer={DEBUG_RESUME_PDF_FLAG}
            >
              <ResumePDF
                resume={resume}
                settings={settings}
                isPDF={DEBUG_RESUME_PDF_FLAG}
              />
            </ResumeIframeCSR>
          </section>
        </div>
        <ResumeControlBarBorder />
      </div>
    </>
  );
};
