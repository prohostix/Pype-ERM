/**
 * Limits for a user given a page: their own branch, or every branch of their organization when
 * they have none. The organization filter is applied separately and always.
 */
export type BranchId = string | null | undefined;

export const inOwnBranch = <T extends object>(branchId: BranchId, condition: (id: string) => T): T | {} =>
  (branchId ? condition(branchId) : {});
