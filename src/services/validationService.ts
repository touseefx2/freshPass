/**
 * Validation service for form inputs
 * Simple and reusable validation functions
 */

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns Object with isValid boolean and error message
 */
export const validateEmail = (email: string): { isValid: boolean; error: string | null } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: "Email is required" };
  }

  // Simple email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: "Please enter a valid email address" };
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
    return { isValid: false, error: "Password is required" };
  }

  // Minimum 8 characters
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" };
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
    return { isValid: false, error: "Please confirm your password" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
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
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Name should only contain letters, numbers, spaces, hyphens, and apostrophes
  // Minimum 2 characters, maximum 50 characters
  const nameRegex = /^[a-zA-Z0-9\s\-']{2,50}$/;

  if (!nameRegex.test(name.trim())) {
    return {
      isValid: false,
      error: `${fieldName} should only contain letters, numbers and be 2-50 characters long`,
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
    return { isValid: false, error: "Description is required" };
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length < minLength) {
    return {
      isValid: false,
      error: `Description must be at least ${minLength} characters long`,
    };
  }

  if (trimmedDescription.length > maxLength) {
    return {
      isValid: false,
      error: `Description must not exceed ${maxLength} characters`,
    };
  }

  return { isValid: true, error: null };
};

