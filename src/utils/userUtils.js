export const extractUsername = nameOrEmail => {
  if (!nameOrEmail) return 'Guest User'; // Fallback if null
  return nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
};

export const getUsername = email => {
  if (!email) return 'User';
  return email.split('@')[0];
};
