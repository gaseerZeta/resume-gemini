'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Loader2,
    Sparkles,
    Mail,
    Briefcase,
    Star,
    FileText,
    SlidersHorizontal,
    Bookmark,
    BookmarkCheck,
    Trash2,
    ChevronDown,
    MapPin,
    GraduationCap,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { MatchResult, MatchPreferences, SavedMatch } from '@/lib/types';
import { saveMatch, fetchSavedMatches, deleteSavedMatch } from '@/app/actions/matches';
import { toast } from 'sonner';

// ============================================
// Score Ring Component
// ============================================
function ScoreRing({ score }: { score: number }) {
    const circumference = 2 * Math.PI * 18;
    const fillPercent = (score / 100) * circumference;
    const scoreClass = score >= 80 ? 'score-excellent' : score >= 60 ? 'score-good' : score >= 40 ? 'score-average' : 'score-poor';

    return (
        <div className={`relative flex h-14 w-14 items-center justify-center ${scoreClass}`}>
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-10" />
                <circle
                    cx="20" cy="20" r="18" fill="none"
                    stroke="var(--score-color)" strokeWidth="2.5"
                    strokeDasharray={`${fillPercent} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <span className="absolute text-sm font-bold" style={{ color: 'var(--score-color)' }}>
                {score}
            </span>
        </div>
    );
}

// ============================================
// Main Page
// ============================================
export default function MatchPage() {
    const [jobDescription, setJobDescription] = useState('');
    const [results, setResults] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Advanced filters state
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [weightingEnabled, setWeightingEnabled] = useState(false);
    const [location, setLocation] = useState<string>('');
    const [education, setEducation] = useState<string>('');
    const [prioritizeRecent, setPrioritizeRecent] = useState(false);

    // Saved matches state
    const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
    const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    // Load saved matches
    const loadSavedMatches = useCallback(async () => {
        setLoadingSaved(true);
        try {
            const data = await fetchSavedMatches();
            setSavedMatches(data);
        } catch {
            toast.error('Failed to load saved matches');
        } finally {
            setLoadingSaved(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'saved') {
            loadSavedMatches();
        }
    }, [activeTab, loadSavedMatches]);

    // Build preferences
    const buildPreferences = (): MatchPreferences | undefined => {
        if (!weightingEnabled) return undefined;
        const prefs: MatchPreferences = {};
        if (location) prefs.location = location;
        if (education) prefs.minEducation = education;
        if (prioritizeRecent) prefs.prioritizeRecent = true;
        return Object.keys(prefs).length > 0 ? prefs : undefined;
    };

    const handleMatch = async () => {
        if (jobDescription.trim().length < 10) {
            toast.error('Please provide a more detailed job description (at least 10 characters).');
            return;
        }

        setLoading(true);
        setSearched(true);
        setResults([]);

        try {
            const preferences = buildPreferences();
            const response = await fetch('/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDescription, matchCount: 10, preferences }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Matching failed');
            }

            const data = await response.json();
            setResults(data.results || []);

            if (data.results?.length > 0) {
                toast.success(`Found ${data.results.length} matching candidates!`);
            } else {
                toast.info('No matching candidates found. Try a different job description.');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Matching failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMatch = async (match: MatchResult) => {
        setSavingIds((prev) => new Set(prev).add(match.id));
        try {
            const preferences = buildPreferences();
            await saveMatch({
                candidateId: match.id,
                jobDescription: jobDescription.substring(0, 500),
                finalScore: match.match_score || 0,
                reasoning: match.match_reasoning || '',
                metadata: {
                    similarity: match.similarity,
                    preferences: preferences || null,
                    weighted: weightingEnabled,
                },
            });
            toast.success(`${match.full_name} saved to shortlist!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save');
        } finally {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(match.id);
                return next;
            });
        }
    };

    const handleDeleteSaved = async (id: string) => {
        try {
            await deleteSavedMatch(id);
            setSavedMatches((prev) => prev.filter((m) => m.id !== id));
            toast.success('Match removed from shortlist');
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in-up opacity-0">
                <h1 className="text-3xl font-bold tracking-tight">
                    <span className="gradient-text">Job Matching</span>
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Enter a job description to find the best matching candidates using semantic search and AI scoring.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted/30 w-fit animate-fade-in-up opacity-0 delay-75">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'search'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Search className="inline mr-2 h-4 w-4" />
                    Search & Match
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BookmarkCheck className="inline mr-2 h-4 w-4" />
                    Saved Matches
                    {savedMatches.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                            {savedMatches.length}
                        </Badge>
                    )}
                </button>
            </div>

            {/* ============== SEARCH TAB ============== */}
            {activeTab === 'search' && (
                <>
                    {/* Job Description Input */}
                    <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0 delay-100">
                        <div className="space-y-4">
                            <label className="text-sm font-semibold">Job Description</label>
                            <Textarea
                                placeholder="Paste the full job description here... Include requirements, skills needed, experience level, and responsibilities."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                rows={6}
                                className="bg-transparent border-input resize-none text-sm"
                            />

                            {/* Advanced Filters Toggle */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setFiltersOpen(!filtersOpen)}
                                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Advanced Filters
                                    <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {filtersOpen && (
                                    <div className="space-y-4 pt-2 pl-1 border-l-2 border-primary/20 ml-2 animate-fade-in">
                                        {/* Enable Weighting Toggle */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setWeightingEnabled(!weightingEnabled)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${weightingEnabled ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${weightingEnabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                            <span className="text-sm font-medium">
                                                Enable Weighted Scoring
                                            </span>
                                            {weightingEnabled && (
                                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                    Active
                                                </Badge>
                                            )}
                                        </div>

                                        {weightingEnabled && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                                                {/* Location */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> Location
                                                    </label>
                                                    <Select value={location} onValueChange={setLocation}>
                                                        <SelectTrigger className="bg-transparent text-sm">
                                                            <SelectValue placeholder="Any location" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="any">Any Location</SelectItem>
                                                            <SelectItem value="Remote">Remote</SelectItem>
                                                            <SelectItem value="On-site">On-site</SelectItem>
                                                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                            <SelectItem value="NYC">NYC</SelectItem>
                                                            <SelectItem value="SF Bay Area">SF Bay Area</SelectItem>
                                                            <SelectItem value="London">London</SelectItem>
                                                            <SelectItem value="Bangalore">Bangalore</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Education */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                        <GraduationCap className="h-3 w-3" /> Min Education
                                                    </label>
                                                    <Select value={education} onValueChange={setEducation}>
                                                        <SelectTrigger className="bg-transparent text-sm">
                                                            <SelectValue placeholder="Any level" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="any">Any Level</SelectItem>
                                                            <SelectItem value="Bachelors">Bachelors</SelectItem>
                                                            <SelectItem value="Masters">Masters</SelectItem>
                                                            <SelectItem value="PhD">PhD</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Recency */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Recency
                                                    </label>
                                                    <button
                                                        onClick={() => setPrioritizeRecent(!prioritizeRecent)}
                                                        className={`w-full flex items-center justify-center gap-2 h-9 rounded-md border text-sm transition-colors ${prioritizeRecent
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-input text-muted-foreground hover:text-foreground'
                                                            }`}
                                                    >
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {prioritizeRecent ? 'Prioritized' : 'Prioritize Recent'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {jobDescription.length} characters
                                    {weightingEnabled && (
                                        <span className="ml-2 text-primary">• Weighted scoring active</span>
                                    )}
                                </p>
                                <Button
                                    size="lg"
                                    onClick={handleMatch}
                                    disabled={loading || jobDescription.trim().length < 10}
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-5 w-5" />
                                            Find Matches
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="glass-card rounded-2xl p-8 animate-fade-in">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    <span className="text-sm font-medium">
                                        Analyzing job description and matching candidates
                                        {weightingEnabled ? ' (with advanced weighting)' : ''}...
                                    </span>
                                </div>
                                <Progress value={65} className="h-1.5" />
                                <p className="text-xs text-muted-foreground">
                                    Generating embedding → Cosine similarity → AI re-ranking
                                    {weightingEnabled ? ' → Constraint enforcement' : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {!loading && searched && results.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">
                                <span className="gradient-text">{results.length} Matches Found</span>
                            </h2>

                            {results.map((match, index) => (
                                <div
                                    key={match.id}
                                    className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex items-start gap-6">
                                        <ScoreRing score={match.match_score || 0} />
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold">{match.full_name}</h3>
                                                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                                                        {match.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                {match.email}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Briefcase className="h-3.5 w-3.5" />
                                                            {match.years_of_experience} yrs
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        <Star className="mr-1 h-3 w-3" />
                                                        {Math.round((match.similarity || 0) * 100)}% semantic
                                                    </Badge>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSaveMatch(match)}
                                                        disabled={savingIds.has(match.id)}
                                                        className="text-xs"
                                                    >
                                                        {savingIds.has(match.id) ? (
                                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Bookmark className="mr-1 h-3 w-3" />
                                                        )}
                                                        Save
                                                    </Button>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={`/resumes/${match.id}`}>
                                                            <FileText className="mr-1 h-4 w-4" />
                                                            View
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>

                                            {match.match_reasoning && (
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {match.match_reasoning}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-1.5">
                                                {match.skills?.slice(0, 8).map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                                {(match.skills?.length || 0) > 8 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{match.skills!.length - 8}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="pt-1">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Match Score</span>
                                                    <span className="font-medium">{match.match_score || 0}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${match.match_score || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {!loading && searched && results.length === 0 && (
                        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
                            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium">No matching candidates found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Try broadening your job description or upload more resumes.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ============== SAVED MATCHES TAB ============== */}
            {activeTab === 'saved' && (
                <div className="space-y-4 animate-fade-in-up opacity-0 delay-100">
                    <h2 className="text-lg font-semibold">
                        <span className="gradient-text">Saved Matches</span>
                    </h2>

                    {loadingSaved ? (
                        <div className="glass-card rounded-2xl p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        </div>
                    ) : savedMatches.length > 0 ? (
                        savedMatches.map((saved, index) => (
                            <div
                                key={saved.id}
                                className="glass-card rounded-2xl p-5 animate-fade-in-up opacity-0"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="flex items-start gap-5">
                                    <ScoreRing score={saved.final_score} />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold">{saved.full_name || 'Unknown'}</h3>
                                                {saved.email && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Mail className="h-3 w-3" /> {saved.email}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!!saved.metadata?.weighted && (
                                                    <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                                                        <SlidersHorizontal className="mr-1 h-3 w-3" />
                                                        Weighted
                                                    </Badge>
                                                )}
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={`/resumes/${saved.candidate_id}`}>
                                                        <FileText className="mr-1 h-4 w-4" />
                                                        View
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteSaved(saved.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {saved.reasoning && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {saved.reasoning}
                                            </p>
                                        )}

                                        {saved.skills && saved.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {saved.skills.slice(0, 6).map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                                {saved.skills.length > 6 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{saved.skills.length - 6}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-xs text-muted-foreground">
                                            Saved {new Date(saved.created_at).toLocaleDateString()} •
                                            JD: &quot;{saved.job_description.substring(0, 80)}...&quot;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="glass-card rounded-2xl p-12 text-center">
                            <BookmarkCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium">No saved matches yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Run a job match search and save candidates to your shortlist.
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => setActiveTab('search')}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                Go to Search
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
