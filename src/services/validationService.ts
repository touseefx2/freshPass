/**
 * Validation service for form inputs
 * Simple and reusable validation functions
 */

import i18n from "i18next";

/**
 * Callers pass an English field name (or its translated label). Known names get
 * full-sentence keys; anything else falls back to a generic `{{field}}` message.
 */
const NAME_FIELD_KEYS: {
  english: string;
  labelKey: string;
  required: string;
  invalid: string;
}[] = [
  {
    english: "Full name",
    labelKey: "fullName",
    required: "valFullNameRequired",
    invalid: "valFullNameInvalid",
  },
  {
    english: "Business name",
    labelKey: "businessName",
    required: "valBusinessNameRequired",
    invalid: "valBusinessNameInvalid",
  },
  {
    english: "Name",
    labelKey: "feedbackName",
    required: "valNameRequired",
    invalid: "valNameInvalid",
  },
  {
    english: "Your full name",
    labelKey: "yourFullName",
    required: "valYourFullNameRequired",
    invalid: "valYourFullNameInvalid",
  },
];

const nameFieldError = (fieldName: string, kind: "required" | "invalid"): string => {
  const known = NAME_FIELD_KEYS.find(
    (f) => f.english === fieldName || i18n.t(f.labelKey) === fieldName,
  );
  if (known) return i18n.t(known[kind]);
  return i18n.t(kind === "required" ? "valFieldRequired" : "valFieldInvalid", {
    field: fieldName,
  });
};

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns Object with isValid boolean and error message
 */
export const validateEmail = (email: string): { isValid: boolean; error: string | null } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: i18n.t("valEmailRequired") };
  }

  // Same pattern as the server/web: one @, a dot after it, no empty parts
  const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: i18n.t("valEmailInvalid") };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password requirements
 * @param password - Password string to validate
 * @returns Object with isValid boolean and error message
 */
export const validatePassword = (password: string): { isValid: boolean; error: string | null } => {
  if (!password || password.length === 0) {
    return { isValid: false, error: i18n.t("valPasswordRequired") };
  }

  // Minimum 8 characters
  if (password.length < 8) {
    return { isValid: false, error: i18n.t("valPasswordMinLength") };
  }

  return { isValid: true, error: null };
};

/**
 * Validates if two passwords match
 * @param password - First password
 * @param confirmPassword - Second password to match
 * @returns Object with isValid boolean and error message
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): { isValid: boolean; error: string | null } => {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { isValid: false, error: i18n.t("valConfirmPassword") };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: i18n.t("valPasswordsDoNotMatch") };
  }

  return { isValid: true, error: null };
};

/**
 * Validates name (first name or last name)
 * @param name - Name string to validate
 * @param fieldName - Field name for error message (e.g., "First name", "Last name")
 * @returns Object with isValid boolean and error message
 */
export const validateName = (
  name: string,
  fieldName: string = "Name"
): { isValid: boolean; error: string | null } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: nameFieldError(fieldName, "required") };
  }

  // Name should only contain letters, numbers, spaces, hyphens, and apostrophes
  // Minimum 2 characters, maximum 50 characters
  const nameRegex = /^[a-zA-Z0-9\s\-']{2,50}$/;

  if (!nameRegex.test(name.trim())) {
    return {
      isValid: false,
      error: nameFieldError(fieldName, "invalid"),
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates description text
 * @param description - Description string to validate
 * @param minLength - Minimum length (default: 10)
 * @param maxLength - Maximum length (default: 1000)
 * @returns Object with isValid boolean and error message
 */
export const validateDescription = (
  description: string,
  minLength: number = 10,
  maxLength: number = 1000
): { isValid: boolean; error: string | null } => {
  if (!description || description.trim().length === 0) {
    return { isValid: false, error: i18n.t("valDescriptionRequired") };
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length < minLength) {
    return {
      isValid: false,
      error: i18n.t("valDescriptionMinLength", { min: minLength }),
    };
  }

  if (trimmedDescription.length > maxLength) {
    return {
      isValid: false,
      error: i18n.t("valDescriptionMaxLength", { max: maxLength }),
    };
  }

  return { isValid: true, error: null };
};

