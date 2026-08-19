import { Link } from "components/documentation";

const QAS = [
  {
    question:
      "Q1. What is a resume builder? Why is a resume builder better than a static template?",
    answer: (
      <>
        <p>
          There are two ways to create a resume today: manually editing document templates (Google Docs / Word / raw LaTeX files) or using a dedicated builder like CraftCV that automatically generates clean, ATS-tested PDFs in real time.
        </p>
        <p>
          Manual templates lead to frustrating spacing errors, misalignment, broken font styles, and broken ATS text layers. CraftCV eliminates manual formatting headaches by generating perfect typographic hierarchy, margins, and bullet formatting with instant live preview.
        </p>
      </>
    ),
  },
  {
    question:
      "Q2. What uniquely sets CraftCV apart from other resume builders and templates?",
    answer: (
      <>
        <p>
          CraftCV stands out with 3 distinctive advantages:
        </p>
        <p>
          <span className="font-semibold">
            1. Curated Modern & Iconic LaTeX Templates.
          </span>
          <br />
          CraftCV offers 8 battle-tested ATS-friendly templates, including Jake's LaTeX (Overleaf CS standard), ModernCV, Tech LaTeX, Compact single-page layouts, Executive, Minimal, Classic, and Modern.
        </p>
        <p>
          <span className="font-semibold">
            2. 100% Privacy-First & Offline Capable.
          </span>
          <br />
          No accounts, no email gates, no backend database. All your data stays locally inside your browser, protected by debounced local storage persistence.
        </p>
        <p>
          <span className="font-semibold">
            3. Native Local AI Agent Support.
          </span>
          <br />
          Seamlessly integrate with local coding agents (AGY, Kimi, Cursor, Claude, Ollama) by dropping in JSON resume files directly into the builder.
        </p>
      </>
    ),
  },
  {
    question: "Q3. Is CraftCV free to use?",
    answer: (
      <p>
        Yes, CraftCV is 100% free and open-source under the MIT license. There are no hidden paywalls, export restrictions, or watermarks.
      </p>
    ),
  },
  {
    question: "Q4. How can I contribute or report issues?",
    answer: (
      <>
        <p>
          CraftCV is open-source. You can contribute, submit feature requests, or report issues directly on{" "}
          <Link href="https://github.com/TomCallan/open-resume">
            GitHub
          </Link>.
        </p>
      </>
    ),
  },
];

export const QuestionsAndAnswers = () => {
  return (
    <section className="mx-auto max-w-3xl divide-y divide-gray-300 lg:mt-4 lg:px-2">
      <h2 className="text-center text-3xl font-bold">Questions & Answers</h2>
      <div className="mt-6 divide-y divide-gray-300">
        {QAS.map(({ question, answer }) => (
          <div key={question} className="py-6">
            <h3 className="font-semibold leading-7">{question}</h3>
            <div className="mt-3 grid gap-2 leading-7 text-gray-600">
              {answer}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
