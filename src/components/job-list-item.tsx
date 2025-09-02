"use client";

import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface JobListItemProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
}

export function JobListItem({ job, isSelected, onSelect }: JobListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        isSelected
          ? "bg-primary/10 border-primary"
          : "bg-card hover:bg-accent"
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold truncate pr-2">{job.title}</h3>
        {job.status === "processing" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {job.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
        {job.status === "failed" && <AlertTriangle className="w-4 h-4 text-destructive" />}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {job.createdAt ? formatDistanceToNow(job.createdAt, { addSuffix: true }) : '...'}
      </p>
    </button>
  );
}
