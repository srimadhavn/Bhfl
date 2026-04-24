"use client";

import { useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const DEFAULT_INPUT = [
  "A->B",
  "A->C",
  "B->D",
  "C->E",
  "E->F",
  "X->Y",
  "Y->Z",
  "Z->X",
  "P->Q",
  "Q->R",
  "G->H",
  "G->H",
  "G->I",
  "hello",
  "1->2",
  "A->",
].join("\n");

function formatTreeNode(label, node, depth = 0) {
  const children = Object.entries(node || {});

  return (
    <li key={`${label}-${depth}`}>
      <span className="node-chip">{label}</span>
      {children.length > 0 ? (
        <ul className="tree-list">
          {children.map(([childLabel, childNode]) => formatTreeNode(childLabel, childNode, depth + 1))}
        </ul>
      ) : null}
    </li>
  );
}

export default function Home() {
  const [rawInput, setRawInput] = useState(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const parsedEntries = useMemo(
    () =>
      rawInput
        .split(/\r?\n|,/) 
        .map((entry) => entry.trim())
        .filter(Boolean),
    [rawInput],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/bfhl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: parsedEntries }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "API request failed");
      }

      setResult(payload);
    } catch (submitError) {
      setResult(null);
      setError(submitError.message || "Unable to process request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">SRM Full Stack Challenge</p>
        <h1>BFHL Hierarchy Explorer</h1>
        <p>Submit node edges and inspect structured hierarchy output from your hosted API.</p>
      </header>

      <main className="content-grid">
        <section className="panel input-panel">
          <h2>Input</h2>
          <p>Enter one edge per line (or comma-separated), e.g. A-&gt;B</p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              rows={14}
              className="edge-input"
              spellCheck={false}
              placeholder="A->B&#10;A->C"
            />
            <div className="action-row">
              <button type="submit" disabled={loading || parsedEntries.length === 0}>
                {loading ? "Processing..." : "Submit to API"}
              </button>
              <span>{parsedEntries.length} entries</span>
            </div>
          </form>
          <p className="api-hint">API base URL: {API_BASE_URL}</p>
          {error ? <p className="error-banner">{error}</p> : null}
        </section>

        <section className="panel output-panel">
          <h2>Output</h2>
          {!result ? (
            <p className="empty-state">No response yet. Submit input to view hierarchy results.</p>
          ) : (
            <>
              <div className="summary-grid">
                <article>
                  <h3>Total Trees</h3>
                  <p>{result.summary?.total_trees ?? 0}</p>
                </article>
                <article>
                  <h3>Total Cycles</h3>
                  <p>{result.summary?.total_cycles ?? 0}</p>
                </article>
                <article>
                  <h3>Largest Tree Root</h3>
                  <p>{result.summary?.largest_tree_root || "N/A"}</p>
                </article>
              </div>

              <div className="chip-row">
                <span>Invalid: {result.invalid_entries?.length || 0}</span>
                <span>Duplicates: {result.duplicate_edges?.length || 0}</span>
              </div>

              <div className="hierarchy-list">
                {(result.hierarchies || []).map((hierarchy, index) => {
                  const rootChildren = hierarchy.tree?.[hierarchy.root] || {};
                  return (
                    <article className="hierarchy-card" key={`${hierarchy.root}-${index}`}>
                      <div className="hierarchy-head">
                        <h3>Root: {hierarchy.root}</h3>
                        {hierarchy.has_cycle ? (
                          <span className="cycle-flag">Cycle</span>
                        ) : (
                          <span className="depth-flag">Depth: {hierarchy.depth}</span>
                        )}
                      </div>
                      {hierarchy.has_cycle ? (
                        <p className="empty-state">Cyclic group detected. Tree omitted by contract.</p>
                      ) : (
                        <ul className="tree-list">{formatTreeNode(hierarchy.root, rootChildren)}</ul>
                      )}
                    </article>
                  );
                })}
              </div>

              <details>
                <summary>Raw JSON response</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
