export interface AuditIssue {
  id: string;
  severity: string;
  title: string;
  description: string;
  whyItMatters: string;
  howToFix: string;
  exampleCopy?: string;
  category: "messaging" | "conversion" | "seo" | "ux" | "trust";
}
