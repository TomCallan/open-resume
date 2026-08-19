import { View } from "@react-pdf/renderer";
import {
  ResumePDFBulletList,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeEducation } from "lib/redux/types";
import type { TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFEducation = ({
  heading,
  educations,
  themeColor,
  showBulletPoints,
  template = "modern",
}: {
  heading: string;
  educations: ResumeEducation[];
  themeColor: string;
  showBulletPoints: boolean;
  template?: TemplateType;
}) => {
  return (
    <ResumePDFSection template={template} themeColor={themeColor} heading={heading}>
      {educations.map(
        ({ school, degree, date, gpa, descriptions = [] }, idx) => {
          const hideSchoolName =
            idx > 0 && school === educations[idx - 1].school;
          const showDescriptions = descriptions.join() !== "";
          const isFirst = idx === 0;
          const degreeWithGpa = gpa
            ? `${degree}${Number(gpa) ? ` (GPA: ${gpa})` : ` - ${gpa}`}`
            : degree;

          // Jake's LaTeX Education:
          // Line 1: [University] (Bold Left) .................... [Date] (Bold Right)
          // Line 2: [Degree, Minor, GPA] (Italic Left)
          if (template === "latex-jakes") {
            return (
              <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
                <View style={{ ...styles.flexRowBetween }}>
                  <ResumePDFText bold={true} style={{ fontSize: "10.5pt", color: "#111827" }}>
                    {school}
                  </ResumePDFText>
                  <ResumePDFText bold={true} style={{ fontSize: "10pt", color: "#111827" }}>
                    {date}
                  </ResumePDFText>
                </View>
                <View style={{ ...styles.flexRowBetween, marginTop: "0.5pt" }}>
                  <ResumePDFText style={{ fontSize: "10pt", color: "#374151" }}>
                    {degreeWithGpa}
                  </ResumePDFText>
                </View>
                {showDescriptions && (
                  <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                    <ResumePDFBulletList
                      items={descriptions}
                      showBulletPoints={showBulletPoints}
                    />
                  </View>
                )}
              </View>
            );
          }

          // ModernCV LaTeX Education:
          if (template === "latex-moderncv") {
            return (
              <View key={idx} style={!isFirst ? { marginTop: spacing["2"] } : {}}>
                <View style={{ ...styles.flexRowBetween, alignItems: "center" }}>
                  <View style={{ ...styles.flexRow, alignItems: "center", gap: spacing["1"] }}>
                    <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10.5pt" }}>
                      {degree}
                    </ResumePDFText>
                    <ResumePDFText style={{ color: "#64748b" }}>,</ResumePDFText>
                    <ResumePDFText bold={true} style={{ color: "#1e293b", fontSize: "10pt" }}>
                      {school}
                    </ResumePDFText>
                    {gpa && (
                      <ResumePDFText style={{ color: "#64748b", fontSize: "9pt" }}>
                        (GPA: {gpa})
                      </ResumePDFText>
                    )}
                  </View>
                  <ResumePDFText style={{ fontSize: "9.5pt", color: "#475569" }}>
                    {date}
                  </ResumePDFText>
                </View>
                {showDescriptions && (
                  <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                    <ResumePDFBulletList
                      items={descriptions}
                      showBulletPoints={showBulletPoints}
                    />
                  </View>
                )}
              </View>
            );
          }

          // Tech LaTeX (sb2nov):
          if (template === "latex-sb2nov") {
            return (
              <View key={idx} style={!isFirst ? { marginTop: spacing["1.5"] } : {}}>
                <View style={{ ...styles.flexRowBetween }}>
                  <View style={{ ...styles.flexRow, alignItems: "center", gap: spacing["1.5"] }}>
                    <ResumePDFText bold={true} style={{ fontSize: "10.5pt", color: "#0f172a" }}>
                      {school}
                    </ResumePDFText>
                    <ResumePDFText style={{ color: "#94a3b8" }}>|</ResumePDFText>
                    <ResumePDFText style={{ fontSize: "10pt", color: "#334155" }}>
                      {degreeWithGpa}
                    </ResumePDFText>
                  </View>
                  <ResumePDFText style={{ fontSize: "9.5pt", color: "#334155" }}>
                    {date}
                  </ResumePDFText>
                </View>
                {showDescriptions && (
                  <View style={{ ...styles.flexCol, marginTop: spacing["1"] }}>
                    <ResumePDFBulletList
                      items={descriptions}
                      showBulletPoints={showBulletPoints}
                    />
                  </View>
                )}
              </View>
            );
          }

          // Compact:
          if (template === "compact") {
            return (
              <View key={idx} style={!isFirst ? { marginTop: spacing["1"] } : {}}>
                <View style={{ ...styles.flexRowBetween, alignItems: "baseline" }}>
                  <View style={{ ...styles.flexRow, alignItems: "baseline", gap: spacing["1"] }}>
                    <ResumePDFText bold={true} themeColor={themeColor} style={{ fontSize: "10pt" }}>
                      {school}
                    </ResumePDFText>
                    <ResumePDFText style={{ color: "#64748b", fontSize: "8.5pt" }}>•</ResumePDFText>
                    <ResumePDFText style={{ fontSize: "9.5pt", color: "#334155" }}>
                      {degreeWithGpa}
                    </ResumePDFText>
                  </View>
                  <ResumePDFText style={{ fontSize: "8.5pt", color: "#64748b" }}>
                    {date}
                  </ResumePDFText>
                </View>
                {showDescriptions && (
                  <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
                    <ResumePDFBulletList
                      items={descriptions}
                      showBulletPoints={showBulletPoints}
                    />
                  </View>
                )}
              </View>
            );
          }

          // Default Modern & Classic:
          return (
            <View key={idx} style={!isFirst ? { marginTop: spacing["2"] } : {}}>
              {!hideSchoolName && (
                <ResumePDFText bold={true}>{school}</ResumePDFText>
              )}
              <View
                style={{
                  ...styles.flexRowBetween,
                  marginTop: hideSchoolName
                    ? "-" + spacing["1"]
                    : spacing["1.5"],
                }}
              >
                <ResumePDFText>{`${
                  gpa
                    ? `${degree} - ${Number(gpa) ? gpa + " GPA" : gpa}`
                    : degree
                }`}</ResumePDFText>
                <ResumePDFText>{date}</ResumePDFText>
              </View>
              {showDescriptions && (
                <View style={{ ...styles.flexCol, marginTop: spacing["1.5"] }}>
                  <ResumePDFBulletList
                    items={descriptions}
                    showBulletPoints={showBulletPoints}
                  />
                </View>
              )}
            </View>
          );
        }
      )}
    </ResumePDFSection>
  );
};
