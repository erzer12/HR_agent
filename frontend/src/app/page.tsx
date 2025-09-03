
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ClientCandidate, Job } from "@/lib/types";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Send, Loader2, FileText, Calendar as CalendarIcon, Briefcase, Upload, Edit, Clock, Trash2, Link as LinkIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


const PYTHON_API_BASE_URL = "http://localhost:8000";

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
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescriptionForNewJob, setJobDescriptionForNewJob] = useState("");
  const [jobTitleForNewJob, setJobTitleForNewJob] = useState("");
  const [newResumeFiles, setNewResumeFiles] = useState<File[]>([]);
  const [isAddingResumes, setIsAddingResumes] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);


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
  }, [selectedJob?.id, toast]);

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

  // Check for calendar connection status (e.g., from a cookie or local storage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calendar') === 'connected') {
      setIsCalendarConnected(true);
      toast({ title: "Google Calendar Connected!", description: "You can now schedule interviews." });
      // Set a cookie to persist the connected state
      document.cookie = "google_calendar_connected=true; path=/; max-age=31536000"; // Expires in 1 year
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (document.cookie.includes('google_calendar_connected=true')) {
        setIsCalendarConnected(true);
    }
  }, [toast]);


  const apiFetch = async (url: string, options: RequestInit = {}) => {
    try {
        const response = await fetch(`${PYTHON_API_BASE_URL}${url}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(errorData.detail || 'An unknown API error occurred');
        }
        if (response.status === 204) { // No Content
            return null;
        }
        return response.json();
    } catch (error: any) {
        console.error(`API Error fetching ${url}:`, error);
        toast({
            variant: "destructive",
            title: "API Error",
            description: error.message || "Could not connect to the backend server.",
        });
        throw error;
    }
  };

  const handleCreateOrUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
        if (jobToEdit) { // This is an update
            await apiFetch(`/api/jobs/${jobToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: jobTitleForNewJob,
                    jobDescription: jobDescriptionForNewJob
                }),
            });
            toast({ title: "Job Updated", description: "The job details have been saved." });
        } else { // This is a new job
            const formData = new FormData();
            formData.append('title', jobTitleForNewJob);
            formData.append('jobDescription', jobDescriptionForNewJob);
            files.forEach(file => formData.append('resumes', file));

            const data = await apiFetch('/api/jobs', {
                method: 'POST',
                body: formData,
            });
            toast({ title: "Job Created!", description: `Job ID ${data.jobId} is now being processed.` });
        }
        resetJobForm();
    } catch (error) {
        // Error toast is handled by apiFetch
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddResumes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || newResumeFiles.length === 0) return;

    setIsAddingResumes(true);
    const formData = new FormData();
    newResumeFiles.forEach(file => formData.append('resumes', file));

    try {
        await apiFetch(`/api/jobs/${selectedJob.id}/resumes`, {
            method: 'POST',
            body: formData,
        });
        toast({ title: "Resumes Added", description: "New resumes are being analyzed." });
        setNewResumeFiles([]);
    } catch (error) {
       // Error toast handled by apiFetch
    } finally {
        setIsAddingResumes(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
        await apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
        toast({ title: "Job Deleted", description: "The job and all its candidates have been removed." });
        if (selectedJob?.id === jobId) {
            setSelectedJob(jobs && jobs.length > 1 ? jobs.filter(j => j.id !== jobId)[0] : null);
        }
    } catch (error) {
        // Error toast handled by apiFetch
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
     if (!selectedJob) return;
    try {
        await apiFetch(`/api/jobs/${selectedJob.id}/candidates/${candidateId}`, { method: 'DELETE' });
        toast({ title: "Candidate Removed" });
    } catch (error) {
        // Error toast handled by apiFetch
    }
  };

  const handleDeleteAllCandidates = async () => {
    if (!selectedJob) return;
    try {
        await apiFetch(`/api/jobs/${selectedJob.id}/candidates`, { method: 'DELETE' });
        toast({ title: "All Candidates Removed", description: "All candidates for this job have been deleted." });
    } catch (error) {
        // Error toast handled by apiFetch
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

    if (!isCalendarConnected) {
      toast({ variant: 'destructive', title: "Google Calendar not connected", description: "Please connect your calendar to schedule interviews."});
      return;
    }

    setIsSchedulingDialogOpen(false);
    setIsEmailDialogOpen(true);
    setIsGeneratingEmails(true);
    setEmailDrafts([]);

    const fullInterviewDate = new Date(interviewDate);
    const [hours, minutes] = interviewTime.split(':').map(Number);
    fullInterviewDate.setHours(hours, minutes);

    try {
        const drafts = await apiFetch(`/api/emails/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId: selectedJob.id,
                interviewDatetime: fullInterviewDate.toISOString(),
                candidateIds: selectedCandidates.map(c => c.id),
            }),
        });
        setEmailDrafts(drafts);
    } catch (error) {
      setIsEmailDialogOpen(false);
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  const handleSendEmails = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0 || !selectedJob || !interviewDate) return;

    setIsSendingEmails(true);

    const fullInterviewDate = new Date(interviewDate);
    const [hours, minutes] = interviewTime.split(':').map(Number);
    fullInterviewDate.setHours(hours, minutes);

    try {
        await apiFetch(`/api/emails/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId: selectedJob.id,
                interviewDatetime: fullInterviewDate.toISOString(),
                candidateIds: selectedCandidates.map(c => c.id),
                // TODO: You'll need a way to get the user's Google tokens
                // that were stored by your Python backend. This might involve
                // a secure cookie or another API call.
                // userGoogleTokens: { ... } 
            }),
        });
        toast({ title: "Emails Sent!", description: "The interview confirmations are on their way." });
        setIsEmailDialogOpen(false);
    } catch (error) {
        // Error toast handled by apiFetch
    } finally {
        setIsSendingEmails(false);
    }
  };

  const handleConnectToCalendar = async () => {
    try {
        const data = await apiFetch('/api/auth/google');
        window.location.href = data.url;
    } catch (error) {
        // Error toast handled by apiFetch
    }
  }

  
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
                <Input id="job-title" placeholder="e.g., Senior Frontend Engineer" value={jobTitleForNewJob} onChange={e => setJobTitleForNewJob(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea id="job-description" placeholder="Paste the full job description here..." value={jobDescriptionForNewJob} onChange={e => setJobDescriptionForNewJob(e.target.value)} className="min-h-[150px]" required />
              </div>
              {!jobToEdit && (
                <div className="space-y-2">
                  <Label htmlFor="resume-upload">Upload Resumes</Label>
                  <Input id="resume-upload" type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} className="h-11" required />
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
            <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1.5">
                    <CardTitle>Candidate Review</CardTitle>
                    <CardDescription>Found {candidates.length} candidates for: <span className="font-semibold text-primary">{selectedJob.title}</span></CardDescription>
                </div>
                 <div className="flex gap-2">
                    {candidates.length > 0 && (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50">
                                  <Trash2 className="mr-2"/>
                                  Remove All
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This will permanently remove all {candidates.length} candidates from this job. This action cannot be undone.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleDeleteAllCandidates} className="bg-destructive hover:bg-destructive/90">Delete All Candidates</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button variant="outline" onClick={() => startEditingJob(selectedJob)}>
                        <Edit className="mr-2"/>
                        Edit Job
                    </Button>
                 </div>
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
                <CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" /> Google Calendar</CardTitle>
                <CardDescription>
                    {isCalendarConnected 
                      ? "Your scheduled interviews are highlighted below." 
                      : "Connect your Google Calendar to view and manage interview schedules."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {isCalendarConnected ? (
                 <Calendar
                    mode="multiple"
                    selected={scheduledDates}
                    className="p-0"
                    classNames={{
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                    }}
                  />
              ) : (
                <Button onClick={handleConnectToCalendar}>
                    <LinkIcon className="mr-2" />
                    Connect to Google Calendar
                </Button>
              )}
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

    

    
