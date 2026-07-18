import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const issues = [
    {
        number: 8,
        title: "Update our repository coding standards",
        body: "Clarify the repository's comment and documentation conventions, including intent-focused comments, TSDoc for exported data-layer functions, Props documentation for reusable Astro components, and keeping comments current.",
        priority: "Updated most recently and cross-cutting: it affects every future change and has explicit documentation and linting acceptance criteria.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/8",
    },
    {
        number: 6,
        title: "Implement pagination on the game list page",
        body: "Add pagination support to the data-access helpers and game list page, with accessible controls plus Vitest and Playwright coverage.",
        priority: "Performance and usability work with a clear end-to-end scope; addressing it early avoids building more catalog features on an increasingly unwieldy list.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/6",
    },
    {
        number: 1,
        title: "Add a search box to find games by title",
        body: "Add a case-insensitive title search to the game list, including an accessible input, live filtering, and a no-results state with unit and E2E coverage.",
        priority: "A foundational discovery feature that directly improves the core catalog experience and pairs naturally with the planned pagination work.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/1",
    },
    {
        number: 5,
        title: "Show a catalog summary on the home page",
        body: "Display the total game count and average star rating on the home page, handling empty and unrated catalogs gracefully.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/5",
    },
    {
        number: 4,
        title: "Add a publisher page listing that publisher's games",
        body: "Create prerendered publisher pages that show publisher details and reuse the existing game card, with links from game surfaces and test coverage.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/4",
    },
    {
        number: 3,
        title: "Show category and publisher descriptions on the game detail page",
        body: "Surface available category and publisher descriptions on game details, hiding sections when descriptions are missing.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/3",
    },
    {
        number: 2,
        title: "Allow users to sort the game list",
        body: "Add accessible sorting by title in both directions and by highest star rating, with documented handling for unrated games.",
        url: "https://github.com/lenvolk/tailspin-toys/issues/2",
    },
];

const topIssues = issues.slice(0, 3);
const remainingIssues = issues.slice(3);
const servers = new Map();

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function issueCard(issue, isTop) {
    return `
      <article class="card ${isTop ? "priority-card" : ""}" data-testid="issue-card-${issue.number}">
        <div class="card-header">
          <span class="issue-number">#${issue.number}</span>
          ${isTop ? '<span class="priority-badge">Attention now</span>' : ""}
        </div>
        <h3>${escapeHtml(issue.title)}</h3>
        <p>${escapeHtml(issue.body)}</p>
        ${isTop ? `<p class="why"><strong>Why it is prioritized:</strong> ${escapeHtml(issue.priority)}</p>` : ""}
        <div class="card-actions">
          <a href="${issue.url}" target="_blank" rel="noreferrer">View issue</a>
          <button type="button" data-issue="${issue.number}" data-testid="add-issue-${issue.number}">Add to current context</button>
        </div>
      </article>`;
}

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Issue triage board</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328); font: 14px/1.5 var(--font-sans, system-ui, sans-serif); }
      main { max-width: 1100px; margin: 0 auto; }
      h1 { margin: 0 0 4px; font-size: 26px; }
      .intro { margin: 0 0 24px; color: var(--text-color-muted, #656d76); }
      h2 { margin: 28px 0 12px; font-size: 18px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
      .card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; background: var(--background-color-default, #fff); }
      .priority-card { border-color: var(--true-color-blue, #0969da); box-shadow: 0 0 0 1px var(--true-color-blue, #0969da); }
      .card-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .issue-number { color: var(--text-color-muted, #656d76); font-weight: 600; }
      .priority-badge { padding: 2px 8px; border-radius: 999px; background: var(--true-color-blue-muted, #ddf4ff); color: var(--true-color-blue, #0969da); font-size: 12px; font-weight: 600; }
      h3 { margin: 0; font-size: 16px; }
      p { margin: 0; }
      .why { padding-top: 8px; border-top: 1px solid var(--border-color-default, #d0d7de); }
      .card-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: auto; padding-top: 10px; }
      a { color: var(--true-color-blue, #0969da); }
      button { border: 0; border-radius: 6px; padding: 7px 10px; background: var(--true-color-blue, #0969da); color: var(--color-white, #fff); cursor: pointer; font: inherit; }
      button:hover { filter: brightness(1.1); }
      button:focus-visible, a:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      button[disabled] { opacity: .65; cursor: wait; }
      #status { min-height: 22px; margin-top: 18px; color: var(--text-color-muted, #656d76); }
    </style>
  </head>
  <body>
    <main>
      <h1>Issue triage board</h1>
      <p class="intro">A quick view of open work, with the three issues most likely to need attention now.</p>
      <section aria-labelledby="priority-heading">
        <h2 id="priority-heading">Needs attention now</h2>
        <div class="grid">${topIssues.map((issue) => issueCard(issue, true)).join("")}</div>
      </section>
      <section aria-labelledby="remaining-heading">
        <h2 id="remaining-heading">More open issues</h2>
        <div class="grid">${remainingIssues.map((issue) => issueCard(issue, false)).join("")}</div>
      </section>
      <p id="status" role="status" aria-live="polite"></p>
    </main>
    <script>
      const status = document.querySelector("#status");
      document.querySelectorAll("button[data-issue]").forEach((button) => {
        button.addEventListener("click", async () => {
          button.disabled = true;
          status.textContent = "Adding issue to the current context...";
          try {
            const response = await fetch("/add-context", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ issueNumber: Number(button.dataset.issue) }),
            });
            if (!response.ok) throw new Error("Request failed");
            status.textContent = "Issue added to the current context.";
          } catch {
            status.textContent = "Could not add the issue to context.";
            button.disabled = false;
          }
        });
      });
    </script>
  </body>
</html>`;
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try { resolve(JSON.parse(body || "{}")); } catch (error) { reject(error); }
        });
        req.on("error", reject);
    });
}

async function startServer(instanceId) {
    const server = createServer(async (req, res) => {
        if (req.method === "POST" && req.url === "/add-context") {
            try {
                const payload = await readJsonBody(req);
                const issue = issues.find((candidate) => candidate.number === payload.issueNumber);
                if (!issue) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Unknown issue" }));
                    return;
                }
                await session.send({
                    prompt: `Add issue #${issue.number} to the current working context so we can start on it:\n\n${issue.title}\n\n${issue.body}\n\nGitHub issue: ${issue.url}`,
                });
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to add issue" }));
            }
            return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderHtml(instanceId));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "issue-triage-board",
            displayName: "Issue triage board",
            description: "A Kanban board that prioritizes open repository issues and sends selected issues into the current session context.",
            actions: [
                {
                    name: "add_issue_to_context",
                    description: "Send an open repository issue into the current session context.",
                    inputSchema: {
                        type: "object",
                        properties: { issueNumber: { type: "integer" } },
                        required: ["issueNumber"],
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        const issue = issues.find((candidate) => candidate.number === ctx.input.issueNumber);
                        if (!issue) return { ok: false, error: "Unknown issue" };
                        await session.send({
                            prompt: `Add issue #${issue.number} to the current working context so we can start on it:\n\n${issue.title}\n\n${issue.body}\n\nGitHub issue: ${issue.url}`,
                        });
                        return { ok: true, issueNumber: issue.number };
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue triage board", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
