"use client";
import { Provider } from "react-redux";
import { useSearchParams } from "next/navigation";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { VersionHistoryPanel } from "components/VersionHistoryPanel";

export default function Create() {
  const params = useSearchParams();
  const documentId = params.get("document");

  return (
    <Provider store={store}>
      <main className="relative h-full w-full overflow-hidden bg-gray-50">
        <VersionHistoryPanel documentId={documentId} />
        <div className="grid grid-cols-3 md:grid-cols-6">
          <div className="col-span-3">
            <ResumeForm documentId={documentId} />
          </div>
          <div className="col-span-3">
            <Resume />
          </div>
        </div>
      </main>
    </Provider>
  );
}