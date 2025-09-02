"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import type { ClientCandidate } from "@/lib/types";
import { rankCandidates as rankCandidatesFlow } from "@/ai/flows/rank-candidates-against-job-description";
import { draftPersonalizedConfirmationEmail } from "@/ai/flows/draft-personalized-confirmation-emails";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CandidateCard } from "@/components/candidate-card";
import { Logo } from "@/components/logo";
import { JobCreationForm } from "@/components/job-creation-form";
import { EmailPreviewDialog } from "@/components/email-preview-dialog";

import { Sparkles, FileText, ArrowLeft, Loader2, FileUp, Send } from "lucide-react";

type EmailDraft = {
  candidateName: string;
  subject: string;
  body: string;
};

export default function Home() {
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobDetails, setJobDetails] = useState<{title: string, description: string} | null>(null);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);


  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setStep(3); // Move to the confirmation step
  };
  
  const handleProcessResumes = async () => {
    if (!jobDetails) {
        toast({ variant: 'destructive', title: 'Job details are missing.'});
        return;
    }
    if (files.length === 0) {
        toast({ variant: 'destructive', title: 'Please upload some resumes.'});
        return;
    }

    setIsProcessing(true);
    try {
      const fileToDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };
      
      const resumeDataURLs = await Promise.all(files.map(fileToDataURL));

      const result = await rankCandidatesFlow({ jobDescription: jobDetails.description, resumes: resumeDataURLs });

      const rankedCandidates: ClientCandidate[] = result.rankings.map(ranking => ({
        id: `candidate-${ranking.candidateIndex}`,
        ...ranking,
        candidateEmail: ranking.candidateEmail ?? null,
        selected: false,
      })).sort((a, b) => b.suitabilityScore - a.suitabilityScore);


      setCandidates(rankedCandidates);
      
      toast({
        title: "Analysis Complete!",
        description: "Candidates have been ranked below.",
      });
      setStep(4);
    } catch (error) {
      console.error("Error processing resumes:", error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectCandidate = (id: string, selected: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected } : c));
  };

  const handleGenerateEmails = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0 || !jobDetails) return;

    setIsEmailDialogOpen(true);
    setIsGeneratingEmails(true);
    setEmailDrafts([]);

    try {
      const drafts: EmailDraft[] = [];
      for (const candidate of selectedCandidates) {
        const result = await draftPersonalizedConfirmationEmail({
          candidateName: candidate.candidateName,
          jobTitle: jobDetails.title,
          // These are placeholder details for the MVP
          interviewDate: "to be confirmed",
          interviewTime: "to be confirmed",
          interviewerName: "the Hiring Manager",
          candidateEmail: candidate.candidateEmail || undefined,
        });
        drafts.push({
          candidateName: candidate.candidateName,
          subject: result.emailSubject,
          body: result.emailBody,
        });
        setEmailDrafts([...drafts]); // Update state incrementally
      }
    } catch (error) {
      console.error("Error generating emails:", error);
      toast({
        variant: "destructive",
        title: "Email Generation Failed",
        description: "Could not draft emails for the selected candidates.",
      });
    } finally {
      setIsGeneratingEmails(false);
    }
  };
  
  const startOver = () => {
    setStep(1);
    setJobDescription("");
    setJobTitle("");
    setFiles([]);
    setCandidates([]);
    setIsProcessing(false);
    setJobDetails(null);
    setEmailDrafts([]);
    setIsEmailDialogOpen(false);
    setIsGeneratingEmails(false);
  }

  const selectedCount = candidates.filter(c => c.selected).length;

  const renderStep = () => {
    switch (step) {
      case 1:
        return <JobCreationForm onNext={(title, description) => {
            setJobTitle(title);
            setJobDescription(description);
            setJobDetails({title, description});
            setStep(2);
        }} />;
      case 2:
        return (
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileUp className="text-primary"/> 2. Upload Resumes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Upload resumes in PDF format. You can select multiple files at once.</p>
                     <div className="space-y-2">
                        <Label htmlFor="resume-upload">Resume Files</Label>
                        <Input id="resume-upload" type="file" multiple accept=".pdf" onChange={(e) => handleFilesSelected(e.target.files ? Array.from(e.target.files) : [])} className="h-11"/>
                    </div>
                    <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2"/>Back</Button>
                    </div>
                </CardContent>
            </Card>
        )
      case 3:
        return (
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> 3. Analyze Resumes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold">Job Title</h3>
                            <p className="text-muted-foreground bg-muted p-2 rounded-md mt-1">{jobDetails?.title}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold">Uploaded Resumes</h3>
                            <div className="text-muted-foreground bg-muted p-3 rounded-md mt-1 space-y-1 text-sm">
                                {files.map(f => <p key={f.name} className="flex items-center gap-2"><FileText className="w-4 h-4"/>{f.name}</p>)}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2"/>Back</Button>
                        <Button className="bg-primary hover:bg-primary/90" onClick={handleProcessResumes} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin"/> : <Sparkles className="mr-2"/>}
                            Process Resumes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
      case 4:
        return (
            <div className="w-full max-w-4xl">
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">Candidate Review Panel</h2>
                        <p className="text-muted-foreground">Found {candidates.length} candidates for: <span className="font-semibold text-primary">{jobDetails?.title}</span></p>
                    </div>
                    <Button onClick={startOver}>Start New Round</Button>
                 </div>
                 <div className="space-y-4">
                    {candidates.map(candidate => (
                        <CandidateCard key={candidate.id} candidate={candidate} onSelect={handleSelectCandidate} />
                    ))}
                 </div>
                 {candidates.length > 0 && (
                    <div className="mt-8">
                         <Card>
                            <CardHeader>
                                <CardTitle>Next Steps</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <p>Selected {selectedCount} candidate(s). Proceed to the next step to schedule interviews.</p>
                                <Button className="mt-4 bg-accent hover:bg-accent/90" disabled={selectedCount === 0} onClick={handleGenerateEmails}>
                                    <Send className="mr-2"/>
                                    Draft Emails for Selected Candidates
                                </Button>
                             </CardContent>
                         </Card>
                    </div>
                 )}
            </div>
        )
      default:
        return <p>Something went wrong.</p>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
        <header className="flex items-center gap-4 px-6 py-4 border-b bg-background">
          <Logo />
          <h1 className="text-2xl font-bold tracking-tight font-headline">ResumeRank</h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
            {renderStep()}
        </main>
        
        <EmailPreviewDialog
            isOpen={isEmailDialogOpen}
            onOpenChange={setIsEmailDialogOpen}
            drafts={emailDrafts}
            isLoading={isGeneratingEmails}
            selectedCount={selectedCount}
        />
    </div>
  );
}
