'use client'

import { useEffect, useMemo, useState } from "react";

type StorageFile = {
  name: string;
  path: string;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatBytes(value: number | null) {
  if (!value || Number.isNaN(value)) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Home() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [status, setStatus] = useState("Ready");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryTarget, setSummaryTarget] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const totalSize = useMemo(() => {
    return files.reduce((acc, item) => acc + (item.size ?? 0), 0);
  }, [files]);

  async function readJsonSafely(res: Response) {
    const text = await res.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function fetchFiles() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/files", { cache: "no-store" });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Failed to load files.");
      }
      setFiles(data.items ?? []);
      setStatus("Library synced.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleUpload() {
    if (!selectedFile) {
      setStatus("Choose a PDF before uploading.");
      return;
    }
    setIsUploading(true);
    setStatus("Uploading to Supabase...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Upload failed.");
      }
      setSelectedFile(null);
      await fetchFiles();
      setStatus("Upload complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(path: string) {
    setStatus("Preparing download link...");
    try {
      const res = await fetch(`/api/files?download=${encodeURIComponent(path)}`);
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Download failed.");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      setStatus("Download link ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    }
  }

  async function handleDelete(path: string) {
    setStatus("Removing file...");
    try {
      const res = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Delete failed.");
      }
      await fetchFiles();
      setStatus("File removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    }
  }

  async function handleSummarize(path: string, name: string) {
    setIsSummarizing(true);
    setSummaryTarget(path);
    setSummaryText(null);
    setStatus(`Summarizing ${name}...`);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Summary failed.");
      }
      setSummaryText(data.summary ?? "");
      setStatus("Summary ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="hero-label">Supabase storage hub</p>
          <h1>AI Summary App</h1>
          <p className="hero-subtitle">
            Upload PDF documents, manage your library, and hand off files to the
            summarizer pipeline.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-card-label">Status</p>
          <p className="hero-card-value">{status}</p>
          <div className="hero-metrics">
            <div>
              <span className="metric-label">Documents</span>
              <span className="metric-value">{files.length}</span>
            </div>
            <div>
              <span className="metric-label">Total size</span>
              <span className="metric-value">{formatBytes(totalSize)}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="panel upload-panel">
        <div>
          <h2>Upload PDF</h2>
          <p className="panel-subtitle">
            Files are stored in your Supabase bucket and listed below.
          </p>
        </div>
        <div className="upload-controls">
          <label className="file-input">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
            />
            <span>{selectedFile ? selectedFile.name : "Choose PDF"}</span>
          </label>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={fetchFiles}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="panel files-panel">
        <div className="files-header">
          <div>
            <h2>Document library</h2>
            <p className="panel-subtitle">
              Use download links for the summarizer or remove outdated PDFs.
            </p>
          </div>
        </div>
        {files.length === 0 ? (
          <div className="empty-state">
            <p>No PDFs yet. Upload a document to get started.</p>
          </div>
        ) : (
          <div className="file-grid">
            {files.map((file) => (
              <article key={file.path} className="file-card">
                <div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-meta">
                    {formatBytes(file.size)} · {formatDate(file.updated_at)}
                  </p>
                </div>
                <div className="file-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleSummarize(file.path, file.name)}
                    disabled={isSummarizing && summaryTarget === file.path}
                  >
                    {isSummarizing && summaryTarget === file.path
                      ? "Summarizing..."
                      : "Summarize"}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleDownload(file.path)}
                  >
                    Download
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(file.path)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {summaryTarget && summaryText !== null && (
          <div className="summary-panel">
            <div className="summary-header">
              <h3 className="summary-title">Summary</h3>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSummaryTarget(null);
                  setSummaryText(null);
                }}
              >
                Clear
              </button>
            </div>
            <p className="summary-text">{summaryText}</p>
          </div>
        )}
      </section>
    </div>
  );
}