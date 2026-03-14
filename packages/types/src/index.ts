/**
 * Shared types for botttle monorepo.
 * Extend as domains are added (auth, clients, projects, etc.).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type ID = string;
