'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Search,
  Users,
  Star,
  XCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { ResumeStats } from '@/lib/types';

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  gradient: string;
  delay: string;
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 animate-fade-in-up opacity-0 ${delay}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight animate-count-up">
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ResumeStats>({
    total: 0,
    new_count: 0,
    shortlisted_count: 0,
    rejected_count: 0,
    avg_experience: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { getResumeStats } = await import('@/app/actions/resumes');
        const data = await getResumeStats();
        setStats(data);
      } catch {
        // Use zero stats on error
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    {
      icon: Users,
      label: 'Total Resumes',
      value: stats.total,
      gradient: 'from-cyan-500 to-blue-500',
      delay: 'delay-100',
    },
    {
      icon: FileText,
      label: 'New',
      value: stats.new_count,
      gradient: 'from-sky-400 to-cyan-500',
      delay: 'delay-200',
    },
    {
      icon: Star,
      label: 'Shortlisted',
      value: stats.shortlisted_count,
      gradient: 'from-teal-400 to-emerald-500',
      delay: 'delay-300',
    },
    {
      icon: XCircle,
      label: 'Rejected',
      value: stats.rejected_count,
      gradient: 'from-slate-500 to-slate-700',
      delay: 'delay-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="gradient-text">Zenita</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          AI-powered tracking system with semantic search and smart matching.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass-card animate-shimmer rounded-2xl p-6 h-[120px]"
            />
          ))
          : statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
      </div>

      {/* Average Experience */}
      {!loading && stats.avg_experience > 0 && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0 delay-500">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Average Experience:
            </span>
            <span className="text-lg font-bold">{stats.avg_experience} years</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 animate-fade-in-up opacity-0 delay-500">
        <Link href="/upload" className="group">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-110">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Upload Resumes</h3>
                <p className="text-sm text-muted-foreground">
                  Batch upload up to 10 PDFs
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link href="/resumes" className="group">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-lg shadow-sky-500/20 transition-transform group-hover:scale-110">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Browse Resumes</h3>
                <p className="text-sm text-muted-foreground">
                  Search, filter &amp; manage
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link href="/match" className="group">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/20 transition-transform group-hover:scale-110">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Job Matching</h3>
                <p className="text-sm text-muted-foreground">
                  Semantic search candidates
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
