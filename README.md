# Local SQLite Dashboard Builder Design (v5)

This document outlines the architecture for a fully client-side, offline-first dashboard builder that uses local SQLite database files as its data source. 

## 1. Core Architecture (Frontend-Only SPA)
By leveraging WebAssembly (WASM), the application requires zero backend infrastructure. All data processing and rendering happen securely within the user's browser, and it functions completely offline.

*   **Framework:** React (or Vue/Svelte) for state management and UI components.
*   **Database Engine:** **`sql.js`** (SQLite compiled to WebAssembly). This allows the app to read local `.sqlite` files, load them into memory, and run SQL natively. It automatically utilizes any existing indexes within the SQLite files.
*   **Layout & Visualization:** `react-grid-layout` for the drag-and-drop grid, and **Apache ECharts** for mapping SQL results to rich, declarative charts.
*   **Delivery:** The builder itself is compiled into a single, standalone `builder.html` file using `vite-plugin-singlefile`. No local web server is required.

## 2. Multi-Database Support & Cross-DB Joins
The application supports loading multiple database files simultaneously into the `sql.js` Emscripten virtual file system.

*   When a user drops `sales.sqlite` and `users.sqlite` into the browser, the engine attaches them:
    ```sql
    ATTACH DATABASE '/sales.sqlite' AS sales_db;
    ATTACH DATABASE '/users.sqlite' AS users_db;
    ```
*   This allows widgets to run complex cross-database queries sharing the same memory space:
    ```sql
    SELECT u.name, s.amount FROM users_db.customers u JOIN sales_db.transactions s ON u.id = s.customer_id
    ```

## 3. The Builder Workflow (Draft Mode)
1. **Initialization:** The user drops one or more `.sqlite` files into the browser.
2. **Adding Panels:** The user adds a visualization widget (Table, Line Chart, Bar Chart).
3. **Query Authoring:** A modal opens featuring a SQL editor with live preview, executing against the attached databases in a Web Worker.
4. **Data Mapping & Layout:** The user maps SQL columns to axes and places the widget on the grid.

## 4. Persistence Mechanism 1: The "Quine" Workspace (Continuous Building)
There are no intermediate `draft.json` files. The builder webpage can save its progress by mutating itself. This operates as a continuous "Save" workflow.

*   **State Storage:** The widget layout and queries are stored in a hidden `<script id="dashboard-state" type="application/json">` tag within the DOM.
*   **Invocation (The Modern Way):** When the user hits `Ctrl+S` or clicks **"Save Workspace"**, the app uses the **File System Access API** (`window.showSaveFilePicker()`). The user grants a `FileHandle`, and the app silently overwrites the HTML file on disk in place for all future saves in that session. It feels exactly like a native desktop app.
*   **Fallback Invocation:** For browsers lacking the File System Access API (like Safari), it triggers a standard `Blob` download, prompting the user to save a new `builder(1).html` file.
*   **Resuming:** The user double-clicks their saved `.html` file, which boots up, reads its own embedded state, and asks the user to drop the `.sqlite` files back in to resume editing.

## 5. Persistence Mechanism 2: Snapshot Export (Read-Only Publish)
This feature distributes a static, read-only "Snapshot" of the dashboard that does not require the original SQLite files or a WASM engine to view. This is treated as a discrete "Export" action.

*   **Invocation:** The user clicks **"Export -> Static Dashboard"** from the UI.
*   **Execution:** 
    1. A spinner appears while the app runs all widget queries one final time to capture the static data payload.
    2. The app strips out the Builder UI, injecting the data and layout config into a lightweight HTML template containing only the charting library and render script.
    3. It triggers a standard `Blob` download for `dashboard_snapshot.html`. The user can instantly email this file or host it statically.

## 6. Persistence Mechanism 3: CLI Automation Script (Pipeline Publish)
The builder acts as a visual compiler for data pipelines. Users can export a programmatic script to automate future dashboard generation.

*   **Invocation:** The user clicks **"Export -> Automation Script"** and selects their target environment (e.g., Python or Node.js) in a modal.
*   **Execution:** 
    1. The app dynamically generates the script text, baking in the user's saved queries, layout, and the static HTML template.
    2. It triggers a standard `Blob` download for the script (e.g., `update_dashboard.py`).
    3. The UI provides a snippet showing how to run it:
       ```bash
       python update_dashboard.py \
         --db sales=./latest_sales_data.sqlite \
         --db users=./latest_users.sqlite \
         --out final_dashboard_june.html
       ```
*   **Result:** The script executes the baked-in queries against fresh databases headless, injecting results into the template, and outputting a fresh Snapshot HTML file.

## 7. Build & DRY Architecture (Single Source of Truth)
To strictly enforce the DRY (Don't Repeat Yourself) principle, the project ensures that the dashboard rendering logic is written exactly once and shared across all environments (Builder UI, Snapshot HTML, and CLI scripts).

1. **The Shared Core:** A single, framework-agnostic TypeScript module (`core-renderer.ts`) is created. Its sole responsibility is taking a `Widget` JSON array and data arrays, and rendering the ECharts/Grid layout.
2. **The Builder App:** The React builder imports `core-renderer.ts` directly during development for live previews.
3. **The Build Step:** During the Vite build process, `core-renderer.ts` is compiled into a minified, pure-JavaScript string (`renderer.min.js`) and embedded into the application bundle as a string constant.
4. **The Generators:**
   * When generating the **Snapshot HTML** (Mechanism 2), the builder injects this `renderer.min.js` string directly into the `<script>` tag of the exported file.
   * When generating the **CLI Script** (Mechanism 3), the builder bakes this exact same `renderer.min.js` string into the Python/Node script to be written into the final HTML output.

By using compilation rules to generate duplicated code places, any update to the charts or layout logic in `core-renderer.ts` instantly cascades to all parts of the application upon building, eliminating desynchronization bugs.

## 8. Testing Strategy
Because of the heavy reliance on client-side state, WASM compilation, and generated artifacts, a robust multi-layered testing strategy is required.

*   **Unit Testing (Vitest):**
    *   Focus on `core-renderer.ts` to ensure data transforms correctly into ECharts configurations.
    *   Test the serialization/deserialization logic that powers the "Quine" workspace state storage.
*   **Integration Testing (WASM & Web Workers):**
    *   Mock the `sql.js` Web Worker environment in Node.js to verify that cross-database `ATTACH` commands and complex SQL queries execute correctly against dummy `.sqlite` fixtures.
*   **End-to-End (E2E) Testing (Playwright):**
    *   Playwright is ideal as it can automate file uploads and intercept browser downloads.
    *   **Workflow Test:** Simulate dropping a `.sqlite` fixture, creating a widget, writing a query, and exporting the workspace.
    *   **Quine Verification:** Download the self-mutating `builder.html`, load it in a new browser context, and assert that the layout state successfully rehydrates.
*   **Generated Artifact Testing (CLI Script Verification):**
    *   An automated CI step that triggers Mechanism 3 to download the `update_dashboard.py` script.
    *   The test suite then physically executes this generated script using a local Python environment against dummy databases.
    *   Finally, the test parses the output `dashboard_snapshot.html` to guarantee the automated data pipeline functioned correctly end-to-end.