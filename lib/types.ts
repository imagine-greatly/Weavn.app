export type Severity = "critical" | "warning" | "improve";

export interface AuditIssue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  whyItMatters: string;
  howToFix: string;
  exampleCopy?: string;
  category: "messaging" | "conversion" | "seo" | "ux" | "trust";
}
