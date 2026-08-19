import { Text, View, Link } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import { DEFAULT_FONT_COLOR, type TemplateType } from "lib/redux/settingsSlice";

export const ResumePDFSection = ({
  themeColor,
  heading,
  template = "modern",
  style = {},
  children,
}: {
  themeColor?: string;
  heading?: string;
  template?: TemplateType;
  style?: Style;
  children: React.ReactNode;
}) => {
  const renderHeading = () => {
    if (!heading) return null;

    if (template === "classic") {
      return (
        <View
          style={{
            ...styles.flexRow,
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: themeColor || "#cbd5e1",
            borderBottomStyle: "solid",
            paddingBottom: spacing["0.5"],
            marginBottom: spacing["1"],
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              letterSpacing: "0.8pt",
              fontSize: "10.5pt",
              color: themeColor || DEFAULT_FONT_COLOR,
              textTransform: "uppercase",
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          >
            {heading}
          </Text>
        </View>
      );
    }

    if (template === "executive") {
      return (
        <View
          style={{
            ...styles.flexRow,
            alignItems: "center",
            borderLeftWidth: 3.5,
            borderLeftColor: themeColor || "#0284c7",
            borderLeftStyle: "solid",
            paddingLeft: spacing["2"],
            marginBottom: spacing["0.5"],
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              letterSpacing: "0.5pt",
              color: DEFAULT_FONT_COLOR,
              textTransform: "uppercase",
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          >
            {heading}
          </Text>
        </View>
      );
    }

    if (template === "minimal") {
      return (
        <View
          style={{
            ...styles.flexRow,
            alignItems: "center",
            marginBottom: spacing["0.5"],
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              letterSpacing: "1.5pt",
              color: themeColor || "#475569",
              textTransform: "uppercase",
              fontSize: "9.5pt",
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          >
            {heading}
          </Text>
        </View>
      );
    }

    if (template === "compact") {
      return (
        <View
          style={{
            ...styles.flexRow,
            alignItems: "center",
            borderBottomWidth: 0.5,
            borderBottomColor: themeColor || "#94a3b8",
            borderBottomStyle: "solid",
            paddingBottom: "1pt",
            marginBottom: "2pt",
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              letterSpacing: "0.3pt",
              fontSize: "9.5pt",
              color: themeColor || DEFAULT_FONT_COLOR,
              textTransform: "uppercase",
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          >
            {heading}
          </Text>
        </View>
      );
    }

    // Default "modern"
    return (
      <View style={{ ...styles.flexRow, alignItems: "center" }}>
        {themeColor && (
          <View
            style={{
              height: "3.75pt",
              width: "30pt",
              backgroundColor: themeColor,
              marginRight: spacing["3.5"],
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          />
        )}
        <Text
          style={{
            fontWeight: "bold",
            letterSpacing: "0.3pt",
          }}
          debug={DEBUG_RESUME_PDF_FLAG}
        >
          {heading}
        </Text>
      </View>
    );
  };

  const defaultMarginTop =
    template === "compact"
      ? spacing["3"]
      : template === "minimal"
      ? spacing["4"]
      : spacing["5"];

  return (
    <View
      style={{
        ...styles.flexCol,
        gap: template === "compact" ? spacing["1"] : spacing["2"],
        marginTop: defaultMarginTop,
        ...style,
      }}
    >
      {renderHeading()}
      {children}
    </View>
  );
};

export const ResumePDFText = ({
  bold = false,
  themeColor,
  style = {},
  children,
}: {
  bold?: boolean;
  themeColor?: string;
  style?: Style;
  children: React.ReactNode;
}) => {
  return (
    <Text
      style={{
        color: themeColor || DEFAULT_FONT_COLOR,
        fontWeight: bold ? "bold" : "normal",
        ...style,
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {children}
    </Text>
  );
};

export const ResumePDFBulletList = ({
  items,
  showBulletPoints = true,
}: {
  items: string[];
  showBulletPoints?: boolean;
}) => {
  return (
    <>
      {items.map((item, idx) => (
        <View style={{ ...styles.flexRow }} key={idx}>
          {showBulletPoints && (
            <ResumePDFText
              style={{
                paddingLeft: spacing["2"],
                paddingRight: spacing["2"],
                lineHeight: "1.3",
              }}
              bold={true}
            >
              {"•"}
            </ResumePDFText>
          )}
          {/* A breaking change was introduced causing text layout to be wider than node's width
              https://github.com/diegomura/react-pdf/issues/2182. flexGrow & flexBasis fixes it */}
          <ResumePDFText
            style={{ lineHeight: "1.3", flexGrow: 1, flexBasis: 0 }}
          >
            {item}
          </ResumePDFText>
        </View>
      ))}
    </>
  );
};

export const ResumePDFLink = ({
  src,
  isPDF,
  children,
}: {
  src: string;
  isPDF: boolean;
  children: React.ReactNode;
}) => {
  if (isPDF) {
    return (
      <Link src={src} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={src}
      style={{ textDecoration: "none" }}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

export const ResumeFeaturedSkill = ({
  skill,
  rating,
  themeColor,
  style = {},
}: {
  skill: string;
  rating: number;
  themeColor: string;
  style?: Style;
}) => {
  const numCircles = 5;

  return (
    <View style={{ ...styles.flexRow, alignItems: "center", ...style }}>
      <ResumePDFText style={{ marginRight: spacing[0.5] }}>
        {skill}
      </ResumePDFText>
      {[...Array(numCircles)].map((_, idx) => (
        <View
          key={idx}
          style={{
            height: "9pt",
            width: "9pt",
            marginLeft: "2.25pt",
            backgroundColor: rating >= idx ? themeColor : "#d9d9d9",
            borderRadius: "100%",
          }}
        />
      ))}
    </View>
  );
};
