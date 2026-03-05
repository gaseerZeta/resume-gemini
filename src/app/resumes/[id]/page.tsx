'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FileText,
    Mail,
    Briefcase,
    Calendar,
    Loader2,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getResumeById, updateResumeStatus, deleteResume } from '@/app/actions/resumes';
import type { Resume, ResumeStatus } from '@/lib/types';
import { toast } from 'sonner';

const statusColors: Record<ResumeStatus, string> = {
    New: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shortlisted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export default function ResumeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [resume, setResume] = useState<Resume | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!params.id) return;
            try {
                const data = await getResumeById(params.id as string);
                setResume(data);
            } catch {
                toast.error('Failed to load resume');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.id]);

    const handleStatusChange = async (newStatus: ResumeStatus) => {
        if (!resume) return;
        try {
            await updateResumeStatus(resume.id, newStatus);
            setResume({ ...resume, status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!resume) return;
        if (!confirm('Are you sure you want to delete this resume?')) return;
        try {
            await deleteResume(resume.id);
            toast.success('Resume deleted');
            router.push('/resumes');
        } catch {
            toast.error('Failed to delete resume');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!resume) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Resume not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <a href="/resumes">Back to Resumes</a>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => router.back()} className="animate-fade-in">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            {/* Header */}
            <div className="glass-card rounded-2xl p-8 animate-fade-in-up opacity-0">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{resume.full_name}</h1>
                            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                                {resume.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-4 w-4" />
                                        {resume.email}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" />
                                    {resume.years_of_experience} years experience
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(resume.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select
                            value={resume.status}
                            onValueChange={(v) => handleStatusChange(v as ResumeStatus)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <Badge variant="outline" className={statusColors[resume.status]}>
                                    {resume.status}
                                </Badge>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="destructive" size="icon" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Executive Summary */}
                <div className="glass-card rounded-2xl p-6 lg:col-span-2 animate-fade-in-up opacity-0 delay-100">
                    <h2 className="text-lg font-semibold mb-4 gradient-text">Executive Summary</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        {resume.executive_summary || 'No summary available'}
                    </p>
                </div>

                {/* Skills */}
                <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0 delay-200">
                    <h2 className="text-lg font-semibold mb-4 gradient-text">
                        Skills ({resume.skills.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {resume.skills.map((skill) => (
                            <Badge
                                key={skill}
                                variant="secondary"
                                className="px-3 py-1"
                            >
                                {skill}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            {/* File Info */}
            <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0 delay-300">
                <h2 className="text-lg font-semibold mb-4 gradient-text">File Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">File Name</span>
                        <p className="font-medium mt-1">{resume.file_name}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Uploaded</span>
                        <p className="font-medium mt-1">
                            {new Date(resume.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>

                {resume.raw_text && (
                    <>
                        <Separator className="my-6" />
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            Extracted Raw Text
                        </h3>
                        <pre className="max-h-[300px] overflow-auto rounded-xl bg-background/50 p-4 text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                            {resume.raw_text}
                        </pre>
                    </>
                )}
            </div>
        </div>
    );
}
