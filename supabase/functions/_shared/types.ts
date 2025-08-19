import { z } from 'npm:zod@3.22.0';
import type { TableLink, TableMetadata } from '../../../src/core/types.ts';

export interface SerializedTable {
  name: string;
  data: Record<string, any>[];
  metadata?: TableMetadata;
}

export interface SerializedGraph {
  tables: SerializedTable[];
  links: TableLink[];
}

export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL'
  | 'RATE_LIMITED'
  | 'TIMEOUT';

export interface PQLBuilderSpec {
  predict: string;
  for?: string[];
  where?: string[];
  groupBy?: string[];
  orderBy?: string[];
  limit?: number;
}

export const TableMetadataSchema = z.object({
  primaryKey: z.string().optional(),
  timeColumn: z.string().optional(),
  semanticTypes: z.record(z.enum(['numerical', 'categorical', 'time_column'])),
});

export const TableLinkSchema = z.object({
  srcTable: z.string(),
  fkey: z.string(),
  dstTable: z.string(),
  validated: z.boolean().optional(),
});

export const SerializedTableSchema = z.object({
  name: z.string(),
  data: z.array(z.record(z.any())),
  metadata: TableMetadataSchema.optional(),
});

export const SerializedGraphSchema = z.object({
  tables: z.array(SerializedTableSchema),
  links: z.array(TableLinkSchema),
});

export const PQLBuilderSpecSchema = z.object({
  predict: z.string(),
  for: z.array(z.string()).optional(),
  where: z.array(z.string()).optional(),
  groupBy: z.array(z.string()).optional(),
  orderBy: z.array(z.string()).optional(),
  limit: z.number().positive().optional(),
});
