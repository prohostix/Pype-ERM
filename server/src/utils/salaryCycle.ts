/** The dates a monthly day cycle covers in a given month. */
export interface DayCycle {
  startDay: number;
  endDay: number;
  cycleMode?: string;
}

/** `month` is 1-12. A day the month does not have becomes that month's last day. */
export const salaryCycleDates = (cycle: DayCycle, year: number, month: number): { startDate: Date; endDate: Date } => {
  const startDay = Number(cycle.startDay);
  const endDay = Number(cycle.endDay);
  // Months are counted from 0 here; day 0 of the next month is this month's last day
  const dayIn = (monthIndex: number, day: number) =>
    new Date(year, monthIndex, Math.min(day, new Date(year, monthIndex + 1, 0).getDate()));
  const current = month - 1;

  let startDate: Date;
  let endDate: Date;
  if (cycle.cycleMode === 'previous_to_current' || startDay > endDay) {
    endDate = dayIn(current, endDay);
    // Where one cycle follows on from the last (26–25, 31–30), start the day after it ended
    if (startDay === endDay + 1) {
      startDate = dayIn(current - 1, endDay);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      startDate = dayIn(current - 1, startDay);
    }
  } else {
    startDate = dayIn(current, startDay);
    // 1–30 is what "1st to end of month" used to save; read literally, no cycle would hold the 31st
    endDate = dayIn(current, startDay === 1 && endDay >= 30 ? 31 : endDay);
  }

  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};
