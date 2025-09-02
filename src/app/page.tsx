"use client";

import { useState, useEffect, useMemo } from "react";
import type { ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";

import type { ClientCandidate, Job } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { createJobAndRankCandidates, deleteJob, updateJob } from "@/lib/actions";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CandidateCard } from "@/components/candidate-card";
import { EmailPreviewDialog } from "@/components/email-preview-dialog";
import { Logo } from "@/components/logo";
import { JobListItem } from "@/components/job-list-item";
import { formatDistanceToNow } from "date-fns";

import { UploadCloud, Sparkles, Users, FileText, Crown, Mail, Loader2, Calendar, Clock, User, PlusCircle, Briefcase, Edit } from "lucide-react";

type EmailDraft = {
  candidateName: string;
  subject: string;
  body: string;
};

export default function Home() {
  const { toast } = useToast();
  
  // New state for multi-job architecture
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ClientCandidate[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  
  // State for the "New Job" dialog
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  
  // State for Edit Job Dialog
  const [isEditJobDialogOpen, setIsEditJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isUpdatingJob, setIsUpdatingJob] = useState(false);

  // State for Delete Job Dialog
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);


  // Existing state for actions on candidates
  const [topN, setTopN] = useState("3");
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [interviewDetails, setInterviewDetails] = useState({ date: "", time: "", interviewer: "" });
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);


  // Effect to load jobs from Firestore
  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobsData: Job[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        jobsData.push({
          id: doc.id,
          title: data.title,
          jobDescription: data.jobDescription,
          createdAt: data.createdAt?.toDate(),
          status: data.status,
        });
      });
      setJobs(jobsData);
      if (isJobsLoading) {
        setIsJobsLoading(false);
        if (jobsData.length > 0 && !selectedJobId) {
            setSelectedJobId(jobsData[0].id)
        }
      }
    }, (error) => {
        console.error("Error fetching jobs:", error);
        toast({ variant: 'destructive', title: 'Could not load jobs.'});
        setIsJobsLoading(false);
    });

    return () => unsubscribe();
  }, [isJobsLoading, toast, selectedJobId]);

  // Effect to load candidates when a job is selected
  useEffect(() => {
    if (!selectedJobId) {
        setCandidates([]);
        return;
    };

    setIsCandidatesLoading(true);
    const candidatesQuery = query(collection(db, "jobs", selectedJobId, "candidates"), orderBy("suitabilityScore", "desc"));
    const unsubscribe = onSnapshot(candidatesQuery, (snapshot) => {
        const newCandidates: ClientCandidate[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            newCandidates.push({
                id: doc.id,
                ...data,
                selected: false,
                fileName: '' // fileName is not stored anymore
            } as ClientCandidate)
        });
        
        setCandidates(prevCandidates => {
            // Preserve selection state
            const selectionMap = new Map(prevCandidates.map(c => [c.id, c.selected]));
            return newCandidates.map(c => ({...c, selected: selectionMap.get(c.id) || false}));
        });
        setIsCandidatesLoading(false);

    }, (error) => {
        console.error(`Error fetching candidates for job ${selectedJobId}:`, error);
        toast({ variant: 'destructive', title: 'Could not load candidates.'});
        setIsCandidatesLoading(false);
    });

    return () => unsubscribe();

  }, [selectedJobId, toast]);


  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleCreateJob = async () => {
    if (!jobDescription.trim() || files.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide a job description and upload resumes.",
      });
      return;
    }
    setIsCreatingJob(true);
    try {
      const { jobId } = await createJobAndRankCandidates(jobDescription, files);
      toast({
        title: "Job Created!",
        description: "Candidates are being ranked. The list will update automatically.",
      });
      setSelectedJobId(jobId);
      setIsNewJobDialogOpen(false);
      setJobDescription("");
      setFiles([]);
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        variant: "destructive",
        title: "Job Creation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsCreatingJob(false);
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

  const handleDraftEmails = () => {
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
    const job = jobs.find(j => j.id === selectedJobId);
    const jobTitle = job?.title || 'the role';
    
    // This part is now much faster as it's just a template.
    const generatedDrafts: EmailDraft[] = selectedCandidates.map(candidate => {
      const candidateName = candidate.candidateName;
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

      return {
        candidateName,
        subject: emailSubject,
        body: emailBody
      };
    });
    
    setEmailDrafts(generatedDrafts);
    setIsEmailLoading(false);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setIsEditJobDialogOpen(true);
  };
  
  const handleUpdateJob = async () => {
    if (!editingJob) return;
    setIsUpdatingJob(true);
    try {
      await updateJob(editingJob.id, {
        title: editingJob.title,
        jobDescription: editingJob.jobDescription,
      });
      toast({ title: "Job updated successfully!" });
      setIsEditJobDialogOpen(false);
      setEditingJob(null);
    } catch (error) {
      console.error("Error updating job:", error);
      toast({ variant: 'destructive', title: "Failed to update job" });
    } finally {
      setIsUpdatingJob(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    setIsDeletingJob(true);
    try {
      await deleteJob(jobId);
      toast({ title: "Job deleted successfully" });
      if (selectedJobId === jobId) {
        const remainingJobs = jobs.filter(j => j.id !== jobId);
        setSelectedJobId(remainingJobs.length > 0 ? remainingJobs[0].id : null);
      }
      setJobToDelete(null);
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({ variant: "destructive", title: "Failed to delete job" });
    } finally {
      setIsDeletingJob(false);
    }
  };
  
  const selectedCount = candidates.filter(c => c.selected).length;
  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);

  return (
    <>
      <div className="flex flex-col h-full bg-muted/30">
        <header className="flex items-center gap-4 px-6 py-4 border-b bg-background">
          <Logo />
          <h1 className="text-2xl font-bold tracking-tight font-headline">ResumeRank</h1>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="grid h-full lg:grid-cols-[320px_1fr]">
            <aside className="flex flex-col gap-4 p-4 border-r bg-background">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Briefcase/>Job Postings</h2>
                <Button size="sm" onClick={() => setIsNewJobDialogOpen(true)}><PlusCircle className="mr-2"/>New Job</Button>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                {isJobsLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full"/>)}
                {!isJobsLoading && jobs.map(job => (
                    <JobListItem
                        key={job.id}
                        job={job}
                        isSelected={selectedJobId === job.id}
                        onSelect={() => setSelectedJobId(job.id)}
                        onEdit={handleEditJob}
                        onDelete={(jobId) => setJobToDelete(jobId)}
                    />
                ))}
                {!isJobsLoading && jobs.length === 0 && (
                    <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg mt-4">
                        <p>No jobs found.</p>
                        <p className="text-sm mt-1">Create one to get started.</p>
                    </div>
                )}
              </div>
            </aside>
            
            <div className="flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b p-4">
                      {selectedJob && (
                          <>
                          <h2 className="text-xl font-semibold flex items-center gap-2"><Users />Ranked Candidates for: {selectedJob.title}</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                              {`Created ${formatDistanceToNow(selectedJob.createdAt!, { addSuffix: true })}`}
                          </p>
                          </>
                      )}
                      {!selectedJob && !isJobsLoading && (
                          <>
                          <h2 className="text-xl font-semibold">Welcome to ResumeRank</h2>
                          <p className="text-sm text-muted-foreground mt-1">Select a job on the left or create a new one to start ranking candidates.</p>
                          </>
                      )}
                      {isJobsLoading && (
                          <>
                            <Skeleton className="h-7 w-3/5 mb-2"/>
                            <Skeleton className="h-4 w-1/4"/>
                          </>
                      )}
                </div>
                  <div className="p-4">
                    {(isCandidatesLoading || (selectedJob?.status === 'processing' && candidates.length === 0)) && (
                       <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                             <div key={i} className="p-4 border rounded-lg space-y-3 bg-background">
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
                    {!isCandidatesLoading && selectedJobId && candidates.length === 0 && selectedJob?.status !== 'processing' &&(
                      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-96 bg-background/50">
                        <FileText className="w-16 h-16 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-semibold">No Candidates Found</h3>
                        <p className="mt-2 text-muted-foreground">This job posting has no candidates yet.</p>
                      </div>
                    )}
                    {candidates.length > 0 && (
                       <div className="space-y-4">
                        {candidates.map(candidate => (
                          <CandidateCard key={candidate.id} candidate={candidate} onSelect={handleSelectCandidate} />
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              {candidates.length > 0 && (
                <div className="p-4 border-t bg-background">
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Crown className="text-accent" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4 items-center">
                    <div className="space-y-2">
                      <Label htmlFor="top-n">Select Top N</Label>
                      <div className="flex gap-2">
                        <Input id="top-n" type="number" value={topN} onChange={e => setTopN(e.target.value)} className="w-20" />
                        <Button variant="outline" onClick={handleSelectTopN}>Select</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <Label>Email Automation</Label>
                       <Button onClick={handleDraftEmails} className="w-full bg-accent hover:bg-accent/90">
                          <Mail className="mr-2" />
                          Draft Emails ({selectedCount})
                       </Button>
                    </div>
                  </CardContent>
                </Card>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
      
      {/* New Job Dialog */}
      <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Job Posting</DialogTitle>
            <DialogDescription>
              Enter a job description and upload resumes to start the ranking process.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                <Label htmlFor="resume-upload">Upload Resumes (.pdf, .docx, .doc)</Label>
                <div className="relative">
                  <Input id="resume-upload" type="file" multiple accept=".pdf,.doc,.docx" onChange={handleFileChange} className="pr-12 h-11" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <UploadCloud className="w-5 h-5 text-muted-foreground" />
                    </div>
                </div>
                  {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} file(s) selected.</p>}
              </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateJob} disabled={isCreatingJob} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              {isCreatingJob ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
              Create & Rank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Job Dialog */}
      <Dialog open={isEditJobDialogOpen} onOpenChange={setIsEditJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>Update the title and description for this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-job-title">Job Title</Label>
              <Input
                id="edit-job-title"
                value={editingJob?.title || ''}
                onChange={(e) => setEditingJob(prev => prev ? { ...prev, title: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job-description">Job Description</Label>
              <Textarea
                id="edit-job-description"
                value={editingJob?.jobDescription || ''}
                onChange={(e) => setEditingJob(prev => prev ? { ...prev, jobDescription: e.target.value } : null)}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditJobDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateJob} disabled={isUpdatingJob}>
              {isUpdatingJob ? <Loader2 className="animate-spin" /> : <Edit className="mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job posting and all associated candidates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteJob(jobToDelete!)} disabled={isDeletingJob} className="bg-destructive hover:bg-destructive/90">
              {isDeletingJob ? <Loader2 className="animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Interview Details Dialog */}
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
        selectedCount={selectedCount}
      />
    </>
  );
}
