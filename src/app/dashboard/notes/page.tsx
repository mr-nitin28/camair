'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  StudentService,
  type LearningResourceItem,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Bookmark,
  BookmarkCheck,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  X,
} from 'lucide-react';

export default function StudentResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedFileType, setSelectedFileType] = useState<string>('All');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Bookmarks local state (initialized from seed)
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({
    'res-1': true,
    'res-3': true,
    'res-5': true,
  });

  const {
    data: resources,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-learning-resources'],
    queryFn: () => StudentService.getResources(),
    staleTime: 60 * 1000,
  });

  const toggleBookmark = (id: string) => {
    setLocalBookmarks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDownload = (res: LearningResourceItem) => {
    setDownloadSuccessToast(`Authorized download initiated for "${res.fileName}"`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  const filteredResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter((item) => {
      // Course filter
      if (selectedCourse !== 'All' && item.course !== selectedCourse) {
        return false;
      }
      // Semester filter
      if (selectedSemester !== 'All' && String(item.semester) !== selectedSemester) {
        return false;
      }
      // Subject filter
      if (selectedSubject !== 'All' && item.subjectCode !== selectedSubject && item.subjectId !== selectedSubject) {
        return false;
      }
      // File type filter
      if (selectedFileType !== 'All' && item.fileType !== selectedFileType) {
        return false;
      }
      // Bookmark filter
      const isBookmarked = localBookmarks[item.id] !== undefined ? localBookmarks[item.id] : item.isBookmarked;
      if (bookmarkedOnly && !isBookmarked) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchSubject = item.subjectName.toLowerCase().includes(q) || item.subjectCode.toLowerCase().includes(q);
        const matchFaculty = item.facultyName.toLowerCase().includes(q);
        const matchCourse = item.course.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSubject && !matchFaculty && !matchCourse) return false;
      }
      return true;
    });
  }, [resources, selectedCourse, selectedSemester, selectedSubject, selectedFileType, bookmarkedOnly, searchQuery, localBookmarks]);

  const subjectsList = useMemo(() => {
    if (!resources) return [];
    const map = new Map<string, string>();
    resources.forEach((r) => map.set(r.subjectCode, r.subjectName));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [resources]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-resources-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !resources) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load learning resources"
          message={error instanceof Error ? error.message : 'Failed to retrieve course handouts and notes.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-resources">
      {/* Header */}
      <PageHeader
        title="Learning Resources & Lecture Notes"
        description="Official course handouts, lab manuals, and faculty lecture presentations"
        badge={<StatusBadge label="Semester 6 Vault" variant="info" size="sm" />}
        actions={
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-sm cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Filters</span>
          </button>
        }
      />

      {/* Download Toast Notification */}
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {downloadSuccessToast}
          </span>
          <button
            type="button"
            onClick={() => setDownloadSuccessToast(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Desktop Search & Filters Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic, faculty, course or subject code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Selects */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {/* Course Filter */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="All">All Courses</option>
              <option value="B.Tech CSE">B.Tech CSE</option>
            </select>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="All">All Semesters</option>
              <option value="6">Semester 6</option>
              <option value="5">Semester 5</option>
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="All">All Subjects</option>
              {subjectsList.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            {/* File Type Filter */}
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="All">All Formats</option>
              <option value="PDF">PDF</option>
              <option value="Slide Deck">Slide Deck</option>
              <option value="Workbook">Workbook</option>
              <option value="Lab Manual">Lab Manual</option>
            </select>

            {/* Bookmarked Filter Pill */}
            <button
              type="button"
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                bookmarkedOnly
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Only</span>
            </button>
          </div>
        </div>

        {/* Active Filters count summary */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
          <span>
            Showing <strong className="text-[var(--text)]">{filteredResources.length}</strong> verified resource{filteredResources.length === 1 ? '' : 's'}
          </span>
          {(selectedCourse !== 'All' || selectedSemester !== 'All' || selectedSubject !== 'All' || selectedFileType !== 'All' || bookmarkedOnly || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCourse('All');
                setSelectedSemester('All');
                setSelectedSubject('All');
                setSelectedFileType('All');
                setBookmarkedOnly(false);
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Resources Cards Grid */}
      {filteredResources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No resources found"
          description="Try broadening your search term or resetting the active filters."
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('All');
                setSelectedFileType('All');
                setBookmarkedOnly(false);
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isBookmarked = localBookmarks[res.id] !== undefined ? localBookmarks[res.id] : res.isBookmarked;

            return (
              <div
                key={res.id}
                className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Subject, Version, Updated Badge, Bookmark */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                        {res.subjectCode}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        v{res.version}
                      </span>
                      {res.isUpdated && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Updated
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBookmark(res.id)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark resource'}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-sm font-bold text-[var(--text)] leading-snug line-clamp-2">
                    {res.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed line-clamp-3">
                    {res.description}
                  </p>
                </div>

                {/* Footer Metadata & Download */}
                <div className="mt-4 pt-3 border-t border-[var(--border)]/60 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate max-w-[170px] font-medium">
                      {res.facultyName}
                    </span>
                    <span className="font-mono text-[10px] shrink-0">
                      {(res.fileSizeBytes / 1024 / 1024).toFixed(1)} MB • {res.fileType}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(res)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] text-[var(--text)] border border-[var(--border)] transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Handout</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Filters Bottom Sheet */}
      <Sheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Resources"
        description="Filter by subject curriculum, format, or saved items"
        side="bottom"
      >
        <div className="space-y-4 p-2">
          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1.5">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
            >
              <option value="All">All Courses</option>
              <option value="B.Tech CSE">B.Tech CSE</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
            >
              <option value="All">All Semesters</option>
              <option value="6">Semester 6</option>
              <option value="5">Semester 5</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1.5">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
            >
              <option value="All">All Subjects</option>
              {subjectsList.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1.5">
              Format
            </label>
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
            >
              <option value="All">All Formats</option>
              <option value="PDF">PDF</option>
              <option value="Slide Deck">Slide Deck</option>
              <option value="Workbook">Workbook</option>
              <option value="Lab Manual">Lab Manual</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--text)]">Saved Only</span>
            <input
              type="checkbox"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)]"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(false)}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs"
          >
            Apply Filters
          </button>
        </div>
      </Sheet>
    </div>
  );
}
