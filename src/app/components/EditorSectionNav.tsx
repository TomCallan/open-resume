"use client";
import { useAppSelector } from "lib/redux/hooks";
import { selectFormsOrder, type ShowForm } from "lib/redux/settingsSlice";

const LABELS: Record<ShowForm, string> = {
  workExperiences: "Work Experience",
  educations: "Education",
  projects: "Projects",
  skills: "Skills",
  custom: "Custom",
};

export const EditorSectionNav = () => {
  const formsOrder = useAppSelector(selectFormsOrder);
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav aria-label="Resume sections" className="w-44 shrink-0 border-r border-gray-200 bg-white py-4">
      <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sections</p>
      <a
        href="#profile-section"
        onClick={(e) => { e.preventDefault(); scrollTo("profile-section"); }}
        className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Profile
      </a>
      {formsOrder.map((f) => (
        <a
          key={f}
          href={`#${f}-section`}
          onClick={(e) => { e.preventDefault(); scrollTo(`${f}-section`); }}
          className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        >
          {LABELS[f]}
        </a>
      ))}
      <a
        href="#design-section"
        onClick={(e) => { e.preventDefault(); scrollTo("design-section"); }}
        className="block px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        Design
      </a>
    </nav>
  );
};