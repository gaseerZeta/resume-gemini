'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { batchUploadResumes } from '@/app/actions/upload';
import type { BatchUploadResult, FileProcessingResult } from '@/lib/types';
import { toast } from 'sonner';

type UploadPhase = 'idle' | 'uploading' | 'complete';

interface FileEntry {
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
}

export default function UploadPage() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [phase, setPhase] = useState<UploadPhase>('idle');
    const [result, setResult] = useState<BatchUploadResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
        );
        addFiles(droppedFiles);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
            );
            addFiles(selectedFiles);
        }
    }, []);

    const addFiles = (newFiles: File[]) => {
        setFiles((prev) => {
            const combined = [
                ...prev,
                ...newFiles.map((file) => ({ file, status: 'pending' as const })),
            ];
            if (combined.length > 10) {
                toast.error('Maximum 10 files allowed per batch.');
                return combined.slice(0, 10);
            }
            return combined;
        });
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setPhase('uploading');
        setProgress(10);

        // Mark all as processing
        setFiles((prev) => prev.map((f) => ({ ...f, status: 'processing' as const })));

        // Simulate progress increments while processing
        const progressInterval = setInterval(() => {
            setProgress((prev) => Math.min(prev + 5, 90));
        }, 500);

        try {
            const formData = new FormData();
            files.forEach((entry) => formData.append('files', entry.file));

            const uploadResult = await batchUploadResumes(formData);
            setResult(uploadResult);

            // Update individual file statuses
            setFiles((prev) =>
                prev.map((entry) => {
                    const fileResult = uploadResult.results.find(
                        (r: FileProcessingResult) => r.fileName === entry.file.name
                    );
                    if (fileResult) {
                        return {
                            ...entry,
                            status: fileResult.status,
                            error: fileResult.error,
                        };
                    }
                    return entry;
                })
            );

            if (uploadResult.succeeded === uploadResult.total) {
                toast.success(`All ${uploadResult.total} resumes processed successfully!`);
            } else if (uploadResult.succeeded > 0) {
                toast.warning(
                    `${uploadResult.succeeded}/${uploadResult.total} resumes processed. ${uploadResult.failed} failed.`
                );
            } else {
                toast.error('All resumes failed to process.');
            }
        } catch (error) {
            toast.error('Upload failed. Please try again.');
            setFiles((prev) =>
                prev.map((f) => ({
                    ...f,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Upload failed',
                }))
            );
        } finally {
            clearInterval(progressInterval);
            setProgress(100);
            setPhase('complete');
        }
    };

    const resetUpload = () => {
        setFiles([]);
        setPhase('idle');
        setResult(null);
        setProgress(0);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="animate-fade-in-up opacity-0">
                <h1 className="text-3xl font-bold tracking-tight">
                    <span className="gradient-text">Upload Resumes</span>
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Drag and drop up to 10 PDF resumes for AI-powered extraction and analysis.
                </p>
            </div>

            {/* Drop Zone */}
            {phase === 'idle' && (
                <div
                    className={`animate-fade-in-up opacity-0 delay-100 relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${dragActive
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
                        onChange={handleFileInput}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        id="file-upload"
                    />
                    <div className="flex flex-col items-center gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 transition-transform ${dragActive ? 'animate-float' : ''}`}>
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">
                                Drop PDF files here or{' '}
                                <span className="gradient-text cursor-pointer">browse</span>
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Supports up to 10 PDF resumes per batch
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3 animate-fade-in-up opacity-0 delay-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {files.length} file{files.length > 1 ? 's' : ''} selected
                        </h3>
                        {phase === 'idle' && (
                            <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                                Clear all
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {files.map((entry, index) => (
                            <div
                                key={`${entry.file.name}-${index}`}
                                className="glass-card flex items-center gap-4 rounded-xl p-4 animate-slide-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <FileText className={`h-5 w-5 ${entry.status === 'success'
                                        ? 'text-emerald-500'
                                        : entry.status === 'error'
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-medium">{entry.file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(entry.file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {entry.status === 'pending' && (
                                        <span className="text-xs text-muted-foreground">Pending</span>
                                    )}
                                    {entry.status === 'processing' && (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    )}
                                    {entry.status === 'success' && (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    )}
                                    {entry.status === 'error' && (
                                        <div className="flex items-center gap-1">
                                            <XCircle className="h-5 w-5 text-destructive" />
                                            {entry.error && (
                                                <span className="max-w-[200px] truncate text-xs text-destructive">
                                                    {entry.error}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {phase === 'idle' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {phase === 'uploading' && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Processing resumes...</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Extracting text → AI parsing → Generating embeddings → Storing in database
                    </p>
                </div>
            )}

            {/* Result Summary */}
            {phase === 'complete' && result && (
                <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0">
                    <div className="flex items-center gap-3 mb-4">
                        {result.failed === 0 ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : result.succeeded > 0 ? (
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                        ) : (
                            <XCircle className="h-6 w-6 text-destructive" />
                        )}
                        <h3 className="text-lg font-semibold">
                            {result.failed === 0
                                ? 'All resumes processed successfully!'
                                : `${result.succeeded} of ${result.total} processed`}
                        </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-xl bg-emerald-500/10 p-3">
                            <p className="text-2xl font-bold text-emerald-500">{result.succeeded}</p>
                            <p className="text-xs text-muted-foreground">Succeeded</p>
                        </div>
                        <div className="rounded-xl bg-destructive/10 p-3">
                            <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                        </div>
                        <div className="rounded-xl bg-primary/10 p-3">
                            <p className="text-2xl font-bold text-primary">{result.total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
                {phase === 'idle' && files.length > 0 && (
                    <Button
                        size="lg"
                        onClick={handleUpload}
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20"
                    >
                        <Upload className="mr-2 h-5 w-5" />
                        Process {files.length} Resume{files.length > 1 ? 's' : ''}
                    </Button>
                )}
                {phase === 'complete' && (
                    <>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={resetUpload}
                        >
                            Upload More
                        </Button>
                        <Button size="lg" asChild className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600">
                            <a href="/resumes">View All Resumes</a>
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
