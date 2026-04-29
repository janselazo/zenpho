export type LeadFollowUpAppointment = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  description?: string | null;
  /** scheduled | completed | cancelled | rescheduled */
  status?: string | null;
};
