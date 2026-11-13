/** Labels shared by the import flow and the row fix screen. */

const FIELD_LABEL_KEYS: Record<string, string> = {
  first_name: "bcuFieldFirstName",
  last_name: "bcuFieldLastName",
  full_name: "bcuFieldFullName",
  email: "bcuFieldEmail",
  phone: "bcuFieldPhone",
  last_completed_visit_date: "bcuFieldLastVisit",
  previous_customer: "bcuFieldPrevious",
  email_marketing_status: "bcuFieldEmailStatus",
  email_consent_date: "bcuFieldConsentDate",
  email_consent_source: "bcuFieldConsentSource",
};

export function importFieldLabel(
  t: (k: string) => string,
  key: string,
  serverLabel?: string | null,
) {
  if (FIELD_LABEL_KEYS[key]) return t(FIELD_LABEL_KEYS[key]);
  if (serverLabel) return serverLabel;
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function rowActionLabel(t: (k: string) => string, action: string | null) {
  if (action === "create") return t("bcuWillCreate");
  if (action === "update") return t("bcuWillUpdate");
  if (action === "skip") return t("bcuWillSkip");
  return null;
}
