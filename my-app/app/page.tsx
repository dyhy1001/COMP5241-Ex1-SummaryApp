'use client'

import { useEffect, useMemo, useState, useRef } from "react";

type StorageFile = {
  name: string;
  path: string;
  size: number | null;
  created_at: string | null;
  updated_at: string | null;
  tag?: string[] | null;
  note_taking?: string | null;
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
  const [uploadName, setUploadName] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryTarget, setSummaryTarget] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewExpiresAt, setPreviewExpiresAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTag, setEditingTag] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [activeView, setActiveView] = useState<
    "preview" | "summary" | "note"
  >("preview");
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUploadCollapsed, setIsUploadCollapsed] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(true);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const previewPanelRef = useRef<HTMLDivElement>(null);

  const languageOptions = [
    "English",
    "Chinese (Simplified)",
    "Chinese (Traditional)",
    "Korean",
    "Japanese",
    "French",
  ];

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
  const summaryViewText = translatedText ?? summaryDisplay;

  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return files;
    }
    return files.filter((file) => {
      const nameMatch = file.name.toLowerCase().includes(query);
      const tags = Array.isArray(file.tag) ? file.tag : [];
      const tagMatch = tags.some((tag) => tag.toLowerCase().includes(query));
      return nameMatch || tagMatch;
    });
  }, [files, searchQuery]);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobileMode(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleUpload() {
    if (!uploadFile) {
      setStatus("Choose a PDF before uploading.");
      return;
    }
    setIsUploading(true);
    setStatus("Uploading to Database...");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("documentName", uploadName.trim());
      formData.append("tags", uploadTags.trim());
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Upload failed.");
      }
      setUploadFile(null);
      setUploadName("");
      setUploadTags("");
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
    setPreviewError(null);
    setPreviewExpiresAt(null);
    setIsPreviewLoading(true);
    setStatus(`Loading preview for ${name}...`);

    try {
      const res = await fetch(`/api/files?download=${encodeURIComponent(path)}`);
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Preview failed.");
      }
      setPreviewUrl(data.url);
      setPreviewExpiresAt(Date.now() + 900000);
      setStatus("Preview ready.");
      setActiveView("preview");
    } catch (error) {
      setPreviewError("Preview link expired. Please reload the document.");
      setStatus("Preview link expired.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (!previewExpiresAt) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      setPreviewUrl(null);
      setPreviewError("Preview link expired. Please reload the document.");
    }, Math.max(previewExpiresAt - Date.now(), 0));

    return () => window.clearTimeout(timeout);
  }, [previewExpiresAt]);

  useEffect(() => {
    setNoteDraft(selectedDocument?.note_taking ?? "");
  }, [selectedDocument?.note_taking]);

  useEffect(() => {
    setTranslatedText(null);
  }, [summaryDisplay]);

  useEffect(() => {
    if (selectedDocument) {
      setIsUploadCollapsed(true);
      setIsLibraryCollapsed(true);
      setIsPreviewCollapsed(false);
      setTimeout(() => {
        previewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDocument]);

  function startEditing(file: StorageFile) {
    setEditingPath(file.path);
    setEditingName(file.name);
    const tagText = Array.isArray(file.tag) ? file.tag.join(", ") : "";
    setEditingTag(tagText);
  }

  function cancelEditing() {
    setEditingPath(null);
    setEditingName("");
    setEditingTag("");
  }

  async function saveEditing(path: string) {
    if (!editingName.trim()) {
      setStatus("Document title cannot be empty.");
      return;
    }
    setIsSavingEdit(true);
    setStatus("Saving changes...");

    try {
      const res = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          documentName: editingName,
          tag: editingTag,
        }),
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Update failed.");
      }
      await fetchFiles();
      setStatus("Document updated.");
      cancelEditing();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function saveNote(path: string) {
    setIsSavingNote(true);
    setStatus("Saving note...");

    try {
      const res = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          note_taking: noteDraft,
        }),
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Note save failed.");
      }
      await fetchFiles();
      setStatus("Note saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleTranslateSummary(language: string) {
    if (!summaryDisplay) {
      setStatus("No summary available to translate.");
      return;
    }
    if (language === "English") {
      setTranslatedText(null);
      setStatus("Showing English summary.");
      setIsLanguageMenuOpen(false);
      return;
    }
    if (!language) {
      setStatus("Select a target language.");
      return;
    }
    setSelectedLanguage(language);
    setIsTranslating(true);
    setStatus("Translating summary...");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summaryDisplay,
          targetLanguages: [language],
        }),
      });
      const data = await readJsonSafely(res);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Translation failed.");
      }
      const translated = data.translations?.[language] ?? null;
      if (!translated) {
        throw new Error("Translation missing from response.");
      }
      setTranslatedText(translated);
      setStatus("Translation ready.");
      setIsLanguageMenuOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(message);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="hero-label">PDF storage hub</p>
          <h1>AI Summary App</h1>
          <p className="hero-subtitle">
            Upload PDF documents, manage your library, drop your note and hand off files to the
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
            <div className="panel-header mobile-collapsible">
              <button 
                className="collapse-toggle"
                onClick={() => setIsUploadCollapsed(!isUploadCollapsed)}
              >
                <span className={`toggle-arrow${isUploadCollapsed ? " collapsed" : ""}`}>▼</span>
              </button>
              <div>
                <h2>Upload PDF</h2>
                <p className="panel-subtitle">
                  Files are stored in your database and listed below.
                </p>
              </div>
            </div>
            {(!isMobileMode || !isUploadCollapsed) && (
            <div className="upload-controls">
              <label className="file-input">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setUploadFile(file);
                    if (file) {
                      setUploadName(file.name);
                    }
                  }}
                />
                <span>{uploadFile ? uploadFile.name : "Choose PDF"}</span>
              </label>
              <label className="field">
                <span className="field-label">Document title</span>
                <input
                  className="text-input"
                  type="text"
                  placeholder="Enter a display name"
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Tags</span>
                <input
                  className="text-input"
                  type="text"
                  placeholder="Add tags separated by commas"
                  value={uploadTags}
                  onChange={(event) => setUploadTags(event.target.value)}
                />
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
            )}
          </section>

          <section className="panel library-panel">
            <div className="panel-header mobile-collapsible">
              <button 
                className="collapse-toggle"
                onClick={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
              >
                <span className={`toggle-arrow${isLibraryCollapsed ? " collapsed" : ""}`}>▼</span>
              </button>
              <div>
                <h2>Document library</h2>
                <p className="panel-subtitle">
                  Select a PDF to preview or run the summarizer.
                </p>
              </div>
            </div>
            {(!isMobileMode || !isLibraryCollapsed) && (
            <>
            <label className="search-field">
              <span className="field-label">Search</span>
              <input
                className="text-input"
                type="search"
                placeholder="Search by title or tag"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            {filteredFiles.length === 0 ? (
              <div className="empty-state">
                <p>
                  {files.length === 0
                    ? "No PDFs yet. Upload a document to get started."
                    : "No matches. Try a different search."}
                </p>
              </div>
            ) : (
              <div className="library-list">
                {filteredFiles.map((file) => (
                  <article
                    key={file.path}
                    className={`library-item${
                      selectedPath === file.path ? " is-active" : ""
                    }`}
                  >
                    {editingPath === file.path ? (
                      <div className="edit-block">
                        <label className="field">
                          <span className="field-label">Document title</span>
                          <input
                            className="text-input"
                            type="text"
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span className="field-label">Tags</span>
                          <input
                            className="text-input"
                            type="text"
                            value={editingTag}
                            onChange={(event) =>
                              setEditingTag(event.target.value)
                            }
                          />
                        </label>
                        <div className="edit-actions">
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => saveEditing(file.path)}
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? "Saving..." : "Save"}
                          </button>
                          <button
                            className="btn btn-ghost btn-small"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="library-select"
                        onClick={() => handleSelect(file.path, file.name)}
                      >
                        <span className="library-title">{file.name}</span>
                        <span className="library-meta">
                          {formatBytes(file.size)} · {formatDate(file.updated_at)}
                        </span>
                        {Array.isArray(file.tag) && file.tag.length > 0 && (
                          <span className="tag-row">
                            {file.tag.map((tag) => (
                              <span key={tag} className="tag-pill">
                                #{tag}
                              </span>
                            ))}
                          </span>
                        )}
                      </button>
                    )}
                    <div className="library-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => startEditing(file)}
                      >
                        Edit
                      </button>
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
            </>
            )}
          </section>
        </div>

        <div className="right-column">
          <section className="panel preview-panel" ref={previewPanelRef}>
            <div className="panel-header mobile-collapsible">
              <button 
                className="collapse-toggle"
                onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
              >
                <span className={`toggle-arrow${isPreviewCollapsed ? " collapsed" : ""}`}>▼</span>
              </button>
              <div>
                <h2>Preview</h2>
                <p className="panel-subtitle">
                  {selectedDocument
                    ? `Viewing ${selectedDocument.name}`
                    : "Select a document to preview."}
                </p>
              </div>
            </div>
            {(!isMobileMode || !isPreviewCollapsed) && (
            <>
            <div className="view-tabs">
              <button
                className={`tab-button${
                  activeView === "preview" ? " is-active" : ""
                }`}
                onClick={() => {
                  if (selectedDocument) {
                    handleSelect(selectedDocument.path, selectedDocument.name);
                  } else {
                    setActiveView("preview");
                  }
                }}
                disabled={!selectedDocument}
              >
                Preview document
              </button>
              <button
                className={`tab-button${
                  activeView === "summary" ? " is-active" : ""
                }`}
                onClick={() => {
                  if (selectedDocument) {
                    if (summaryDisplay) {
                      setActiveView("summary");
                    } else {
                      handleSummarize(selectedDocument.path, selectedDocument.name);
                      setActiveView("summary");
                    }
                  }
                }}
                disabled={!selectedDocument || isSummarizing}
              >
                {isSummarizing ? "Summarizing" : "AI summary"}
              </button>
              <button
                className={`tab-button${
                  activeView === "note" ? " is-active" : ""
                }`}
                onClick={() => setActiveView("note")}
                disabled={!selectedDocument}
              >
                Note taking
              </button>
            </div>
            <div className="preview-shell">
              {activeView === "preview" && (
                <>
                  {isPreviewLoading ? (
                    <div className="preview-placeholder">Loading preview...</div>
                  ) : previewError ? (
                    <div className="preview-placeholder">
                      {previewError}
                    </div>
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
                </>
              )}
              {activeView === "summary" && (
                <div className="summary-panel summary-panel-inline">
                  <div className="summary-header">
                    <div>
                      <h3 className="summary-title">Summary</h3>
                      {selectedDocument?.summary_updated_at && (
                        <p className="summary-meta">
                          Updated {formatDate(selectedDocument.summary_updated_at)}
                        </p>
                      )}
                    </div>
                    <div className="translation-control">
                      <button
                        className="btn btn-outline btn-small"
                        onClick={() => setIsLanguageMenuOpen((open) => !open)}
                        disabled={isTranslating || !summaryDisplay}
                      >
                        {isTranslating ? "Translating..." : "Translate"}
                      </button>
                      {isLanguageMenuOpen && (
                        <div className="language-menu">
                          {languageOptions.map((language) => (
                            <button
                              key={language}
                              className="language-item"
                              onClick={() => handleTranslateSummary(language)}
                            >
                              {language}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="summary-text">
                    {summaryViewText ?? "Summarizing......Please refer to the status for updates"}
                  </p>
                </div>
              )}
              {activeView === "note" && (
                <div className="note-panel">
                  <div className="note-header">
                    <h3 className="summary-title">Notes</h3>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() =>
                        selectedDocument && saveNote(selectedDocument.path)
                      }
                      disabled={isSavingNote || !selectedDocument}
                    >
                      {isSavingNote ? "Saving..." : "Save note"}
                    </button>
                  </div>
                  <textarea
                    className="note-textarea"
                    placeholder="Write your notes here..."
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    rows={12}
                  />
                </div>
              )}
            </div>
            </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}