"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResumeDropzone } from "components/ResumeDropzone";

interface DocSummary {
  id: string;
  name: string;
  updatedAt?: string;
}

export const DocumentsList = () => {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const list = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (res.ok) setDocs(data.documents ?? []);
    } catch {
      setError("Could not load your resumes.");
    }
  }, []);

  useEffect(() => {
    void list();
  }, [list]);

  const createBlank = async () => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Resume" }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/resume-builder?document=${data.id}`);
    }
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/documents/${id}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/resume-builder?document=${data.id}`);
    }
  };

  const del = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) await list();
  };

  const onImported = async (fileUrl: string) => {
    // Called back once the dropzone has parsed (see below).
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
        <button
          onClick={createBlank}
          className="btn-primary rounded-md px-4 py-2"
        >
          New resume
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
          >
            <Link
              href={`/resume-builder?document=${d.id}`}
              className="font-semibold text-gray-900 hover:underline"
            >
              {d.name}
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => duplicate(d.id)}
                className="text-blue-600 hover:underline"
              >
                Duplicate
              </button>
              <button
                onClick={() => del(d.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {docs.length === 0 && !error && (
          <p className="text-gray-500">
            No resumes yet. Create one below or import from a PDF/JSON file.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Import from PDF/JSON
        </h2>
        <ResumeDropzone
          onFileUrlChange={(url) => url && onImported(url)}
          importIntoWorkspace={true}
        />
      </div>
    </div>
  );
};
