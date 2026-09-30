import { compare, hash } from "bcryptjs";

export const hashPassword = (password: string) => hash(password, 12);
export const verifyPassword = (password: string, hash: string) => compare(password, hash);
