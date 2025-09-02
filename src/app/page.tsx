
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ClientCandidate, Job } from "@/lib/types";
import { draftPersonalizedConfirmationEmail } from "@/ai/flows/draft-personalized-confirmation-emails";
import { createJobAndRankCandidates, updateJob, deleteJob } from "@/lib/actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CandidateCard } from "@/components/candidate-card";
import { Logo } from "@/components/logo";
import { EmailPreviewDialog } from "@/components/email-preview-dialog";
import { JobListItem } from "@/components/job-list-item";
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

import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Send, Loader2, FileText, Calendar, Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type EmailDraft = {
  candidateName: string;
  subject: string;
  body: string;
};

type JobWithDate = Omit<Job, 'createdAt'> & { createdAt: Date };


export default function Home() {
  const { toast } = useToast();

  // Job state
  const [jobs, setJobs] = useState<JobWithDate[] | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithDate | null>(null);
  const [isCreatingOrEditingJob, setIsCreatingOrEditingJob] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<JobWithDate | null>(null);

  // Candidate state
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI State
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescriptionForNewJob, setJobDescriptionForNewJob] = useState("");
  const [jobTitleForNewJob, setJobTitleForNewJob] = useState("");


  // Fetch jobs from Firestore
  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as JobWithDate;
      });
      setJobs(jobsData);
      if (!selectedJob && jobsData.length > 0) {
        const currentJob = jobsData.find(j => j.id === selectedJob?.id) || jobsData[0];
        setSelectedJob(currentJob);
      }
    }, (error) => {
      console.error("Error fetching jobs:", error);
      toast({
          variant: "destructive",
          title: "Failed to load jobs",
          description: "Could not retrieve job list from the database."
      });
    });
    return () => unsubscribe();
  }, []);

  // Fetch candidates for selected job
  useEffect(() => {
    if (!selectedJob) {
      setCandidates([]);
      return;
    };
    const candidatesQuery = query(collection(db, "jobs", selectedJob.id, "candidates"), orderBy("suitabilityScore", "desc"));
    const unsubscribe = onSnapshot(candidatesQuery, (snapshot) => {
        const candidatesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            selected: false,
        } as ClientCandidate));
        setCandidates(candidatesData);
    }, (error) => {
      console.error(`Error fetching candidates for job ${selectedJob.id}:`, error);
      toast({
          variant: "destructive",
          title: "Failed to load candidates",
          description: "Could not retrieve candidates for the selected job."
      });
    });

    return () => unsubscribe();
  }, [selectedJob, toast]);


  const handleCreateOrUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitleForNewJob.trim() || !jobDescriptionForNewJob.trim()) {
      toast({ variant: 'destructive', title: 'Title and description are required.' });
      return;
    }
    
    setIsProcessing(true);
    try {
      if (jobToEdit) { // Editing existing job
        await updateJob(jobToEdit.id, { title: jobTitleForNewJob, jobDescription: jobDescriptionForNewJob });
        toast({ title: "Job updated successfully!" });
        const updatedJob = { ...jobToEdit, title: jobTitleForNewJob, jobDescription: jobDescriptionForNewJob };
        setSelectedJob(updatedJob);
         // Find the job in the list and update it
        setJobs(prevJobs => prevJobs?.map(j => j.id === updatedJob.id ? updatedJob : j) || null);
      } else { // Creating new job
        const { jobId } = await createJobAndRankCandidates(jobTitleForNewJob, jobDescriptionForNewJob, files);
        toast({ title: "Job created and resumes are being processed!" });
         // The new job will be picked up by the snapshot listener, so we just need to select it
         // This is a bit of a hack, ideally we'd get the new job back and select it
        setTimeout(() => {
            if (jobs && jobs.length > 0) {
              const newJob = jobs.find(j => j.id === jobId);
              if (newJob) setSelectedJob(newJob);
            }
        }, 1000);
      }
      resetJobForm();
    } catch (error) {
      console.error("Error creating/updating job:", error);
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      toast({ title: "Job deleted successfully" });
      if (selectedJob?.id === jobId) {
         setSelectedJob(jobs && jobs.length > 1 ? jobs.filter(j => j.id !== jobId)[0] : null);
      }
    } catch (error) {
       toast({ variant: 'destructive', title: 'Failed to delete job', description: error instanceof Error ? error.message : 'Unknown error'});
    }
  };
  
  const startNewJob = () => {
    setJobToEdit(null);
    setJobTitleForNewJob("");
    setJobDescriptionForNewJob("");
    setFiles([]);
    setSelectedJob(null);
    setIsCreatingOrEditingJob(true);
  }

  const startEditingJob = (job: JobWithDate) => {
    setJobToEdit(job);
    setJobTitleForNewJob(job.title);
    setJobDescriptionForNewJob(job.jobDescription);
    setFiles([]);
    setSelectedJob(job);
    setIsCreatingOrEditingJob(true);
  }

  const resetJobForm = () => {
    setJobToEdit(null);
    setJobTitleForNewJob("");
    setJobDescriptionForNewJob("");
    setFiles([]);
    setIsCreatingOrEditingJob(false);
    if (jobs && jobs.length > 0) {
        setSelectedJob(jobs[0]);
    } else {
        setSelectedJob(null);
    }
  }

  const handleSelectCandidate = (id: string, selected: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected } : c));
  };

  const handleGenerateEmails = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0 || !selectedJob) return;

    setIsEmailDialogOpen(true);
    setIsGeneratingEmails(true);
    setEmailDrafts([]);

    try {
      const drafts: EmailDraft[] = [];
      for (const candidate of selectedCandidates) {
        const result = await draftPersonalizedConfirmationEmail({
          candidateName: candidate.candidateName,
          jobTitle: selectedJob.title,
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
        setEmailDrafts([...drafts]);
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
  
  const selectedCount = candidates.filter(c => c.selected).length;

  const renderContent = () => {
    if (isCreatingOrEditingJob) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{jobToEdit ? 'Edit Job' : 'Create New Job'}</CardTitle>
            <CardDescription>{jobToEdit ? 'Update the details for this job.' : 'Enter a title, description, and upload resumes to get started.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdateJob} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-title">Role Title</Label>
                <Input id="job-title" placeholder="e.g., Senior Frontend Engineer" value={jobTitleForNewJob} onChange={e => setJobTitleForNewJob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea id="job-description" placeholder="Paste the full job description here..." value={jobDescriptionForNewJob} onChange={e => setJobDescriptionForNewJob(e.target.value)} className="min-h-[150px]" />
              </div>
              {!jobToEdit && (
                <div className="space-y-2">
                  <Label htmlFor="resume-upload">Upload Resumes</Label>
                  <Input id="resume-upload" type="file" multiple accept=".pdf" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} className="h-11" />
                </div>
              )}
               <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="ghost" onClick={resetJobForm}>Cancel</Button>
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin" /> : (jobToEdit ? 'Save Changes' : 'Create & Analyze')}
                </Button>
               </div>
            </form>
          </CardContent>
        </Card>
      );
    }

    if (!selectedJob) {
       return (
        <div className="text-center py-12">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Jobs Found</h2>
          <p className="mt-2 text-muted-foreground">Get started by creating a new job posting.</p>
          <Button className="mt-6" onClick={startNewJob}>
            <Plus className="mr-2"/> Create New Job
          </Button>
        </div>
      )
    }

    return (
       <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Candidate Review</CardTitle>
                <CardDescription>Found {candidates.length} candidates for: <span className="font-semibold text-primary">{selectedJob.title}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {selectedJob.status === 'processing' && (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Analyzing resumes...</div>
                )}
                {selectedJob.status === 'completed' && candidates.map(candidate => (
                    <CandidateCard key={candidate.id} candidate={candidate} onSelect={handleSelectCandidate} />
                ))}
                 {selectedJob.status === 'failed' && (
                    <div className="text-destructive">Processing failed for this job.</div>
                )}
            </CardContent>
        </Card>

        {candidates.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Selected {selectedCount} candidate(s). Proceed to the next step to draft interview emails.</p>
                    <Button className="mt-4 bg-accent hover:bg-accent/90" disabled={selectedCount === 0} onClick={handleGenerateEmails}>
                        <Send className="mr-2"/>
                        Draft Emails for Selected Candidates
                    </Button>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-muted-foreground" /> Calendar</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Interview scheduling and calendar integration will be available here.</p>
            </CardContent>
        </Card>
       </div>
    );
  }

  return (
    <div className="flex">
        <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2">
                <Logo />
                <h1 className="text-xl font-semibold tracking-tight font-headline">ResumeRank</h1>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-lg font-semibold">Jobs</h2>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startNewJob}><Plus/></Button>
                </div>
                <ScrollArea className="h-[calc(100vh-120px)]">
                    <SidebarMenu>
                        {jobs === null && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        {jobs?.map(job => (
                            <SidebarMenuItem key={job.id}>
                                <JobListItem 
                                  job={job}
                                  isSelected={selectedJob?.id === job.id}
                                  onSelect={() => {
                                    setSelectedJob(job);
                                    setIsCreatingOrEditingJob(false);
                                  }}
                                  onEdit={() => startEditingJob(job)}
                                  onDelete={handleDeleteJob}
                                />
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </ScrollArea>
            </SidebarContent>
        </Sidebar>

        <SidebarInset>
             <header className="flex items-center gap-4 px-6 py-4 border-b">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-2xl font-bold tracking-tight font-headline">{isCreatingOrEditingJob ? (jobToEdit ? 'Edit Job' : 'Create Job') : (selectedJob?.title || "Dashboard")}</h1>
            </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8">
                {renderContent()}
            </main>
        </SidebarInset>
        
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
