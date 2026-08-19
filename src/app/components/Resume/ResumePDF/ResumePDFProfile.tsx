import { View } from "@react-pdf/renderer";
import {
  ResumePDFIcon,
  type IconType,
} from "components/Resume/ResumePDF/common/ResumePDFIcon";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFLink,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import type { ResumeProfile } from "lib/redux/types";
import { DEFAULT_FONT_COLOR, type TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFProfile = ({
  profile,
  themeColor,
  isPDF,
  template = "modern",
}: {
  profile: ResumeProfile;
  themeColor: string;
  isPDF: boolean;
  template?: TemplateType;
}) => {
  const { name, email, phone, url, summary, location } = profile;
  const iconProps = { email, phone, location, url };

  const renderContactItem = (key: string, value: string, showIcon = true) => {
    let iconType = key as IconType;
    if (key === "url") {
      if (value.includes("github")) {
        iconType = "url_github";
      } else if (value.includes("linkedin")) {
        iconType = "url_linkedin";
      }
    }

    let src = "";
    switch (key) {
      case "email":
        src = `mailto:${value}`;
        break;
      case "phone":
        src = `tel:${value.replace(/[^\d+]/g, "")}`;
        break;
      default:
        src = value.startsWith("http") ? value : `https://${value}`;
    }

    const isLink = ["email", "url", "phone"].includes(key);

    const content = (
      <View
        key={key}
        style={{
          ...styles.flexRow,
          alignItems: "center",
          gap: spacing["1"],
        }}
      >
        {showIcon && <ResumePDFIcon type={iconType} isPDF={isPDF} />}
        <ResumePDFText>{value}</ResumePDFText>
      </View>
    );

    if (isLink) {
      return (
        <ResumePDFLink key={key} src={src} isPDF={isPDF}>
          {content}
        </ResumePDFLink>
      );
    }
    return content;
  };

  const activeContactEntries = Object.entries(iconProps).filter(
    ([_, value]) => Boolean(value)
  );

  if (template === "classic") {
    return (
      <ResumePDFSection
        template={template}
        themeColor={themeColor}
        style={{ marginTop: spacing["3"], alignItems: "center" }}
      >
        <ResumePDFText
          bold={true}
          themeColor={themeColor}
          style={{
            fontSize: "20pt",
            textAlign: "center",
            letterSpacing: "0.8pt",
            textTransform: "uppercase",
          }}
        >
          {name}
        </ResumePDFText>
        {summary && (
          <ResumePDFText
            style={{
              textAlign: "center",
              marginTop: spacing["0.5"],
              paddingLeft: spacing["10"],
              paddingRight: spacing["10"],
            }}
          >
            {summary}
          </ResumePDFText>
        )}
        <View
          style={{
            ...styles.flexRow,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: spacing["2"],
            marginTop: spacing["1"],
          }}
        >
          {activeContactEntries.map(([key, value], idx) => (
            <View
              key={key}
              style={{ ...styles.flexRow, alignItems: "center", gap: spacing["1.5"] }}
            >
              {idx > 0 && <ResumePDFText style={{ color: "#94a3b8" }}>•</ResumePDFText>}
              {renderContactItem(key, value, true)}
            </View>
          ))}
        </View>
      </ResumePDFSection>
    );
  }

  if (template === "compact") {
    return (
      <ResumePDFSection
        template={template}
        themeColor={themeColor}
        style={{ marginTop: spacing["2"] }}
      >
        <View style={{ ...styles.flexRowBetween, alignItems: "flex-start" }}>
          <View style={{ ...styles.flexCol, flex: 1, marginRight: spacing["4"] }}>
            <ResumePDFText
              bold={true}
              themeColor={themeColor}
              style={{ fontSize: "17pt", letterSpacing: "0.3pt" }}
            >
              {name}
            </ResumePDFText>
            {summary && (
              <ResumePDFText style={{ marginTop: spacing["0.5"], fontSize: "9.5pt" }}>
                {summary}
              </ResumePDFText>
            )}
          </View>
          <View
            style={{
              ...styles.flexCol,
              alignItems: "flex-end",
              gap: spacing["0.5"],
            }}
          >
            {activeContactEntries.map(([key, value]) =>
              renderContactItem(key, value, true)
            )}
          </View>
        </View>
      </ResumePDFSection>
    );
  }

  if (template === "executive") {
    return (
      <ResumePDFSection
        template={template}
        themeColor={themeColor}
        style={{ marginTop: spacing["4"] }}
      >
        <View
          style={{
            ...styles.flexCol,
            borderBottomWidth: 2,
            borderBottomColor: themeColor || "#0ea5e9",
            borderBottomStyle: "solid",
            paddingBottom: spacing["2.5"],
          }}
        >
          <ResumePDFText
            bold={true}
            themeColor={themeColor}
            style={{ fontSize: "22pt", letterSpacing: "0.5pt" }}
          >
            {name}
          </ResumePDFText>
          {summary && (
            <ResumePDFText
              style={{
                marginTop: spacing["1"],
                color: "#374151",
              }}
            >
              {summary}
            </ResumePDFText>
          )}
          <View
            style={{
              ...styles.flexRowBetween,
              flexWrap: "wrap",
              marginTop: spacing["2"],
              gap: spacing["2"],
            }}
          >
            {activeContactEntries.map(([key, value]) =>
              renderContactItem(key, value, true)
            )}
          </View>
        </View>
      </ResumePDFSection>
    );
  }

  if (template === "minimal") {
    return (
      <ResumePDFSection
        template={template}
        themeColor={themeColor}
        style={{ marginTop: spacing["4"] }}
      >
        <ResumePDFText
          bold={true}
          style={{
            fontSize: "22pt",
            letterSpacing: "0.5pt",
            color: DEFAULT_FONT_COLOR,
          }}
        >
          {name}
        </ResumePDFText>
        {summary && (
          <ResumePDFText style={{ color: "#475569", marginTop: spacing["0.5"] }}>
            {summary}
          </ResumePDFText>
        )}
        <View
          style={{
            ...styles.flexRow,
            flexWrap: "wrap",
            gap: spacing["3"],
            marginTop: spacing["1.5"],
          }}
        >
          {activeContactEntries.map(([key, value]) =>
            renderContactItem(key, value, false)
          )}
        </View>
      </ResumePDFSection>
    );
  }

  // Default "modern"
  return (
    <ResumePDFSection template={template} themeColor={themeColor} style={{ marginTop: spacing["4"] }}>
      <ResumePDFText
        bold={true}
        themeColor={themeColor}
        style={{ fontSize: "20pt" }}
      >
        {name}
      </ResumePDFText>
      {summary && <ResumePDFText>{summary}</ResumePDFText>}
      <View
        style={{
          ...styles.flexRowBetween,
          flexWrap: "wrap",
          marginTop: spacing["0.5"],
        }}
      >
        {activeContactEntries.map(([key, value]) =>
          renderContactItem(key, value, true)
        )}
      </View>
    </ResumePDFSection>
  );
};
