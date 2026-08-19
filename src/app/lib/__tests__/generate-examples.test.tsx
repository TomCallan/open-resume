/**
 * @jest-environment node
 */
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

import ReactPDF, { Font } from "@react-pdf/renderer";
import { ResumePDF } from "components/Resume/ResumePDF";
import { END_HOME_RESUME } from "home/constants";
import {
  initialSettings,
  type TemplateType,
} from "lib/redux/settingsSlice";
import { ENGLISH_FONT_FAMILIES } from "components/fonts/constants";
import path from "path";
import fs from "fs";

describe("PDF Template Generation", () => {
  const templates: { type: TemplateType; font?: string; themeColor?: string }[] = [
    { type: "modern", themeColor: "#38bdf8" },
    { type: "latex-jakes", font: "Caladea" },
    { type: "latex-moderncv", font: "Roboto", themeColor: "#0284c7" },
    { type: "latex-sb2nov", font: "Caladea", themeColor: "#1e293b" },
    { type: "classic", font: "Caladea" },
    { type: "executive", font: "OpenSans", themeColor: "#0ea5e9" },
    { type: "minimal", font: "Lato" },
    { type: "compact", font: "Roboto", themeColor: "#2563eb" },
  ];

  const publicOutputDir = path.join(process.cwd(), "public", "examples");
  const artifactOutputDir = "C:/Users/TomCa/.gemini/antigravity-cli/brain/ccca5c3c-84fa-45f9-87f7-ff0506916817/examples";

  beforeAll(() => {
    fs.mkdirSync(publicOutputDir, { recursive: true });
    try {
      fs.mkdirSync(artifactOutputDir, { recursive: true });
    } catch {}

    ENGLISH_FONT_FAMILIES.forEach((fontFamily) => {
      const regularPath = path.join(process.cwd(), "public", "fonts", `${fontFamily}-Regular.ttf`);
      const boldPath = path.join(process.cwd(), "public", "fonts", `${fontFamily}-Bold.ttf`);

      if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
        Font.register({
          family: fontFamily,
          fonts: [
            { src: regularPath },
            { src: boldPath, fontWeight: "bold" },
          ],
        });
      }
    });
  });

  for (const { type, font, themeColor } of templates) {
    it(`generates PDF binary for template: ${type}`, async () => {
      const settings = {
        ...initialSettings,
        template: type,
        fontFamily: font || initialSettings.fontFamily,
        themeColor: themeColor || (type.startsWith("latex") ? "" : initialSettings.themeColor),
      };

      const doc = (
        <ResumePDF
          resume={END_HOME_RESUME}
          settings={settings}
          isPDF={true}
        />
      );

      const targetPath = path.join(publicOutputDir, `${type}.pdf`);
      await ReactPDF.renderToFile(doc, targetPath);

      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.statSync(targetPath).size).toBeGreaterThan(1000);

      // Also copy to artifacts dir for easy viewing
      try {
        const artifactPath = path.join(artifactOutputDir, `${type}.pdf`);
        fs.copyFileSync(targetPath, artifactPath);
      } catch {}
    }, 30000);
  }
});
