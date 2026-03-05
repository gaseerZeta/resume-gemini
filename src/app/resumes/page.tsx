'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileText,
    Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fetchResumes, updateResumeStatus } from '@/app/actions/resumes';
import type { Resume, ResumeStatus, PaginatedResponse } from '@/lib/types';
import { toast } from 'sonner';

const statusColors: Record<ResumeStatus, string> = {
    New: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shortlisted: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    Rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export default function ResumesPage() {
    const [data, setData] = useState<PaginatedResponse<Resume> | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [minYears, setMinYears] = useState<string>('');
    const [maxYears, setMaxYears] = useState<string>('');
    const [search, setSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounce(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadResumes = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchResumes({
                page,
                pageSize: 10,
                status: statusFilter as ResumeStatus | 'all',
                minYears: minYears ? parseInt(minYears) : undefined,
                maxYears: maxYears ? parseInt(maxYears) : undefined,
                search: searchDebounce || undefined,
            });
            setData(result);
        } catch {
            toast.error('Failed to load resumes');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, minYears, maxYears, searchDebounce]);

    useEffect(() => {
        loadResumes();
    }, [loadResumes]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, minYears, maxYears, searchDebounce]);

    const handleStatusChange = async (resumeId: string, newStatus: ResumeStatus) => {
        try {
            await updateResumeStatus(resumeId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            loadResumes();
        } catch {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in-up opacity-0">
                <h1 className="text-3xl font-bold tracking-tight">
                    <span className="gradient-text">Resumes</span>
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Browse, search, and manage all processed resumes.
                </p>
            </div>

            {/* Filters Bar */}
            <div className="glass-card animate-fade-in-up opacity-0 delay-100 rounded-2xl p-4 overflow-visible relative">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or summary..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-transparent border-input"
                        />
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] bg-transparent">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Experience Range */}
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="Min yrs"
                            value={minYears}
                            onChange={(e) => setMinYears(e.target.value)}
                            className="w-[100px] bg-transparent"
                            min="0"
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                            type="number"
                            placeholder="Max yrs"
                            value={maxYears}
                            onChange={(e) => setMaxYears(e.target.value)}
                            className="w-[100px] bg-transparent"
                            min="0"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card animate-fade-in-up opacity-0 delay-200 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : data && data.data.length > 0 ? (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    <TableHead className="font-semibold">Candidate</TableHead>
                                    <TableHead className="font-semibold">Experience</TableHead>
                                    <TableHead className="font-semibold">Skills</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((resume, index) => (
                                    <TableRow
                                        key={resume.id}
                                        className="border-border/30 hover:bg-accent/50 transition-colors animate-fade-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{resume.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {resume.email || 'No email'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{resume.years_of_experience}</span>
                                            <span className="text-muted-foreground"> yrs</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                {resume.skills.slice(0, 3).map((skill) => (
                                                    <Badge
                                                        key={skill}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {skill}
                                                    </Badge>
                                                ))}
                                                {resume.skills.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{resume.skills.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={resume.status}
                                                onValueChange={(value) =>
                                                    handleStatusChange(resume.id, value as ResumeStatus)
                                                }
                                            >
                                                <SelectTrigger className="w-[130px] h-8 bg-transparent">
                                                    <Badge
                                                        variant="outline"
                                                        className={statusColors[resume.status]}
                                                    >
                                                        {resume.status}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="New">New</SelectItem>
                                                    <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/resumes/${resume.id}`}>
                                                    <Eye className="mr-1 h-4 w-4" />
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-border/30 px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(page - 1) * 10 + 1} to{' '}
                                {Math.min(page * 10, data.total)} of {data.total} resumes
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">
                                    {page} / {data.totalPages || 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                    disabled={page >= data.totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No resumes found</p>
                        <p className="text-sm mt-1">Upload some resumes to get started</p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/upload">Upload Resumes</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
