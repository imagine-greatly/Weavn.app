"use client";

import IssueCard from "./IssueCard";
import type { AuditIssue } from "@/lib/types";

interface IssueListProps {
  issues: AuditIssue[];
  onIssueClick: (issue: AuditIssue) => void;
}

export default function IssueList({ issues, onIssueClick }: IssueListProps) {
  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          index={i}
          onClick={() => onIssueClick(issue)}
        />
      ))}
    </div>
  );
}
