export const APPOINTMENT_REMINDER_PRESETS = [
  { minutes: 5, label: "5 min before" },
  { minutes: 15, label: "15 min before" },
  { minutes: 30, label: "30 min before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "24 hours before" },
] as const;

export type AppointmentReminderTemplate = {
  emailSubject: string;
  emailHtml: string;
  smsBody: string;
};

export type AppointmentReminderPreference = {
  leadMinutesBefore: number[];
  emailEnabled: boolean;
  smsEnabled: boolean;
  appEnabled: boolean;
  overrideEmail: string;
  overridePhone: string;
};
