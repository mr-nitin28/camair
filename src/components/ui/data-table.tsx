'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal 
} from 'lucide-react';
import { Input } from './input';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchableKey?: keyof T | ((row: T) => string);
  initialSortKey?: keyof T | string;
  initialSortDirection?: 'asc' | 'desc';
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  density?: 'comfortable' | 'compact';
  allowDensityToggle?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchPlaceholder = 'Filter records...',
  searchableKey,
  initialSortKey,
  initialSortDirection = 'asc',
  pageSizeOptions = [5, 10, 25, 50],
  defaultPageSize = 10,
  density: initialDensity = 'comfortable',
  allowDensityToggle = true,
  className = '',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | string | undefined>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(initialDensity);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (typeof searchableKey === 'function') {
        return searchableKey(row).toLowerCase().includes(term);
      }
      if (searchableKey && row[searchableKey] != null) {
        return String(row[searchableKey]).toLowerCase().includes(term);
      }
      // Otherwise match against all values in row
      return Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, searchableKey]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey as string];
      const valB = (b as Record<string, unknown>)[sortKey as string];

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
    return sorted;
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, validPage, pageSize]);

  const handleSort = (key: keyof T | string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(undefined);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const densityPadding = density === 'compact' ? 'px-3 py-2 text-xs' : 'px-4 py-3.5 text-xs';

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {allowDensityToggle && (
            <button
              type="button"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              title="Toggle comfortable / compact density"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="capitalize">{density}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-bold">
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full border border-[var(--border)] rounded-2xl bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {columns.map((col, idx) => {
                  const isCurrentSort = sortKey === col.key;
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  return (
                    <th
                      key={idx}
                      scope="col"
                      className={`text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] select-none ${densityPadding} ${alignClass} ${col.className || ''}`}
                      aria-sort={
                        col.sortable
                          ? isCurrentSort
                            ? sortDir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors group cursor-pointer"
                        >
                          <span>{col.header}</span>
                          <span className="shrink-0 text-slate-400 group-hover:text-[var(--text)]">
                            {isCurrentSort ? (
                              sortDir === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            )}
                          </span>
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-[var(--surface-2)]/60 transition-colors"
                  >
                    {columns.map((col, cIdx) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';

                      return (
                        <td
                          key={cIdx}
                          className={`text-[var(--text)] font-medium ${densityPadding} ${alignClass} ${col.className || ''}`}
                        >
                          {col.render
                            ? col.render(row, rIdx)
                            : String(row[col.key as string] ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      title="No matching records found"
                      description="Try adjusting your filter keyword or sort settings."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          <div className="tabular-nums font-semibold">
            Showing{' '}
            <span className="font-bold text-[var(--text)]">
              {totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[var(--text)]">
              {Math.min(validPage * pageSize, totalItems)}
            </span>{' '}
            of{' '}
            <span className="font-bold text-[var(--text)]">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums font-bold text-[var(--text)]">
              Page {validPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
