export type AccountType = 'client' | 'provider';

export type AuthUser = {
  id: number;
  email: string;
  roles: string[];
  accountType: AccountType;
};