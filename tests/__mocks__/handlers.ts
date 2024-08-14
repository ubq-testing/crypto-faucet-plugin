import { http, HttpResponse } from "msw";
import { db } from "./db";
import issueTemplate from "./issue-template";
import { StorageLayout } from "../../src/adapters/storage";
/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  // get org repos
  http.get("https://api.github.com/orgs/:org/repos", ({ params: { org } }: { params: { org: string } }) =>
    HttpResponse.json(db.repo.findMany({ where: { owner: { login: { equals: org } } } }))
  ),
  // get org repo issues
  http.get("https://api.github.com/repos/:owner/:repo/issues", ({ params: { owner, repo } }) =>
    HttpResponse.json(db.issue.findMany({ where: { owner: { equals: owner as string }, repo: { equals: repo as string } } }))
  ),
  // get issue
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number", ({ params: { owner, repo, issue_number: issueNumber } }) =>
    HttpResponse.json(
      db.issue.findFirst({ where: { owner: { equals: owner as string }, repo: { equals: repo as string }, number: { equals: Number(issueNumber) } } })
    )
  ),
  // get user
  http.get("https://api.github.com/users/:username", ({ params: { username } }) =>
    HttpResponse.json(db.users.findFirst({ where: { login: { equals: username as string } } }))
  ),
  // get repo
  http.get("https://api.github.com/repos/:owner/:repo", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    const item = db.repo.findFirst({ where: { name: { equals: repo }, owner: { login: { equals: owner } } } });
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(item);
  }),
  // create issue
  http.post("https://api.github.com/repos/:owner/:repo/issues", () => {
    const id = db.issue.count() + 1;
    const newItem = { ...issueTemplate, id };
    db.issue.create(newItem);
    return HttpResponse.json(newItem);
  }),
  // create comment
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments", async ({ params: { issue_number: issueNumber }, request }) => {
    const { body } = await getValue(request.body);
    const id = db.issueComments.count() + 1;
    const newItem = { id, body, issue_number: Number(issueNumber), user: db.users.getAll()[0] };
    db.issueComments.create(newItem);
    return HttpResponse.json(newItem);
  }),

  http.get("https://api.github.com/repos/:owner/:repo/contents/:path", () => {
    const storage: StorageLayout = {
      "keyrxng": {
        claimed: 0,
        lastClaim: null,
        wallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      "ubiquity": {
        claimed: 0,
        lastClaim: null,
        wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      }
    };
    return HttpResponse.json({
      content: Buffer.from(JSON.stringify(storage)).toString("base64"),
    });
  }),
  http.put("https://api.github.com/repos/:owner/:repo/contents/:path", async ({ request }) => {
    const { content } = await getValue(request.body);
    const storage = JSON.parse(Buffer.from(content, "base64").toString());
    return HttpResponse.json(storage);
  }),
];

async function getValue(body: ReadableStream<Uint8Array> | null) {
  if (body) {
    const reader = body.getReader();
    const streamResult = await reader.read();
    if (!streamResult.done) {
      const text = new TextDecoder().decode(streamResult.value);
      try {
        return JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse body as JSON", error);
      }
    }
  }
}
