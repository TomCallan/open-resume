import { View } from "@react-pdf/renderer";
import {
  ResumePDFSection,
  ResumePDFBulletList,
  ResumeFeaturedSkill,
} from "components/Resume/ResumePDF/common";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeSkills } from "lib/redux/types";
import type { TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFSkills = ({
  heading,
  skills,
  themeColor,
  showBulletPoints,
  template = "modern",
}: {
  heading: string;
  skills: ResumeSkills;
  themeColor: string;
  showBulletPoints: boolean;
  template?: TemplateType;
}) => {
  const { descriptions, featuredSkills } = skills;
  const featuredSkillsWithText = featuredSkills.filter((item) => item.skill);
  const isLatexOrMinimal =
    template === "latex-jakes" ||
    template === "latex-sb2nov" ||
    template === "minimal" ||
    template === "compact";

  const featuredSkillsPair = [
    [featuredSkillsWithText[0], featuredSkillsWithText[3]],
    [featuredSkillsWithText[1], featuredSkillsWithText[4]],
    [featuredSkillsWithText[2], featuredSkillsWithText[5]],
  ];

  return (
    <ResumePDFSection template={template} themeColor={themeColor} heading={heading}>
      {featuredSkillsWithText.length > 0 &&
        (!isLatexOrMinimal ? (
          <View style={{ ...styles.flexRowBetween, marginTop: spacing["0.5"] }}>
            {featuredSkillsPair.map((pair, idx) => (
              <View
                key={idx}
                style={{
                  ...styles.flexCol,
                }}
              >
                {pair.map((featuredSkill, idx) => {
                  if (!featuredSkill) return null;
                  return (
                    <ResumeFeaturedSkill
                      key={idx}
                      skill={featuredSkill.skill}
                      rating={featuredSkill.rating}
                      themeColor={themeColor}
                      style={{
                        justifyContent: "flex-end",
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ ...styles.flexCol, marginTop: spacing["0.5"] }}>
            <ResumePDFBulletList
              items={[
                featuredSkillsWithText.map((s) => s.skill).join("  •  "),
              ]}
              showBulletPoints={showBulletPoints}
            />
          </View>
        ))}
      <View style={{ ...styles.flexCol }}>
        <ResumePDFBulletList
          items={descriptions}
          showBulletPoints={showBulletPoints}
        />
      </View>
    </ResumePDFSection>
  );
};
