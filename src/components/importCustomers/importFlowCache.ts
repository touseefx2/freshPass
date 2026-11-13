import type {
  CustomerImport,
  ImportRow,
  ImportSummary,
} from "@/src/types/businessCustomer";

/**
 * Hand-off between the import step flow and the row fix screen (rows have no
 * GET-one route, so the tapped row travels here instead of in params).
 */
type ImportFlowCache = {
  importId: number | null;
  columns: string[];
  row: ImportRow | null;
  /** Set by the row screen after a PATCH; the flow applies it on focus. */
  updatedSummary: ImportSummary | null;
  rowsChanged: boolean;
};

export const importFlowCache: ImportFlowCache = {
  importId: null,
  columns: [],
  row: null,
  updatedSummary: null,
  rowsChanged: false,
};

export function openImportRow(imp: CustomerImport, row: ImportRow) {
  importFlowCache.importId = imp.id;
  importFlowCache.columns = imp.columns;
  importFlowCache.row = row;
}

export function takeImportRowChanges(): {
  summary: ImportSummary | null;
  changed: boolean;
} {
  const out = {
    summary: importFlowCache.updatedSummary,
    changed: importFlowCache.rowsChanged,
  };
  importFlowCache.updatedSummary = null;
  importFlowCache.rowsChanged = false;
  return out;
}
