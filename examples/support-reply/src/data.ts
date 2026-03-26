export interface Account {
  id: string;
  name: string;
  plan: "starter" | "enterprise";
  tier: "standard" | "priority";
  region: string;
}

export interface BillingNotes {
  lastInvoiceStatus: string;
  summary: string;
}

interface Ticket {
  id: string;
  subject: string;
  summary: string;
  tags: string[];
}

export interface SearchResult {
  id: string;
  pageContent: string;
  relevanceScore: number;
}

const accounts: Record<string, Account> = {
  acc_123: {
    id: "acc_123",
    name: "Acme Health",
    plan: "enterprise",
    tier: "priority",
    region: "us-east-1",
  },
};

const billingNotesByAccount: Record<string, BillingNotes> = {
  acc_123: {
    lastInvoiceStatus: "paid",
    summary: "Customer is current on invoices. Finance approved a one-time credit last quarter.",
  },
};

const ticketsByAccount: Record<string, Ticket[]> = {
  acc_123: [
    {
      id: "ticket_001",
      subject: "Webhook delivery timeout after deployment",
      summary:
        "Customer reported production webhook deliveries timing out after a Friday deploy. Temporary mitigation was to increase retry backoff.",
      tags: ["webhook", "timeout", "deploy", "production"],
    },
    {
      id: "ticket_002",
      subject: "Webhook retry tuning for production traffic",
      summary:
        "Support recommended increasing retry timeout and validating the destination endpoint after a spike in production traffic.",
      tags: ["webhook", "retry", "production", "latency"],
    },
    {
      id: "ticket_003",
      subject: "Post-deploy rollback guidance",
      summary:
        "Engineering suggested rolling back the last deploy when timeout rates increased and then reapplying the change behind a flag.",
      tags: ["deploy", "rollback", "timeout"],
    },
    {
      id: "ticket_004",
      subject: "Quarterly billing invoice question",
      summary:
        "Customer asked about invoice line items and payment timing for the quarterly renewal.",
      tags: ["billing", "invoice", "renewal"],
    },
  ],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

function scoreTicket(query: string, ticket: Ticket): number {
  const queryTokens = new Set(tokenize(query));
  const ticketTokens = new Set(
    tokenize(`${ticket.subject} ${ticket.summary} ${ticket.tags.join(" ")}`),
  );

  let matches = 0;
  for (const token of queryTokens) {
    if (ticketTokens.has(token)) {
      matches += 1;
    }
  }

  if (matches === 0) {
    return 0;
  }

  return Number((matches / Math.max(queryTokens.size, 1)).toFixed(2));
}

export const db = {
  async getAccount(accountId: string): Promise<Account> {
    const account = accounts[accountId];
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return account;
  },

  async getBillingNotes(accountId: string): Promise<BillingNotes | null> {
    return billingNotesByAccount[accountId] ?? null;
  },
};

export const vectorDb = {
  async searchTickets(accountId: string, query: string): Promise<SearchResult[]> {
    const tickets = ticketsByAccount[accountId] ?? [];

    return tickets
      .map((ticket) => ({
        id: ticket.id,
        pageContent: `${ticket.subject}: ${ticket.summary}`,
        relevanceScore: scoreTicket(query, ticket),
      }))
      .filter((result) => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  },
};
