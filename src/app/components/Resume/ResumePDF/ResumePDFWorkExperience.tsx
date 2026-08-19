import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeWorkExperience } from "lib/redux/types";
import type { TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFWorkExperience = ({
  heading,
  workExperiences,
  themeColor,
  template = "modern",
}: {
  heading: string;
  workExperiences: ResumeWorkExperience[];
  themeColor: string;
  template?: TemplateType;
}) => {
  return (
    <ResumePDFSection template={template} themeColor={themeColor} heading={heading}>
      {workExperiences.map(({ company, jobTitle, date, descriptions }, idx) => {
        const hideCompanyName =
          idx > 0 && company === workExperiences[idx - 1].company;

        const isFirst = idx === 0;

        // Jake's Overleaf LaTeX CS format:
        // Line 1: [Company] (Bold Left) ................................ [Date] (Bold Right)
        // Line 2: [Job Title] (Italic/Normal Left)
        if (template === "latex-jakes") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
              <View style={{ ...styles.flexRowBetween }}>
                <ResumePDFText bold={true} style={{ fontSize: "10.5pt", color: "#111827" }}>
                  {company}
                </ResumePDFText>
                <ResumePDFText bold={true} style={{ fontSize: "10pt", color: "#111827" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexRowBetween, marginTop: "0.5pt" }}>
                <ResumePDFText style={{ fontSize: "10pt", color: "#374151" }}>
                  {jobTitle}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        // ModernCV LaTeX style:
        // Line 1: [Job Title] (accent color bold) -- [Company] (dark) ..... [Date Badge]
        if (template === "latex-moderncv") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["2"] } : {}}>
              <View style={{ ...styles.flexRowBetween, alignItems: "center" }}>
                <View style={{ ...styles.flexRow, alignItems: "center", gap: spacing["1"] }}>
                  <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10.5pt" }}>
                    {jobTitle}
                  </ResumePDFText>
                  <ResumePDFText style={{ color: "#64748b" }}>@</ResumePDFText>
                  <ResumePDFText bold={true} style={{ color: "#1e293b", fontSize: "10pt" }}>
                    {company}
                  </ResumePDFText>
                </View>
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

        // Tech LaTeX (sb2nov) style:
        // Line 1: [Company] | [Job Title] ................................ [Date]
        if (template === "latex-sb2nov") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
              <View style={{ ...styles.flexRowBetween }}>
                <View style={{ ...styles.flexRow, alignItems: "center", gap: spacing["1.5"] }}>
                  <ResumePDFText bold={true} style={{ fontSize: "10.5pt", color: "#0f172a" }}>
                    {company}
                  </ResumePDFText>
                  <ResumePDFText style={{ color: "#94a3b8" }}>|</ResumePDFText>
                  <ResumePDFText style={{ fontSize: "10pt", color: "#334155" }}>
                    {jobTitle}
                  </ResumePDFText>
                </View>
                <ResumePDFText style={{ fontSize: "9.5pt", color: "#334155" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        // Compact high-density style (single line header)
        if (template === "compact") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["1"] } : {}}>
              <View style={{ ...styles.flexRowBetween, alignItems: "baseline" }}>
                <View style={{ ...styles.flexRow, alignItems: "baseline", gap: spacing["1"] }}>
                  <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10pt" }}>
                    {company}
                  </ResumePDFText>
                  <ResumePDFText style={{ color: "#64748b", fontSize: "8.5pt" }}>•</ResumePDFText>
                  <ResumePDFText style={{ fontSize: "9.5pt", color: "#334155" }}>
                    {jobTitle}
                  </ResumePDFText>
                </View>
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

        // Executive style
        if (template === "executive") {
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["2"] } : {}}>
              <View style={{ ...styles.flexRowBetween, alignItems: "center" }}>
                <View style={{ ...styles.flexCol }}>
                  <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "11pt" }}>
                    {jobTitle}
                  </ResumePDFText>
                  <ResumePDFText bold={true} style={{ fontSize: "10pt", color: "#374151", marginTop: "1pt" }}>
                    {company}
                  </ResumePDFText>
                </View>
                <ResumePDFText style={{ fontSize: "9.5pt", color: "#4b5563" }}>
                  {date}
                </ResumePDFText>
              </View>
              <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
                <ResumePDFBulletList items={descriptions} />
              </View>
            </View>
          );
        }

        // Default Modern & Classic fallback
        return (
          <View key={idx} style={idx !== 0 ? { marginTop: spacing["2"] } : {}}>
            {!hideCompanyName && (
              <ResumePDFText bold={true}>{company}</ResumePDFText>
            )}
            <View
              style={{
                ...styles.flexRowBetween,
                marginTop: hideCompanyName
                  ? "-" + spacing["1"]
                  : spacing["1.5"],
              }}
            >
              <ResumePDFText>{jobTitle}</ResumePDFText>
              <ResumePDFText>{date}</ResumePDFText>
            </View>
            <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
              <ResumePDFBulletList items={descriptions} />
            </View>
          </View>
        );
      })}
    </ResumePDFSection>
  );
};
