# CraftCV

CraftCV is a fast, privacy-first, open-source resume builder and ATS parser.

Create beautiful LaTeX and modern professional resumes with live real-time PDF preview, curated templates, and native local AI agent support.

## Resume Builder

CraftCV's resume builder allows you to create modern professional and LaTeX-style resumes effortlessly.

![Resume Builder Demo](https://i.ibb.co/jzcrrt8/resume-builder-demo-optimize.gif)

Core Features:
| <div style="width:285px">**Feature**</div> | **Description** |
|---|---|
| **1. Real Time PDF Compilation** | The resume PDF updates in real time as you edit information, with debounced compilation to prevent CPU lag. |
| **2. Multi-Template Selection** | Choose across 8 curated ATS-friendly resume templates including iconic LaTeX styles: **Jake's LaTeX** (Overleaf CS standard with `\hrulefill`), **ModernCV LaTeX** (European academic & tech standard with rule accents), **Tech LaTeX** (high-density FAANG engineering layout), **Modern** (clean colored accents), **Classic** (traditional corporate centered header), **Executive** (bold header line & solid accents), **Minimal** (clean Swiss typography), and **Compact** (dense 1-page space saver). |
| **3. ATS-Friendly & Battle-Tested** | Adheres to top ATS best practices (Greenhouse, Lever, Workday) with deterministic text layer rendering, bullet consistency, and proper typography. |
| **4. 100% Privacy-First & Offline** | Runs entirely in your browser. No sign-up, no analytics tracking, no external database. Data never leaves your machine. |
| **5. Import Existing PDF / JSON** | Import existing resume PDFs for ATS extraction or drag-and-drop AI-generated `resume.json` files directly into the builder. |
| **6. Local AI Agent Ready** | Native prompt recipes and schema for local coding agents (AGY, Kimi, Cursor, Claude, Ollama) to build and tailor resumes. |

## Resume Template Gallery

CraftCV includes 8 distinct, ATS-optimized templates. Every template is fully customizable in font family, font size, theme color, document size (Letter/A4), and section order.

| **Jake's LaTeX (`latex-jakes`)** | **ModernCV LaTeX (`latex-moderncv`)** |
| :---: | :---: |
| <img src="public/examples/latex-jakes.png" width="380" alt="Jake's LaTeX Template"> | <img src="public/examples/latex-moderncv.png" width="380" alt="ModernCV LaTeX Template"> |
| *Overleaf CS Gold Standard with `\hrulefill` dividers* | *European Academic & Tech style with horizontal rule accents* |

| **Tech LaTeX (`latex-sb2nov`)** | **Compact (`compact`)** |
| :---: | :---: |
| <img src="public/examples/latex-sb2nov.png" width="380" alt="Tech LaTeX Template"> | <img src="public/examples/compact.png" width="380" alt="Compact Template"> |
| *Silicon Valley FAANG high-density engineering layout* | *Space-saving 2-column header & dense single-page flow* |

| **Executive (`executive`)** | **Minimal (`minimal`)** |
| :---: | :---: |
| <img src="public/examples/executive.png" width="380" alt="Executive Template"> | <img src="public/examples/minimal.png" width="380" alt="Minimal Template"> |
| *Bold header band & solid vertical accent bars* | *Swiss typography with wide tracking & airy whitespace* |

| **Classic (`classic`)** | **Modern (`modern`)** |
| :---: | :---: |
| <img src="public/examples/classic.png" width="380" alt="Classic Template"> | <img src="public/examples/modern.png" width="380" alt="Modern Template"> |
| *Traditional corporate centered header & underline dividers* | *Original layout with top accent bar & badge markers* |

## Resume Parser

CraftCV's second component is the resume parser playground to inspect ATS text extraction, line grouping, and section identification.

![Resume Parser Demo](https://i.ibb.co/JvSVwNk/resume-parser-demo-optimize.gif)

## Tech Stack

| <div style="width:140px">**Category**</div> | <div style="width:100px">**Choice**</div> | **Descriptions** |
|---|---|---|
| **Language** | [TypeScript](https://github.com/microsoft/TypeScript) | Static type safety and structured models. |
| **UI Library** | [React 18](https://github.com/facebook/react) | Declarative component architecture. |
| **State Management** | [Redux Toolkit](https://github.com/reduxjs/redux-toolkit) | Centralized resume state with debounced localStorage persistence. |
| **CSS Framework** | [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | Utility-first responsive design. |
| **Web Framework** | [Next.js 13](https://github.com/vercel/next.js) | App router with static optimization. |
| **PDF Engine** | [PDF.js](https://github.com/mozilla/pdf.js) & [React-PDF](https://github.com/diegomura/react-pdf) | Robust PDF text extraction and client-side vector PDF generation. |

## Quick Start

```bash
git clone https://github.com/TomCallan/open-resume.git craft-cv
cd craft-cv
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To run tests:
```bash
npm test
```

## Performance and Architecture Highlights

- **Zero-Latency Typing**: State persistence to `localStorage` is debounced (500ms) with an automatic `beforeunload` flush, preventing main-thread blocking during rapid typing.
- **Efficient PDF Compilation**: PDF document generation via `@react-pdf/renderer` is debounced to avoid CPU thrashing on continuous keystrokes, with visual download preparation states.
- **Memoized ATS Parser Pipeline**: Text extraction, line grouping, and section scoring in the Resume Parser Playground are fully memoized using `useMemo` to eliminate redundant recalculations across UI updates.
- **Resource and Memory Safety**: Automatic revocation of browser `blob:` object URLs upon file removal and unmount prevents memory leaks during heavy PDF uploads.
- **Optimized Window Listeners**: Centralized, animation-frame-throttled resize listeners for dynamic autosizing inputs replace dozens of individual global event listeners.

## Local AI Agent Integration (AGY, Kimi, Cursor, Claude, Ollama)

CraftCV supports direct integration with local coding agents and LLMs (such as **Antigravity / AGY**, **Kimi**, **Cursor**, **Claude Code**, or local **Ollama** models) to build, tailor, and format resumes locally with zero data ever sent to third-party resume platforms.

### 1. How It Works
AI agents can generate a CraftCV-compliant `resume.json` file. You can simply drag and drop the `.json` file into `/resume-import` (or browser dropzone), and CraftCV will immediately render your fully editable resume with your selected template.

### 2. AI Agent Prompt Template

Copy and pass this instruction to your AI agent (AGY, Kimi, etc.):

```markdown
You are an expert resume writer and ATS optimization specialist.
Generate a structured resume JSON for the candidate tailored to the target job description.
Return ONLY valid JSON matching this schema:

{
  "resume": {
    "profile": {
      "name": "Jane Doe",
      "summary": "Full Stack Engineer with 6+ years building scalable distributed systems...",
      "email": "jane.doe@example.com",
      "phone": "+1 (555) 019-2834",
      "location": "San Francisco, CA",
      "url": "https://linkedin.com/in/janedoe"
    },
    "workExperiences": [
      {
        "company": "Acme Corp",
        "jobTitle": "Senior Software Engineer",
        "date": "2021 - Present",
        "descriptions": [
          "Architected real-time event streaming pipeline processing 10M+ events/day using Kafka and Go",
          "Reduced p99 API latency by 45% through query optimization and Redis caching layer"
        ]
      }
    ],
    "educations": [
      {
        "school": "University of California, Berkeley",
        "degree": "B.S. in Computer Science",
        "date": "2015 - 2019",
        "gpa": "3.85",
        "descriptions": ["Dean's Honor List, Magna Cum Laude"]
      }
    ],
    "projects": [
      {
        "project": "OpenSource Tool",
        "date": "2023",
        "descriptions": ["Built CLI developer tool with 2k+ GitHub stars using TypeScript and Rust"]
      }
    ],
    "skills": {
      "featuredSkills": [
        { "skill": "TypeScript", "rating": 5 },
        { "skill": "React / Next.js", "rating": 5 },
        { "skill": "Go / Python", "rating": 4 },
        { "skill": "PostgreSQL", "rating": 4 },
        { "skill": "Kubernetes", "rating": 4 },
        { "skill": "GraphQL", "rating": 4 }
      ],
      "descriptions": [
        "Languages & Frameworks: TypeScript, JavaScript, Python, Go, React, Next.js, Node.js",
        "Cloud & DevOps: AWS, Docker, Kubernetes, Terraform, GitHub Actions, CI/CD"
      ]
    },
    "custom": {
      "descriptions": []
    }
  },
  "settings": {
    "template": "latex-jakes",
    "themeColor": "#38bdf8",
    "fontFamily": "Caladea",
    "fontSize": "11",
    "documentSize": "Letter"
  }
}
```

### 3. Template Options for AI Agents

When specifying `settings.template`, agents can pick any of the 8 built-in styles:
- `"latex-jakes"`: Iconic Overleaf CS gold standard with centered header and `\hrulefill` dividers
- `"latex-moderncv"`: Classic European academic & tech LaTeX style with horizontal rule accents
- `"latex-sb2nov"`: High-density Silicon Valley / FAANG engineering standard
- `"modern"`: Sleek colored accents and section marker bars
- `"classic"`: Traditional corporate centered header with full-width dividers
- `"executive"`: Bold header line with solid vertical accent bars
- `"minimal"`: Clean Swiss typography with tracked uppercase headings and airy margins
- `"compact"`: Dense single-page layout for maximizing space on tech resumes

### 4. Direct Browser Injection (Optional)
If running automated scripts or browser sidecars, agents can inject the state directly into the browser session:
```javascript
localStorage.setItem("craftcv-state", JSON.stringify({ resume, settings }));
window.location.href = "/resume-builder";
```


