
"use client";

import type { ClientCandidate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
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

interface CandidateCardProps {
  candidate: ClientCandidate;
  onSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => void;
}

export function CandidateCard({ candidate, onSelect, onDelete }: CandidateCardProps) {
  const suitabilityPercentage = Math.round(candidate.suitabilityScore * 100);

  const getBadgeVariant = () => {
    if (suitabilityPercentage > 75) return "default";
    if (suitabilityPercentage > 50) return "secondary";
    return "outline";
  }

  const getBadgeText = () => {
    if (suitabilityPercentage > 75) return "Top Match";
    if (suitabilityPercentage > 50) return "Good Match";
    return "Potential";
  }

  return (
    <Card className={cn(
        "transition-all hover:shadow-md w-full",
        candidate.selected && "border-primary/50 shadow-lg"
    )}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Checkbox
              id={`candidate-${candidate.id}`}
              checked={candidate.selected}
              onCheckedChange={(checked) => onSelect(candidate.id, !!checked)}
              className="mt-1"
              aria-label={`Select ${candidate.candidateName}`}
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="truncate" title={candidate.candidateName}>{candidate.candidateName}</span>
              </CardTitle>
              {candidate.candidateEmail && (
                <a 
                  href={`mailto:${candidate.candidateEmail}`} 
                  className="text-sm text-muted-foreground flex items-center gap-2 truncate mt-1 hover:underline"
                  title={candidate.candidateEmail}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{candidate.candidateEmail}</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
             <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary w-12 text-right">{suitabilityPercentage}%</span>
                <Progress value={suitabilityPercentage} className="w-24 h-2" />
              </div>
              <Badge variant={getBadgeVariant()}>{getBadgeText()}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <CardDescription className="text-sm text-muted-foreground pl-10 pr-10">{candidate.summary}</CardDescription>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4"/>
                <span className="sr-only">Delete candidate</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the candidate <span className="font-semibold">{candidate.candidateName}</span> from this job. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(candidate.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
