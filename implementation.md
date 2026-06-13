# Implementation Plan: SQLite Dashboard Builder

This document breaks down the Architecture Design into smaller, verifiable, and strictly sequential implementation phases. Each phase represents a testable milestone.

## Phase 1: Foundation & Shared Renderer
**Goal:** Scaffold the app and establish the DRY rendering core with extensible visualization.
- [ ] **1.1 Project Setup:** Initialize a Vite + React + TypeScript project. Install `vite-plugin-singlefile`, `react-grid-layout`, a powerful table library (e.g., `@tanstack/react-table`), and the default charting library (e.g., `echarts`).
- [ ] **1.2 Charting Adapter Pattern:** Design an interface/adapter layer in the renderer so the underlying charting library (ECharts, Chart.js, Plotly) can be easily swapped out without rewriting widget logic.
- [ ] **1.3 Advanced Table Widget:** Implement a data table renderer that natively supports client-side filtering by column values and regex matching.
- [ ] **1.4 The Shared Core (`core-renderer.ts`):** Create the framework-agnostic rendering module connecting the adapters. It should take a mock `Widget[]` array and mock SQL data arrays to render the grid, charts, and tables.
- [ ] **1.5 Build Pipeline Configuration:** Configure Vite so that `core-renderer.ts` is compiled into a minified string (`renderer.min.js`) available as a constant to the rest of the app, verifying the single-file output (`builder.html`) works offline.

## Phase 2: Database Engine (`sql.js`) Integration
**Goal:** Enable secure, offline, cross-database querying via Web Workers.
- [ ] **2.1 Web Worker Setup:** Instantiate `sql.js` inside a Web Worker so queries don't block the UI thread.
- [ ] **2.2 File Ingestion UI:** Create a drag-and-drop zone to accept `.sqlite` files, using `FileReader` to pass file buffers to the Web Worker.
- [ ] **2.3 Multi-DB Attach Logic:** Implement the Emscripten virtual file system logic to mount multiple files and run `ATTACH DATABASE` commands.
- [ ] **2.4 Query Execution:** Build a simple test UI to type a raw SQL query, send it to the worker, and render the raw JSON result on screen.

## Phase 3: The Builder UI (Draft Mode)
**Goal:** Build the visual drag-and-drop workflow to author widgets.
- [ ] **3.1 Grid Canvas:** Implement `react-grid-layout` using the mock widgets from Phase 1. Ensure widgets can be resized and dragged.
- [ ] **3.2 Query Authoring Modal:** Integrate a basic code editor (e.g., Monaco Editor) for typing SQL.
- [ ] **3.3 Live Preview Wiring:** Connect the modal's SQL editor to the Phase 2 Web Worker. Show a live preview of the data table below the editor.
- [ ] **3.4 Data Mapping UI:** Add dropdowns in the modal to map the returned SQL columns to the visualization adapter's configuration (axes, table columns), saving the config to the `Widget` state.

## Phase 4: Persistence Mechanism 1 (The Quine)
**Goal:** Enable the app to mutate itself and save progress continuously.
- [ ] **4.1 State Serialization:** Write logic to stringify the `Widget[]` state and inject it into `<script id="dashboard-state" type="application/json">` within the DOM.
- [ ] **4.2 Save Invocation (Modern API):** Implement `window.showSaveFilePicker()` to request a FileHandle and overwrite the current HTML file on disk.
- [ ] **4.3 Save Invocation (Fallback):** Implement the `Blob` download fallback for unsupported browsers.
- [ ] **4.4 Rehydration (Boot Logic):** On app startup, read the `dashboard-state` script tag. If state exists, bypass the empty state UI, render the grid, and prompt the user to re-upload the associated `.sqlite` files.

## Phase 5: Export Mechanisms 2 & 3
**Goal:** Implement the publish and automation features.
- [ ] **5.1 Static Snapshot Export:** Implement logic to strip the Builder UI, run final queries, inject data + `renderer.min.js` into the minimal HTML template, and trigger a Blob download of the read-only dashboard.
- [ ] **5.2 CLI Script Generation:** Create the template generator for `update_dashboard.py` (or Node). Bake in the current state and `renderer.min.js`, and trigger the script download.

## Phase 6: Testing & Hardening
**Goal:** Ensure long-term reliability and verify the Quine logic.
- [ ] **6.1 Unit Tests:** Write Vitest coverage for `core-renderer.ts`, the charting adapters, and the state serialization functions.
- [ ] **6.2 E2E Playwright Tests:** Automate a workflow that drops a mock DB, creates a chart/table, triggers the Quine save, loads the resulting HTML, and verifies the widget exists and functions.
- [ ] **6.3 CLI Verification:** Write an automated script to execute the exported `update_dashboard.py` against dummy DBs and verify the output HTML matches expectations.
