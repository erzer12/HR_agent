
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ClientCandidate, Job } from "@/lib/types";
<<<<<<< HEAD:frontend/src/app/page.tsx
=======

>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx

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
<<<<<<< HEAD:frontend/src/app/page.tsx
import { Plus, Send, Loader2, FileText, Calendar as CalendarIcon, Briefcase, Upload, Edit, Clock, Trash2, Link as LinkIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";


const PYTHON_API_BASE_URL = "http://localhost:8000";
=======
import { Plus, Send, Loader2, FileText, Calendar as CalendarIcon, Briefcase, Upload, Edit, Clock, Trash2, Link as LinkIcon, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, add, isSameDay } from "date-fns";

>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx

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

<<<<<<< HEAD:frontend/src/app/page.tsx
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
=======
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx


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
<<<<<<< HEAD:frontend/src/app/page.tsx
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
=======
    const calendarConnected = document.cookie.includes('google_calendar_connected=true');

    if (calendarConnected || urlParams.get('calendar') === 'connected') {
      setIsCalendarConnected(true);
      if (urlParams.get('calendar') === 'connected') {
        toast({ title: "Google Calendar Connected!", description: "You can now schedule interviews." });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [toast]);

>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx

  const handleCreateOrUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
<<<<<<< HEAD:frontend/src/app/page.tsx
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
=======
      if (jobToEdit) { // Editing existing job
        // TODO: Implement a PUT /jobs/{job_id} endpoint in Python for updating jobs.
        toast({ title: "Editing not yet implemented in the new backend." });
        console.warn("Update job functionality needs to be migrated to a Python endpoint.");
        resetJobForm();
      } else { // Creating new job
        const formData = new FormData();
        formData.append('title', jobTitleForNewJob);
        formData.append('jobDescription', jobDescriptionForNewJob);
        files.forEach(file => {
            formData.append('resumeFiles', file);
        });

        const response = await fetch('http://localhost:8000/jobs', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create job.');
        }
        
        const result = await response.json();
        toast({ title: "Job created successfully!", description: "Resumes are now being analyzed." });
        
        // The existing snapshot listener will handle UI updates.
        resetJobForm();
      }
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
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
<<<<<<< HEAD:frontend/src/app/page.tsx
        await apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
        toast({ title: "Job Deleted", description: "The job and all its candidates have been removed." });
        if (selectedJob?.id === jobId) {
            setSelectedJob(jobs && jobs.length > 1 ? jobs.filter(j => j.id !== jobId)[0] : null);
        }
=======
      const response = await fetch(`http://localhost:8000/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Try to get more specific error from backend
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to delete job.');
      }

      toast({ title: "Job deleted successfully" });
      // The UI will update via the snapshot listener.
      // We just need to handle the case where the currently selected job is the one being deleted.
      if (selectedJob?.id === jobId) {
         setSelectedJob(jobs && jobs.length > 1 ? jobs.filter(j => j.id !== jobId)[0] : null);
      }

>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
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

  const handleDeleteAllCandidates = async () => {
    if (!selectedJob) return;
    try {
      await deleteAllCandidates(selectedJob.id);
      toast({ title: 'All candidates removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to remove candidates', description: error instanceof Error ? error.message : 'Unknown error' });
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

  const handleSelectCandidates = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
<<<<<<< HEAD:frontend/src/app/page.tsx
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
=======
    if (selectedCandidates.length === 0 || !selectedJob) {
      toast({ variant: 'destructive', title: 'No candidates selected.', description: "Please select at least one candidate to proceed." });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`http://localhost:8000/jobs/${selectedJob.id}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The backend will fetch the top candidates based on score, so we just send the desired count.
        body: JSON.stringify({ count: selectedCandidates.length }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to select candidates.');
      }

      toast({ title: 'Candidates Selected', description: 'The top candidates have been marked for the next steps.' });
      // The UI will update automatically via the Firestore snapshot listener.

    } catch (error) {
      console.error("Error selecting candidates:", error);
      toast({
        variant: "destructive",
        title: "Selection Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
    } finally {
      setIsProcessing(false);
    }
  };

<<<<<<< HEAD:frontend/src/app/page.tsx
  const handleSendEmails = async () => {
    const selectedCandidates = candidates.filter(c => c.selected);
    if (selectedCandidates.length === 0 || !selectedJob || !interviewDate) return;
=======
  const handleSendConfirmationEmails = async () => {
    if (!selectedJob) return;
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx

    setIsSendingEmails(true);

    const fullInterviewDate = new Date(interviewDate);
    const [hours, minutes] = interviewTime.split(':').map(Number);
    fullInterviewDate.setHours(hours, minutes);

    try {
<<<<<<< HEAD:frontend/src/app/page.tsx
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
=======
      const response = await fetch(`http://localhost:8000/jobs/${selectedJob.id}/send-emails`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send emails.');
      }
      
      const result = await response.json();
      toast({
        title: 'Email Process Completed',
        description: `${result.sent_count} emails sent, ${result.failed_count} failed.`,
      });
      // UI will update via snapshot listener as candidate statuses change to 'contacted'

    } catch (error) {
      console.error("Error sending emails:", error);
      toast({
        variant: "destructive",
        title: "Emailing Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
    } finally {
      setIsSendingEmails(false);
    }
  };

<<<<<<< HEAD:frontend/src/app/page.tsx
  const handleConnectToCalendar = async () => {
    try {
        const data = await apiFetch('/api/auth/google');
        window.location.href = data.url;
    } catch (error) {
        // Error toast handled by apiFetch
    }
=======
  const handleScheduleInterviews = async () => {
    if (!selectedJob) return;

    setIsProcessing(true); // A generic loading state
    try {
      const response = await fetch(`http://localhost:8000/jobs/${selectedJob.id}/schedule-interviews`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to schedule interviews.');
      }
      
      const result = await response.json();
      toast({
        title: 'Scheduling Process Completed',
        description: `${result.scheduled_count} interviews scheduled, ${result.failed_count} failed.`,
      });
      // UI will update via snapshot listener as candidate statuses change to 'scheduled'

    } catch (error) {
      console.error("Error scheduling interviews:", error);
      toast({
        variant: "destructive",
        title: "Scheduling Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectToCalendar = () => {
    // Redirect directly to the backend authorization endpoint
    window.location.href = 'http://localhost:8000/authorize';
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
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
                <CardContent className="space-y-4">
                    {(() => {
                        const hasSelectedInUI = candidates.some(c => c.selected);
                        const hasConfirmedSelection = candidates.some(c => c.status === 'selected');
                        const hasContacted = candidates.some(c => c.status === 'contacted');
                        const hasScheduled = candidates.some(c => c.status === 'scheduled');

                        if (hasScheduled) {
                            return <p className="text-green-600 font-semibold">Workflow complete! All selected candidates have been scheduled.</p>;
                        }

                        if (hasContacted) {
                            return (
                                <div>
                                    <p>Emails have been sent. Ready to schedule interviews.</p>
                                    <Button className="mt-4" onClick={handleScheduleInterviews} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin" /> : <CalendarIcon className="mr-2"/>}
                                        3. Schedule Interviews
                                    </Button>
                                </div>
                            );
                        }

                        if (hasConfirmedSelection) {
                            return (
                                <div>
                                    <p>Candidates have been selected. Ready to send confirmation emails.</p>
                                    <Button className="mt-4" onClick={handleSendConfirmationEmails} disabled={isSendingEmails}>
                                        {isSendingEmails ? <Loader2 className="animate-spin" /> : <Send className="mr-2"/>}
                                        2. Send Confirmation Emails
                                    </Button>
                                </div>
                            );
                        }

                        return (
                            <div>
                                <p>You have chosen {selectedCount} candidate(s) in the UI. Confirm your selection to proceed.</p>
                                <Button className="mt-4" onClick={handleSelectCandidates} disabled={selectedCount === 0 || isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin" /> : <Check className="mr-2"/>}
                                    1. Confirm Selected Candidates
                                </Button>
                            </div>
                        );
                    })()}
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

        
    </div>
  );
}

    
<<<<<<< HEAD:frontend/src/app/page.tsx

    
=======
>>>>>>> 51e23ed (feat:Next.js frontend and Python backend):src/app/page.tsx
