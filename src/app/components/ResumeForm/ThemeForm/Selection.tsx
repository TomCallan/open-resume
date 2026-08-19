import type { GeneralSetting, TemplateType } from "lib/redux/settingsSlice";
import { PX_PER_PT } from "lib/constants";
import {
  FONT_FAMILY_TO_STANDARD_SIZE_IN_PT,
  FONT_FAMILY_TO_DISPLAY_NAME,
  type FontFamily,
} from "components/fonts/constants";
import { getAllFontFamiliesToLoad } from "components/fonts/lib";
import dynamic from "next/dynamic";

const Selection = ({
  selectedColor,
  isSelected,
  style = {},
  onClick,
  children,
}: {
  selectedColor: string;
  isSelected: boolean;
  style?: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const selectedStyle = {
    color: "white",
    backgroundColor: selectedColor,
    borderColor: selectedColor,
    ...style,
  };

  return (
    <div
      className="flex w-[105px] cursor-pointer items-center justify-center rounded-md border border-gray-300 py-1.5 shadow-sm hover:border-gray-400 hover:bg-gray-100"
      onClick={onClick}
      style={isSelected ? selectedStyle : style}
      onKeyDown={(e) => {
        if (["Enter", " "].includes(e.key)) onClick();
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

const SelectionsWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div className="mt-2 flex flex-wrap gap-3">{children}</div>;
};

export interface TemplateOption {
  type: TemplateType;
  title: string;
  badge?: string;
  description: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    type: "modern",
    title: "Modern",
    badge: "Popular",
    description: "Sleek top accent bar with colored section markers",
  },
  {
    type: "latex-jakes",
    title: "Jake's LaTeX",
    badge: "Overleaf CS",
    description: "The #1 gold-standard Overleaf tech resume with \\hrulefill dividers",
  },
  {
    type: "latex-moderncv",
    title: "ModernCV LaTeX",
    badge: "Academic",
    description: "Classic European LaTeX template with full-width rule accents",
  },
  {
    type: "latex-sb2nov",
    title: "Tech LaTeX",
    badge: "FAANG",
    description: "High-density Silicon Valley engineering layout with crisp dividers",
  },
  {
    type: "classic",
    title: "Classic",
    badge: "Corporate",
    description: "Traditional centered header with full-width dividers",
  },
  {
    type: "executive",
    title: "Executive",
    badge: "Leadership",
    description: "Bold header line with solid vertical accent bars",
  },
  {
    type: "minimal",
    title: "Minimal",
    badge: "Clean",
    description: "Swiss typography with wide tracking & airy spacing",
  },
  {
    type: "compact",
    title: "Compact",
    badge: "1-Page Tech",
    description: "Dense layout with split header for maximum content",
  },
];

export const TemplateSelections = ({
  selectedTemplate,
  themeColor,
  handleSettingsChange,
}: {
  selectedTemplate: TemplateType;
  themeColor: string;
  handleSettingsChange: (field: GeneralSetting, value: string) => void;
}) => {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATE_OPTIONS.map(({ type, title, badge, description }) => {
        const isSelected = selectedTemplate === type;
        return (
          <div
            key={type}
            className={`cursor-pointer rounded-lg border-2 p-3 text-left transition-all shadow-sm ${
              isSelected
                ? "border-sky-500 bg-sky-50/50 shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            style={
              isSelected
                ? {
                    borderColor: themeColor,
                    backgroundColor: `${themeColor}12`,
                  }
                : {}
            }
            onClick={() => handleSettingsChange("template", type)}
            onKeyDown={(e) => {
              if (["Enter", " "].includes(e.key))
                handleSettingsChange("template", type);
            }}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{title}</div>
              {badge && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={
                    isSelected
                      ? {
                          backgroundColor: themeColor,
                          color: "white",
                        }
                      : {
                          backgroundColor: "#f1f5f9",
                          color: "#475569",
                        }
                  }
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

const FontFamilySelections = ({
  selectedFontFamily,
  themeColor,
  handleSettingsChange,
}: {
  selectedFontFamily: string;
  themeColor: string;
  handleSettingsChange: (field: GeneralSetting, value: string) => void;
}) => {
  const allFontFamilies = getAllFontFamiliesToLoad();
  return (
    <SelectionsWrapper>
      {allFontFamilies.map((fontFamily, idx) => {
        const isSelected = selectedFontFamily === fontFamily;
        const standardSizePt = FONT_FAMILY_TO_STANDARD_SIZE_IN_PT[fontFamily];
        return (
          <Selection
            key={idx}
            selectedColor={themeColor}
            isSelected={isSelected}
            style={{
              fontFamily,
              fontSize: `${standardSizePt * PX_PER_PT}px`,
            }}
            onClick={() => handleSettingsChange("fontFamily", fontFamily)}
          >
            {FONT_FAMILY_TO_DISPLAY_NAME[fontFamily]}
          </Selection>
        );
      })}
    </SelectionsWrapper>
  );
};

/**
 * Load FontFamilySelections client side since it calls getAllFontFamiliesToLoad,
 * which uses navigator object that is only available on client side
 */
export const FontFamilySelectionsCSR = dynamic(
  () => Promise.resolve(FontFamilySelections),
  {
    ssr: false,
  }
);

export const FontSizeSelections = ({
  selectedFontSize,
  fontFamily,
  themeColor,
  handleSettingsChange,
}: {
  fontFamily: FontFamily;
  themeColor: string;
  selectedFontSize: string;
  handleSettingsChange: (field: GeneralSetting, value: string) => void;
}) => {
  const standardSizePt = FONT_FAMILY_TO_STANDARD_SIZE_IN_PT[fontFamily];
  const compactSizePt = standardSizePt - 1;

  return (
    <SelectionsWrapper>
      {["Compact", "Standard", "Large"].map((type, idx) => {
        const fontSizePt = String(compactSizePt + idx);
        const isSelected = fontSizePt === selectedFontSize;
        return (
          <Selection
            key={idx}
            selectedColor={themeColor}
            isSelected={isSelected}
            style={{
              fontFamily,
              fontSize: `${Number(fontSizePt) * PX_PER_PT}px`,
            }}
            onClick={() => handleSettingsChange("fontSize", fontSizePt)}
          >
            {type}
          </Selection>
        );
      })}
    </SelectionsWrapper>
  );
};

export const DocumentSizeSelections = ({
  selectedDocumentSize,
  themeColor,
  handleSettingsChange,
}: {
  themeColor: string;
  selectedDocumentSize: string;
  handleSettingsChange: (field: GeneralSetting, value: string) => void;
}) => {
  return (
    <SelectionsWrapper>
      {["Letter", "A4"].map((type, idx) => {
        return (
          <Selection
            key={idx}
            selectedColor={themeColor}
            isSelected={type === selectedDocumentSize}
            onClick={() => handleSettingsChange("documentSize", type)}
          >
            <div className="flex flex-col items-center">
              <div>{type}</div>
              <div className="text-xs">
                {type === "Letter" ? "(US, Canada)" : "(other countries)"}
              </div>
            </div>
          </Selection>
        );
      })}
    </SelectionsWrapper>
  );
};

