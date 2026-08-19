import { Page, View, Document } from "@react-pdf/renderer";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { ResumePDFProfile } from "components/Resume/ResumePDF/ResumePDFProfile";
import { ResumePDFWorkExperience } from "components/Resume/ResumePDF/ResumePDFWorkExperience";
import { ResumePDFEducation } from "components/Resume/ResumePDF/ResumePDFEducation";
import { ResumePDFProject } from "components/Resume/ResumePDF/ResumePDFProject";
import { ResumePDFSkills } from "components/Resume/ResumePDF/ResumePDFSkills";
import { ResumePDFCustom } from "components/Resume/ResumePDF/ResumePDFCustom";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import type { Settings, ShowForm } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { SuppressResumePDFErrorMessage } from "components/Resume/ResumePDF/common/SuppressResumePDFErrorMessage";

/**
 * Note: ResumePDF is supposed to be rendered inside PDFViewer. However,
 * PDFViewer is rendered too slow and has noticeable delay as you enter
 * the resume form, so we render it without PDFViewer to make it render
 * instantly. There are 2 drawbacks with this approach:
 * 1. Not everything works out of box if not rendered inside PDFViewer,
 *    e.g. svg doesn't work, so it takes in a isPDF flag that maps react
 *    pdf element to the correct dom element.
 * 2. It throws a lot of errors in console log, e.g. "<VIEW /> is using incorrect
 *    casing. Use PascalCase for React components, or lowercase for HTML elements."
 *    in development, causing a lot of noises. We can possibly workaround this by
 *    mapping every react pdf element to a dom element, but for now, we simply
 *    suppress these messages in <SuppressResumePDFErrorMessage />.
 *    https://github.com/diegomura/react-pdf/issues/239#issuecomment-487255027
 */
export const ResumePDF = ({
  resume,
  settings,
  isPDF = false,
}: {
  resume: Resume;
  settings: Settings;
  isPDF?: boolean;
}) => {
  const { profile, workExperiences, educations, projects, skills, custom } =
    resume;
  const { name } = profile;
  const {
    fontFamily,
    fontSize,
    documentSize,
    formToHeading,
    formToShow,
    formsOrder,
    showBulletPoints,
  } = settings;
  const template = settings.template || "modern";
  const themeColor = settings.themeColor || DEFAULT_FONT_COLOR;
  const showFormsOrder = formsOrder.filter((form) => formToShow[form]);

  const renderSection = (form: ShowForm) => {
    switch (form) {
      case "workExperiences":
        return (
          <ResumePDFWorkExperience
            key={form}
            heading={formToHeading["workExperiences"]}
            workExperiences={workExperiences}
            themeColor={themeColor}
            template={template}
          />
        );
      case "educations":
        return (
          <ResumePDFEducation
            key={form}
            heading={formToHeading["educations"]}
            educations={educations}
            themeColor={themeColor}
            showBulletPoints={showBulletPoints["educations"]}
            template={template}
          />
        );
      case "projects":
        return (
          <ResumePDFProject
            key={form}
            heading={formToHeading["projects"]}
            projects={projects}
            themeColor={themeColor}
            template={template}
          />
        );
      case "skills":
        return (
          <ResumePDFSkills
            key={form}
            heading={formToHeading["skills"]}
            skills={skills}
            themeColor={themeColor}
            showBulletPoints={showBulletPoints["skills"]}
            template={template}
          />
        );
      case "custom":
        return (
          <ResumePDFCustom
            key={form}
            heading={formToHeading["custom"]}
            custom={custom}
            themeColor={themeColor}
            showBulletPoints={showBulletPoints["custom"]}
            template={template}
          />
        );
      default:
        return null;
    }
  };

  const showTopAccentBar =
    Boolean(settings.themeColor) &&
    (template === "modern" || template === "executive" || template === "compact");

  const topBarHeight =
    template === "compact"
      ? "2.5pt"
      : template === "executive"
      ? spacing[4]
      : spacing[3.5];

  const pagePadding =
    template === "compact"
      ? `${spacing[4]} ${spacing[16]}`
      : template === "classic"
      ? `${spacing[8]} ${spacing[20]}`
      : template === "minimal"
      ? `${spacing[10]} ${spacing[20]}`
      : `${spacing[0]} ${spacing[20]}`;

  return (
    <>
      <Document title={`${name} Resume`} author={name} producer={"OpenResume"}>
        <Page
          size={documentSize === "A4" ? "A4" : "LETTER"}
          style={{
            ...styles.flexCol,
            color: DEFAULT_FONT_COLOR,
            fontFamily,
            fontSize: fontSize + "pt",
          }}
        >
          {showTopAccentBar && (
            <View
              style={{
                width: spacing["full"],
                height: topBarHeight,
                backgroundColor: themeColor,
              }}
            />
          )}
          <View
            style={{
              ...styles.flexCol,
              padding: pagePadding,
            }}
          >
            <ResumePDFProfile
              profile={profile}
              themeColor={themeColor}
              isPDF={isPDF}
              template={template}
            />
            {showFormsOrder.map(renderSection)}
          </View>
        </Page>
      </Document>
      <SuppressResumePDFErrorMessage />
    </>
  );
};
