"use client";

import type { ClientCandidate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface CandidateCardProps {
  candidate: ClientCandidate;
  onSelect: (id: string, selected: boolean) => void;
}

export function CandidateCard({ candidate, onSelect }: CandidateCardProps) {
  const suitabilityPercentage = Math.round(candidate.suitabilityScore * 100);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              id={`candidate-${candidate.id}`}
              checked={candidate.selected}
              onCheckedChange={(checked) => onSelect(candidate.id, !!checked)}
              className="mt-1"
              aria-label={`Select ${candidate.fileName}`}
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate" title={candidate.fileName}>{candidate.fileName}</span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={suitabilityPercentage} className="w-32 h-2" />
                <span className="text-sm font-semibold text-primary">{suitabilityPercentage}%</span>
                <Badge variant={suitabilityPercentage > 75 ? "default" : "secondary"}>
                  {suitabilityPercentage > 75 ? "Top Match" : suitabilityPercentage > 50 ? "Good Match" : "Potential"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{candidate.summary}</p>
      </CardContent>
    </Card>
  );
}
