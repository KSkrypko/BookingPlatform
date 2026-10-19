import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAuthErrorMessage } from '../src/lib/authErrors.js';

test('preserves Polish registration and login messages from the API', () => {
  for (const message of [
    'Użytkownik z podanym adresem e-mail już istnieje.',
    'Uzupełnij poprawnie wszystkie wymagane pola.',
    'Hasło musi zawierać co najmniej 6 znaków.',
    'Wybierz prawidłowy typ konta.',
    'Nieprawidłowe dane.',
  ]) {
    assert.equal(getAuthErrorMessage(new Error(message), 'Nie udało się zalogować.'), message);
  }
});

test('replaces technical, network and unknown errors with the operation fallback', () => {
  for (const fallback of ['Nie udało się zalogować.', 'Nie udało się utworzyć konta.']) {
    for (const error of [
      new TypeError('Failed to fetch'),
      new SyntaxError('Unexpected token < in JSON'),
      new Error('Invalid JSON payload.'),
      new Error('The key "password" must be a non-empty string.'),
      new Error('Email must be valid.'),
      new Error('Database connection failed.'),
      new Error('JWT Token not found'),
      new Error(''),
      { message: 'Unexpected error' },
      null,
      undefined,
    ]) {
      assert.equal(getAuthErrorMessage(error, fallback), fallback);
    }
  }
});
