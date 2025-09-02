
"use client";

import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Loader2, CheckCircle, AlertTriangle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JobListItemProps {
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: (jobId: string) => void;
}

export function JobListItem({ job, isSelected, onSelect, onEdit, onDelete }: JobListItemProps) {
  return (
    <div className="flex items-center gap-2 w-full">
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
          {job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : '...'}
        </p>
      </button>
       <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <AlertDialogTrigger asChild>
                 <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => e.preventDefault()} // Prevents DropdownMenu from closing
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                 </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the job
                and all associated candidate data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => onDelete(job.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
