/** What someone given the Employees page sees of a profile. */
const PAY_FIELDS = ['ctc', 'basicSalary', 'bankName', 'bankAccountNo', 'ifscCode', 'panNumber'];

/** Pay, bank and tax details are for people who may view Salary Config. */
export const withoutPayDetails = <T extends Record<string, any> | null>(profile: T): T =>
  (profile ? Object.fromEntries(Object.entries(profile).filter(([key]) => !PAY_FIELDS.includes(key))) : profile) as T;
