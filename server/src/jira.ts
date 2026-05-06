import type { TaskStatus } from "@release-tool/shared";

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status?: {
      name?: string;
      statusCategory?: {
        key?: string; // "new" | "indeterminate" | "done"
      };
    };
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export function getJiraConfig(): JiraConfig | null {
  const baseUrl = process.env.JIRA_BASE_URL?.trim();
  const email = process.env.JIRA_EMAIL?.trim();
  const apiToken = process.env.JIRA_API_TOKEN?.trim();
  if (!baseUrl || !email || !apiToken) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    email,
    apiToken,
  };
}

function authHeader(cfg: JiraConfig): string {
  const encoded = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64");
  return `Basic ${encoded}`;
}

export function mapJiraStatusCategory(
  categoryKey: string | undefined,
): TaskStatus {
  switch (categoryKey) {
    case "done":
      return "hotovo";
    case "indeterminate":
      return "v_reseni";
    case "new":
    default:
      return "zadano";
  }
}

export interface JiraSearchResult {
  key: string;
  summary: string;
  status: TaskStatus;
}

export async function searchIssues(
  cfg: JiraConfig,
  jql: string,
  options?: { maxIssues?: number },
): Promise<JiraSearchResult[]> {
  const url = new URL("/rest/api/3/search/jql", cfg.baseUrl);
  const cap = options?.maxIssues ?? 500;
  const results: JiraSearchResult[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    const body: Record<string, unknown> = {
      jql,
      fields: ["summary", "status"],
      maxResults: 100,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res: Response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(cfg),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const seraph = res.headers.get("x-seraph-loginreason");
    if (seraph && seraph !== "OK") {
      throw new Error(
        `JIRA autentizace selhala (X-Seraph-Loginreason: ${seraph}). ` +
          `Zkontroluj JIRA_EMAIL a JIRA_API_TOKEN v server/.env. ` +
          `Token vygeneruj na https://id.atlassian.com/manage-profile/security/api-tokens.`,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`JIRA ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const data = (await res.json()) as JiraSearchResponse;
    for (const i of data.issues) {
      results.push({
        key: i.key,
        summary: i.fields.summary,
        status: mapJiraStatusCategory(i.fields.status?.statusCategory?.key),
      });
    }

    if (results.length >= cap) break;
    if (data.isLast) break;
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return results;
}
