// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 number, 1 special character
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
};

// Check if password has a number
export const hasNumber = (password: string): boolean => {
  return /[0-9]/.test(password);
};

// Check if password has a special character
export const hasSpecialChar = (password: string): boolean => {
  return /[!@#$%^&*]/.test(password);
};

// Check if password has minimum length
export const hasMinLength = (password: string, minLength: number = 8): boolean => {
  return password.length >= minLength;
};

// Name validation
export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

// Phone validation
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};
