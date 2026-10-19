// Only messages intended for users may pass through from authentication responses.
const authMessages = new Set([
  'Użytkownik z podanym adresem e-mail już istnieje.',
  'Uzupełnij poprawnie wszystkie wymagane pola.',
  'Hasło musi zawierać co najmniej 6 znaków.',
  'Wybierz prawidłowy typ konta.',
  'Nieprawidłowe dane.',
]);

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && authMessages.has(error.message) ? error.message : fallback;
}
