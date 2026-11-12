// Opt-in organization features, switched on by Superadmin in the plan configuration.
// Reads the same places the plan dialog writes: planConfig.features, billingConfig.features, then the license.

export const STUDY_ABROAD_FEATURE = 'study_abroad_partners';

/** Features an organization record has been granted. Unlike academic_partners there is no default set. */
export function featuresOfOrg(org: any): string[] {
  const custom = org?.metadata?.planConfig?.features ?? org?.metadata?.billingConfig?.features;
  if (Array.isArray(custom)) return custom;
  const licensed = org?.license?.features;
  return Array.isArray(licensed) ? licensed : [];
}

export const orgHasStudyAbroad = (org: any): boolean => featuresOfOrg(org).includes(STUDY_ABROAD_FEATURE);

export function getOrgFeatures(user: any): string[] {
  return featuresOfOrg(user?.organization);
}

/** True when this user may see Study Abroad Partner screens (Superadmin always can). */
export function hasStudyAbroadAccess(user: any): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return getOrgFeatures(user).includes(STUDY_ABROAD_FEATURE);
}
