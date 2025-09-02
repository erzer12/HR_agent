"use client";

import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Loader2, CheckCircle, AlertTriangle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface JobListItemProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
}

export function JobListItem({ job, isSelected, onSelect, onEdit, onDelete }: JobListItemProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left p-3 rounded-lg border transition-colors flex-1",
          isSelected
            ? "bg-primary/10 border-primary"
            : "bg-card hover:bg-accent/50"
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
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
            <MoreVertical className="w-4 h-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(job)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(job.id)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
