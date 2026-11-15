export const EMAIL = "john7000.nguyen@gmail.com";
const SUBJECT = "Hello JIDO";

/** Opens a new email in Gmail (in the browser), never the computer's default mail app (e.g. Outlook). */
export const GMAIL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(SUBJECT)}`;
