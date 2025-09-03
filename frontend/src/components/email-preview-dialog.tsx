
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy, Loader2, Send } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

type EmailDraft = {
  candidateName: string;
  subject: string;
  body: string;
};

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: EmailDraft[];
  isLoading: boolean;
  isSending: boolean;
  selectedCount: number;
  onSend: () => void;
}

export function EmailPreviewDialog({ isOpen, onOpenChange, drafts, isLoading, isSending, selectedCount, onSend }: EmailPreviewDialogProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!" });
    }).catch(err => {
      console.error("Failed to copy:", err);
      toast({ variant: "destructive", title: "Failed to copy" });
    });
  };
  
  if (!isOpen) return null;

  const showLoadingState = isLoading || (drafts.length > 0 && drafts.length < selectedCount);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Drafted Emails</DialogTitle>
          <DialogDescription>
            {showLoadingState 
              ? `Generating ${drafts.length} of ${selectedCount} emails...`
              : "Review the drafted emails below. You can send all emails at once."
            }
          </DialogDescription>
        </DialogHeader>

        {drafts.length === 0 && isLoading && (
          <div className="space-y-4 p-4 border rounded-lg">
             <Skeleton className="h-6 w-1/3" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-10 w-24" />
          </div>
        )}
        
        {drafts.length > 0 && (
          <div className="flex-1 min-h-0">
          <Tabs defaultValue={drafts[0].candidateName} className="flex flex-col h-full">
            <TabsList className="w-full overflow-x-auto justify-start">
              {drafts.map((draft) => (
                <TabsTrigger key={draft.candidateName} value={draft.candidateName} className="truncate">
                  {draft.candidateName}
                </TabsTrigger>
              ))}
              {showLoadingState && (
                <TabsTrigger value="loading" disabled>
                  <Loader2 className="animate-spin" />
                </TabsTrigger>
              )}
            </TabsList>
            <div className="flex-1 mt-2 overflow-y-auto">
            {drafts.map((draft) => (
              <TabsContent key={draft.candidateName} value={draft.candidateName} className="mt-0">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-sm">Subject</h3>
                    <p className="text-sm p-2 bg-muted rounded-md mt-1">{draft.subject}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Body</h3>
                    <div className="text-sm p-3 bg-muted rounded-md mt-1 whitespace-pre-wrap font-sans">
                      {draft.body}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(`Subject: ${draft.subject}\n\n${draft.body}`)}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Email
                  </Button>
                </div>
              </TabsContent>
            ))}
            </div>
          </Tabs>
          </div>
        )}
        
        <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
             <Button
                onClick={onSend}
                disabled={isLoading || isSending || drafts.length < selectedCount}
                className="bg-accent hover:bg-accent/90"
             >
                {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                Send Emails & Schedule
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
