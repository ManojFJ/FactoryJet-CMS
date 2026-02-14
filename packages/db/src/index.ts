export * from "./schema";
export { branches, pullRequests, prChanges, prRiskFlags } from './schema';

// Type exports
export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;

export type PullRequest = typeof pullRequests.$inferSelect;
export type NewPullRequest = typeof pullRequests.$inferInsert;

export type PrChange = typeof prChanges.$inferSelect;
export type NewPrChange = typeof prChanges.$inferInsert;

export type PrRiskFlag = typeof prRiskFlags.$inferSelect;
export type NewPrRiskFlag = typeof prRiskFlags.$inferInsert;
