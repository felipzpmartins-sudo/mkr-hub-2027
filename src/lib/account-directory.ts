/** The account directory contains personal access data and is private to its owner. */
const ACCOUNT_DIRECTORY_OWNER = "lf473418@gmail.com";

export function canViewAccountDirectory(email: string) {
  return email.trim().toLowerCase() === ACCOUNT_DIRECTORY_OWNER;
}
