'use client';

import { useMemo, useState } from 'react';
import type {
  AnalyticsResultColumn,
  AnalyticsResultRow,
} from '@/app/lib/analytics/types';

interface DynamicTableProps {
  columns: AnalyticsResultColumn[];
  rows: AnalyticsResultRow[];
  pageSize?: number;
}

type SortDirection = 'asc' | 'desc';

function formatCell(key: string, value: AnalyticsResultRow[string]): string {
  if (value == null) return '--';

  if (typeof value === 'number') {
    if (key.toLowerCase().includes('price') || key.toLowerCase().includes('rent')) {
      return `$${Math.round(value).toLocaleString()}`;
    }
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }

  return String(value);
}

function compareValues(a: AnalyticsResultRow[string], b: AnalyticsResultRow[string]): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  const aStr = String(a);
  const bStr = String(b);

  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return aDate - bDate;
  }

  return aStr.localeCompare(bStr);
}

export default function DynamicTable({ columns, rows, pageSize = 10 }: DynamicTableProps) {
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key ?? '');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;

    const next = [...rows].sort((left, right) => {
      const value = compareValues(left[sortKey], right[sortKey]);
      return sortDirection === 'asc' ? value : -value;
    });

    return next;
  }, [rows, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedRows]);

  const toggleSort = (key: string) => {
    setPage(1);
    setSortKey((prev) => {
      if (prev === key) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('desc');
      return key;
    });
  };

  const hasPagination = sortedRows.length > pageSize;

  return (
    <div className="space-y-2">
      <div className="glass-panel-nested overflow-x-auto rounded-xl max-h-[24rem]">
        <table className="table table-sm table-pin-rows">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th key={column.key} className="sticky top-0 z-[1] bg-base-200/85 backdrop-blur-sm">
                    <button
                      type="button"
                      className={`flex items-center gap-1 hover:text-primary transition-colors ${
                        active ? 'text-primary' : 'text-base-content/80'
                      }`}
                      onClick={() => toggleSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {active && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIdx) => (
              <tr key={`${currentPage}-${rowIdx}`}>
                {columns.map((column) => (
                  <td
                    key={`${currentPage}-${rowIdx}-${column.key}`}
                    className={column.type === 'number' ? 'text-right tabular-nums' : ''}
                  >
                    {formatCell(column.key, row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasPagination && (
        <div className="flex items-center justify-between text-xs text-base-content/70">
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="glass-panel-nested inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-base-content/75 transition-colors hover:text-primary hover:bg-primary/10 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="glass-panel-nested inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-base-content/75 transition-colors hover:text-primary hover:bg-primary/10 disabled:opacity-40"
              disabled={currentPage === pageCount}
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
