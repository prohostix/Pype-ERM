import { StudyAbroadPartnersPanel } from './StudyAbroadPartnersPanel';

/**
 * The single "Study Abroad Partners" menu entry: the partner list and their logins.
 * Study Abroad applications are not reviewed here. They are normal enrollments (tagged "Study Abroad"),
 * so Operations reviews them in Enrollment Review and Finance in Enrollments, like Academic Partner ones.
 */
export function StudyAbroadPartnersPage() {
  return <StudyAbroadPartnersPanel />;
}
