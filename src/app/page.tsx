
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ClientCandidate, Job } from "@/lib/types";
import { draftPersonalizedConfirmationEmail } from "@/ai/flows/draft-personalized-confirmation-emails";
import { createJobAndRankCandidates, updateJob, deleteJob, addResumesToJob, deleteCandidate, sendInterviewEmail } from "@/lib/actions";

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
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Send, Loader2, FileText, Calendar as CalendarIcon, Briefcase, Upload, Edit, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EmailDraft = {
  candidateName: string;
  candidateEmail: string | null;
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
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState<Date | undefined>();
  const [interviewTime, setInterviewTime] = useState("10:00");
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescriptionForNewJob, setJobDescriptionForNewJob] = useState("");
  const [jobTitleForNewJob, setJobTitleForNewJob] = useState("");
  const [newResumeFiles, setNewResumeFiles] = useState<File[]>([]);
  const [isAddingResumes, setIsAddingResumes] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);


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
      } else if (selectedJob) {
        // If a job is selected, make sure it's kept up to date (e.g. status change)
        const updatedSelectedJob = jobsData.find(j => j.id === selectedJob.id);
        if (updatedSelectedJob) {
          setSelectedJob(updatedSelectedJob);
        }
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
  }, [selectedJob?.id]);

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

  const handleAddResumes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || newResumeFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Please select resume files.'});
      return;
    }
    setIsAddingResumes(true);
    try {
      await addResumesToJob(selectedJob.id, newResumeFiles);
      toast({ title: "Resumes added and are being processed!" });
      setNewResumeFiles([]);
    } catch (error) {
       console.error("Error adding resumes:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Resumes",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
        setIsAddingResumes(false);
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

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!selectedJob) return;
    try {
      await deleteCandidate(selectedJob.id, candidateId);
      toast({ title: 'Candidate removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to remove candidate', description: error instanceof Error ? error.message : 'Unknown error' });
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
        const currentSelectedJob = selectedJob ? jobs.find(j => j.id === selectedJob.id) : null;
        if(currentSelectedJob) {
          setSelectedJob(currentSelectedJob);
        } else {
          setSelectedJob(jobs[0]);
        }
    } else {
        setSelectedJob(null);
    }
  }

  const handleSelectCandidate = (id: string, selected: boolean) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected } : c));
  };

  const handleProceedToEmail = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0 || !selectedJob || !interviewDate) return;

    setIsSchedulingDialogOpen(false);
    setIsEmailDialogOpen(true);
    setIsGeneratingEmails(true);
    setEmailDrafts([]);

    try {
      const drafts: EmailDraft[] = [];
      const formattedDate = format(interviewDate, "PPP");

      for (const candidate of selectedCandidates) {
        const result = await draftPersonalizedConfirmationEmail({
          candidateName: candidate.candidateName,
          jobTitle: selectedJob.title,
          interviewDate: formattedDate,
          interviewTime: interviewTime,
          interviewerName: "the Hiring Manager",
          candidateEmail: candidate.candidateEmail || undefined,
        });
        drafts.push({
          candidateName: candidate.candidateName,
          candidateEmail: candidate.candidateEmail,
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
      setIsEmailDialogOpen(false); // Close the email dialog on error
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  const handleSendEmails = async () => {
    if (emailDrafts.length === 0 || !interviewDate) return;
    setIsSendingEmails(true);
    try {
      await Promise.all(
        emailDrafts.map(draft => {
          if (draft.candidateEmail) {
            return sendInterviewEmail(draft.candidateEmail, draft.subject, draft.body);
          }
          return Promise.resolve();
        })
      );
      toast({ title: 'Emails sent successfully!' });
      
      // Add the date to the list of scheduled dates to be shown on the calendar
      setScheduledDates(prev => {
        // Avoid adding duplicate dates
        if (prev.some(d => d.getTime() === interviewDate.getTime())) {
          return prev;
        }
        return [...prev, interviewDate];
      });

       // Here you would also trigger the Google Calendar event creation
       // For now, we'll just log it.
      console.log('TODO: Trigger Google Calendar event creation for date:', interviewDate, 'and time:', interviewTime);
      setIsEmailDialogOpen(false);
    } catch (error) {
       console.error("Error sending emails:", error);
       toast({
        variant: "destructive",
        title: "Failed to Send Emails",
        description: error instanceof Error ? error.message : "Could not send emails. Please check the server logs.",
      });
    } finally {
      setIsSendingEmails(false);
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
                  <Input id="resume-upload" type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} className="h-11" />
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
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle>Candidate Review</CardTitle>
                    <CardDescription>Found {candidates.length} candidates for: <span className="font-semibold text-primary">{selectedJob.title}</span></CardDescription>
                </div>
                 <Button variant="outline" onClick={() => startEditingJob(selectedJob)}>
                    <Edit className="mr-2"/>
                    Edit Job
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {selectedJob.status === 'processing' && (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Analyzing resumes...</div>
                )}
                {selectedJob.status === 'completed' && candidates.length > 0 && candidates.map(candidate => (
                    <CandidateCard 
                      key={candidate.id} 
                      candidate={candidate} 
                      onSelect={handleSelectCandidate} 
                      onDelete={() => handleDeleteCandidate(candidate.id)}
                    />
                ))}
                 {selectedJob.status === 'completed' && candidates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No candidates have been analyzed for this job yet.</div>
                )}
                 {selectedJob.status === 'failed' && (
                    <div className="text-destructive p-4 bg-destructive/10 rounded-md">Processing failed for this job. Please try creating a new job or upload resumes below.</div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Add More Resumes</CardTitle>
                <CardDescription>Upload additional resumes to analyze for this job posting.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddResumes} className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="new-resume-upload">Upload Resumes</Label>
                        <Input id="new-resume-upload" type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={(e) => setNewResumeFiles(e.target.files ? Array.from(e.target.files) : [])} className="h-11" />
                    </div>
                     <div className="flex justify-end">
                        <Button type="submit" disabled={isAddingResumes || newResumeFiles.length === 0}>
                            {isAddingResumes ? <Loader2 className="animate-spin" /> : <Upload />}
                            Upload & Analyze
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        {candidates.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Selected {selectedCount} candidate(s). Proceed to the next step to schedule interviews and draft emails.</p>
                    <Button className="mt-4 bg-accent hover:bg-accent/90" disabled={selectedCount === 0} onClick={() => setIsSchedulingDialogOpen(true)}>
                        <Send className="mr-2"/>
                        Schedule & Draft Emails
                    </Button>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" /> Calendar</CardTitle>
                <CardDescription>View your upcoming interview schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <Calendar
                    mode="multiple"
                    selected={scheduledDates}
                    onSelect={setScheduledDates}
                    className="p-0"
                />
            </CardContent>
        </Card>
       </div>
    );
  }

  return (
    <div className="flex h-full">
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
                        {jobs === null && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                        {jobs?.map(job => (
                            <SidebarMenuItem key={job.id}>
                                <JobListItem 
                                  job={job}
                                  isSelected={selectedJob?.id === job.id && !isCreatingOrEditingJob}
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
             <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {renderContent()}
            </main>
        </SidebarInset>

        <Dialog open={isSchedulingDialogOpen} onOpenChange={setIsSchedulingDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Schedule Interview</DialogTitle>
                    <DialogDescription>
                        Select a date and time for the interview for the {selectedCount} selected candidate(s).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="interview-date" className="text-right">
                            Date
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "col-span-3 justify-start text-left font-normal",
                                    !interviewDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {interviewDate ? format(interviewDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={interviewDate}
                                onSelect={setInterviewDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="interview-time" className="text-right">
                            Time
                        </Label>
                         <Input
                            id="interview-time"
                            type="time"
                            value={interviewTime}
                            onChange={(e) => setInterviewTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsSchedulingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleProceedToEmail} disabled={!interviewDate || !interviewTime}>Proceed to Draft Email</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <EmailPreviewDialog
            isOpen={isEmailDialogOpen}
            onOpenChange={setIsEmailDialogOpen}
            drafts={emailDrafts}
            isLoading={isGeneratingEmails}
            isSending={isSendingEmails}
            selectedCount={selectedCount}
            onSend={handleSendEmails}
        />
    </div>
  );
}
