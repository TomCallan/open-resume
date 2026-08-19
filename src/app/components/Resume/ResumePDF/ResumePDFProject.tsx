import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeProject } from "lib/redux/types";
import type { TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFProject = ({
  heading,
  projects,
  themeColor,
  template = "modern",
}: {
  heading: string;
  projects: ResumeProject[];
  themeColor: string;
  template?: TemplateType;
}) => {
  return (
    <ResumePDFSection template={template} themeColor={themeColor} heading={heading}>
      {projects.map(({ project, date, descriptions }, idx) => {
        const isFirst = idx === 0;

        if (template === "latex-jakes") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
              <View style={{ ...styles.flexRowBetween }}>
                <ResumePDFText bold={true} style={{ fontSize: "10.5pt", color: "#111827" }}>
                  {project}
                </ResumePDFText>
                <ResumePDFText bold={true} style={{ fontSize: "10pt", color: "#111827" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        if (template === "latex-moderncv") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["2"] } : {}}>
              <View style={{ ...styles.flexRowBetween, alignItems: "center" }}>
                <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10.5pt" }}>
                  {project}
                </ResumePDFText>
                <ResumePDFText style={{ fontSize: "9.5pt", color: "#475569" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        if (template === "compact") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["1"] } : {}}>
              <View style={{ ...styles.flexRowBetween, alignItems: "baseline" }}>
                <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10pt" }}>
                  {project}
                </ResumePDFText>
                <ResumePDFText style={{ fontSize: "8.5pt", color: "#64748b" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        return (
          <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
            <View
              style={{
                ...styles.flexRowBetween,
                marginTop: spacing["0.5"],
              }}
            >
              <ResumePDFText bold={true}>{project}</ResumePDFText>
              <ResumePDFText>{date}</ResumePDFText>
            </View>
            <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
              <ResumePDFBulletList items={descriptions} />
            </View>
          </View>
        );
      })}
    </ResumePDFSection>
  );
};
