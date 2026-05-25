/**
 * Barrel for constitutional rule modules.
 *
 * Each rule group lives in its own focused module so the system can eventually
 * support "one file per rule" (or per group) without a big refactor.
 *
 * Currently exported:
 * - avoid-god-files: god-file, god-function, mixed-concerns, single-file bloat, srp-concentration
 * - small-focused-changes: volume-too-large, too-many-files
 * - high-risk-accretion: high-risk-accretion
 */
export * from './avoid-god-files.js';
export * from './small-focused-changes.js';
export * from './high-risk-accretion.js';
