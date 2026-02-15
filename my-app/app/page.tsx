'use client'

import { useEffect, useMemo, useState } from "react";

type StorageFile = {
  name: string;
  path: string;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
  summary?: string | null;
  summary_updated_at?: string | null;
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryTarget, setSummaryTarget] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const totalSize = useMemo(() => {
    return files.reduce((acc, item) => acc + (item.size ?? 0), 0);
  }, [files]);

  const selectedDocument = useMemo(() => {
    if (!selectedPath) {
      return null;
    }
    return files.find((file) => file.path === selectedPath) ?? null;
  }, [files, selectedPath]);

  const summaryDisplay = summaryText ?? selectedDocument?.summary ?? null;

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
    if (!uploadFile) {
      setStatus("Choose a PDF before uploading.");
      return;
    }
    setIsUploading(true);
    setStatus("Uploading to Supabase...");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Upload failed.");
      }
      setUploadFile(null);
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
    setSelectedPath(path);
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
      await fetchFiles();
      setStatus("Summary ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleSelect(path: string, name: string) {
    setSelectedPath(path);
    setSummaryText(null);
    setPreviewUrl(null);
    setIsPreviewLoading(true);
    setStatus(`Loading preview for ${name}...`);

    try {
      const res = await fetch(`/api/files?download=${encodeURIComponent(path)}`);
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Preview failed.");
      }
      setPreviewUrl(data.url);
      setStatus("Preview ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsPreviewLoading(false);
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

      <div className="main-grid">
        <div className="left-column">
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
                    setUploadFile(event.target.files?.[0] ?? null)
                  }
                />
                <span>{uploadFile ? uploadFile.name : "Choose PDF"}</span>
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

          <section className="panel library-panel">
            <div>
              <h2>Document library</h2>
              <p className="panel-subtitle">
                Select a PDF to preview or run the summarizer.
              </p>
            </div>
            {files.length === 0 ? (
              <div className="empty-state">
                <p>No PDFs yet. Upload a document to get started.</p>
              </div>
            ) : (
              <div className="library-list">
                {files.map((file) => (
                  <article
                    key={file.path}
                    className={`library-item${
                      selectedPath === file.path ? " is-active" : ""
                    }`}
                  >
                    <button
                      className="library-select"
                      onClick={() => handleSelect(file.path, file.name)}
                    >
                      <span className="library-title">{file.name}</span>
                      <span className="library-meta">
                        {formatBytes(file.size)} · {formatDate(file.updated_at)}
                      </span>
                    </button>
                    <div className="library-actions">
                      <button
                        className="btn btn-outline btn-small"
                        onClick={() => handleSummarize(file.path, file.name)}
                        disabled={isSummarizing && summaryTarget === file.path}
                      >
                        {isSummarizing && summaryTarget === file.path
                          ? "Summarizing..."
                          : "Summarize"}
                      </button>
                      <button
                        className="btn btn-outline btn-small"
                        onClick={() => handleDownload(file.path)}
                      >
                        Download
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(file.path)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="right-column">
          <section className="panel preview-panel">
            <div>
              <h2>Preview</h2>
              <p className="panel-subtitle">
                {selectedDocument
                  ? `Viewing ${selectedDocument.name}`
                  : "Select a document to preview."}
              </p>
            </div>
            <div className="preview-shell">
              {isPreviewLoading ? (
                <div className="preview-placeholder">Loading preview...</div>
              ) : previewUrl ? (
                <iframe
                  className="preview-frame"
                  src={previewUrl}
                  title="PDF preview"
                />
              ) : (
                <div className="preview-placeholder">
                  Choose a document from the library to see it here.
                </div>
              )}
            </div>
          </section>

          {summaryDisplay && (
            <div className="summary-panel">
              <div className="summary-header">
                <div>
                  <h3 className="summary-title">Summary</h3>
                  {selectedDocument?.summary_updated_at && (
                    <p className="summary-meta">
                      Updated {formatDate(selectedDocument.summary_updated_at)}
                    </p>
                  )}
                </div>
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
              <p className="summary-text">{summaryDisplay}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}