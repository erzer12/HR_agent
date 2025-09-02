"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobCreationFormProps {
    onNext: (title: string, description: string) => void;
}

export function JobCreationForm({ onNext }: JobCreationFormProps) {
    const { toast } = useToast();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const handleNext = () => {
        if (!title.trim() || !description.trim()) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please provide both a job title and description.",
            });
            return;
        }
        onNext(title, description);
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clipboard className="text-primary"/> 1. Job Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="job-title">Role Title</Label>
                    <Input 
                        id="job-title" 
                        placeholder="e.g., Senior Frontend Engineer" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea
                        id="job-description"
                        placeholder="Paste the full job description here..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[200px]"
                    />
                </div>
                <div className="flex justify-end mt-4">
                    <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
                        Next: Upload Resumes <ArrowRight className="ml-2"/>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
