"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { rankCandidates } from "@/ai/flows/rank-candidates-against-job-description";
import { useToast } from "@/hooks/use-toast";

import type { ClientCandidate } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CandidateCard } from "@/components/candidate-card";
import { EmailPreviewDialog } from "@/components/email-preview-dialog";
import { Logo } from "@/components/logo";

import { UploadCloud, Sparkles, Users, FileText, Crown, Mail, Loader2, Calendar, Clock, User } from "lucide-react";

type EmailDraft = {
  candidateName: string;
  subject: string;
  body: string;
};

export default function Home() {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topN, setTopN] = useState("3");
  
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [interviewDetails, setInterviewDetails] = useState({ date: "", time: "", interviewer: "" });
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  const handleRankCandidates = async () => {
    if (!jobDescription.trim() || files.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a job description and upload resumes.",
      });
      return;
    }
    setIsLoading(true);
    setCandidates([]);
    try {
      const resumeDataURLs = await Promise.all(files.map(fileToDataURL));
      const result = await rankCandidates({ jobDescription, resumes: resumeDataURLs });
      
      const rankedCandidates: ClientCandidate[] = result.rankings.map(ranking => ({
        id: crypto.randomUUID(),
        ...ranking,
        fileName: files[ranking.candidateIndex].name,
        selected: false,
      })).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
      
      setCandidates(rankedCandidates);

    } catch (error) {
      console.error("Error ranking candidates:", error);
      toast({
        variant: "destructive",
        title: "Ranking Failed",
        description: "An error occurred while ranking candidates. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = (id: string, selected: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected } : c));
  };

  const handleSelectTopN = () => {
    const n = parseInt(topN, 10);
    if (isNaN(n) || n <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Number",
        description: "Please enter a valid number of candidates to select.",
      });
      return;
    }
    const topNCandidates = candidates.slice(0, n);
    const topNIds = topNCandidates.map(c => c.id);
    setCandidates(prev => prev.map(c => ({...c, selected: topNIds.includes(c.id)})));
  };

  const handleDraftEmails = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0) {
      toast({
        variant: "destructive",
        title: "No Candidates Selected",
        description: "Please select candidates to draft emails for.",
      });
      return;
    }
    setIsInterviewDialogOpen(true);
  };
  
  const handleGenerateEmailDrafts = async () => {
    setIsEmailLoading(true);
    setEmailDrafts([]);
    setIsInterviewDialogOpen(false);
    setIsEmailPreviewOpen(true);
    const selectedCandidates = candidates.filter(c => c.selected);
    const jobTitle = "the role"; // Placeholder
    
    const generatedDrafts: EmailDraft[] = [];
    for (const candidate of selectedCandidates) {
      const candidateName = candidate.fileName.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' ');
      const emailSubject = `Interview Confirmation: ${jobTitle}`;
      const emailBody = `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position. We would like to invite you for an interview.

Your interview is scheduled for:
Date: ${interviewDetails.date}
Time: ${interviewDetails.time}
Interviewer: ${interviewDetails.interviewer}

We look forward to speaking with you.

Best regards,
The Hiring Team`;

      generatedDrafts.push({
        candidateName,
        subject: emailSubject,
        body: emailBody
      });
    }
    
    setEmailDrafts(generatedDrafts);
    setIsEmailLoading(false);
  };
  
  const selectedCount = candidates.filter(c => c.selected).length;

  return (
    <>
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-4 px-6 py-4 border-b">
          <Logo />
          <h1 className="text-2xl font-bold tracking-tight font-headline">ResumeRank</h1>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="xl:col-span-1 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary" />
                    Start Here
                  </CardTitle>
                  <CardDescription>Enter job details and upload resumes to begin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[150px] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resume-upload">Upload Resumes (PDF)</Label>
                    <div className="relative">
                      <Input id="resume-upload" type="file" multiple accept=".pdf" onChange={handleFileChange} className="pr-12 h-11" />
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                         <UploadCloud className="w-5 h-5 text-muted-foreground" />
                       </div>
                    </div>
                     {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} file(s) selected.</p>}
                  </div>
                   <Button onClick={handleRankCandidates} disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                    Rank Candidates
                  </Button>
                </CardContent>
              </Card>

              {candidates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="text-accent" />
                      Actions
                    </CardTitle>
                    <CardDescription>Manage your ranked candidates.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="top-n">Select Top Candidates</Label>
                      <div className="flex gap-2">
                        <Input id="top-n" type="number" value={topN} onChange={e => setTopN(e.target.value)} className="w-20" />
                        <Button variant="outline" onClick={handleSelectTopN}>Select Top {topN}</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <Label>Email Automation</Label>
                       <Button onClick={handleDraftEmails} className="w-full bg-accent hover:bg-accent/90">
                          <Mail className="mr-2" />
                          Draft Emails for Selected ({selectedCount})
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="lg:col-span-1 xl:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users />Ranked Candidates</CardTitle>
                  <CardDescription>Review candidates ranked by suitability. Scores are from 0 to 100.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading && (
                     <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="p-4 border rounded-lg space-y-3">
                              <div className="flex justify-between items-center">
                                 <Skeleton className="h-5 w-1/3" />
                                 <Skeleton className="h-5 w-1/5" />
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-4/5" />
                           </div>
                        ))}
                     </div>
                  )}
                  {!isLoading && candidates.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-96">
                      <FileText className="w-16 h-16 text-muted-foreground" />
                      <h3 className="mt-4 text-xl font-semibold">No Candidates Yet</h3>
                      <p className="mt-2 text-muted-foreground">Your ranked candidates will appear here.</p>
                    </div>
                  )}
                  {candidates.length > 0 && (
                     <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                      {candidates.map(candidate => (
                        <CandidateCard key={candidate.id} candidate={candidate} onSelect={handleSelectCandidate} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Interview Details</DialogTitle>
            <DialogDescription>
              Enter the interview details to be included in the confirmation emails.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interview-date" className="text-right">
                <Calendar className="inline-block w-4 h-4 mr-1" /> Date
              </Label>
              <Input id="interview-date" type="date" value={interviewDetails.date} onChange={e => setInterviewDetails({...interviewDetails, date: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="interview-time" className="text-right">
                <Clock className="inline-block w-4 h-4 mr-1" /> Time
              </Label>
              <Input id="interview-time" type="time" value={interviewDetails.time} onChange={e => setInterviewDetails({...interviewDetails, time: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interviewer-name" className="text-right">
                <User className="inline-block w-4 h-4 mr-1" /> Interviewer
              </Label>
              <Input id="interviewer-name" value={interviewDetails.interviewer} onChange={e => setInterviewDetails({...interviewDetails, interviewer: e.target.value})} className="col-span-3" placeholder="e.g., Jane Doe" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleGenerateEmailDrafts} disabled={isEmailLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              {isEmailLoading ? <Loader2 className="animate-spin" /> : <Mail className="mr-2" />}
              Generate Drafts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EmailPreviewDialog 
        isOpen={isEmailPreviewOpen} 
        onOpenChange={setIsEmailPreviewOpen} 
        drafts={emailDrafts}
        isLoading={isEmailLoading}
        selectedCount={candidates.filter(c => c.selected).length}
      />
    </>
  );
}
