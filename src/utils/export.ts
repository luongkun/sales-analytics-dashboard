import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';

export interface ExportOptions {
  filename?: string;
  delimiter?: string;
  encoding?: string;
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export.csv',
    delimiter = ',',
    encoding = 'utf-8',
  } = options;

  const csv = Papa.unparse(data, {
    delimiter,
    header: true,
  });

  const blob = new Blob([`\uFEFF${csv}`], { type: `text/csv;charset=${encoding}` });
  saveAs(blob, filename);
}

export function exportToJSON<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export.json',
    encoding = 'utf-8',
  } = options;

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: `application/json;charset=${encoding}` });
  saveAs(blob, filename);
}

export function formatDataForExport<T>(
  data: T[],
  columns: Array<{ key: keyof T; label: string; format?: (value: T[keyof T]) => string }>
): Array<Record<string, string>> {
  return data.map((row) =>
    columns.reduce((acc, col) => {
      const value = row[col.key];
      acc[col.label] = col.format ? col.format(value) : String(value ?? '');
      return acc;
    }, {} as Record<string, string>)
  );
}