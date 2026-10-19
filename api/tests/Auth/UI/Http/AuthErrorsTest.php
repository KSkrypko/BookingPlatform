<?php

declare(strict_types=1);

namespace App\Tests\Auth\UI\Http;

use App\User\Domain\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AuthErrorsTest extends WebTestCase
{
    private KernelBrowser $browser;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->browser = self::createClient();
        $this->browser->disableReboot();
        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);

        if (($this->entityManager->getConnection()->getParams()['memory'] ?? false) !== true) {
            throw new \RuntimeException('Auth tests require an in-memory database.');
        }

        (new SchemaTool($this->entityManager))->createSchema(
            $this->entityManager->getMetadataFactory()->getAllMetadata()
        );
    }

    public function testDuplicateEmailReturnsPolishMessageAndConflictWithoutCreatingAnotherUser(): void
    {
        $user = $this->createUser();

        $this->browser->jsonRequest('POST', '/api/register', [
            'email' => ' CLIENT@EXAMPLE.COM ',
            'password' => 'secret123',
            'accountType' => 'client',
        ]);

        self::assertResponseStatusCodeSame(409);
        self::assertSame([
            'message' => 'Użytkownik z podanym adresem e-mail już istnieje.',
        ], $this->responseData());
        self::assertSame(1, $this->entityManager->getRepository(User::class)->count([]));
        self::assertSame($user->getId(), $this->entityManager->getRepository(User::class)->findOneBy([
            'email' => 'client@example.com',
        ])?->getId());
    }

    #[DataProvider('registrationErrors')]
    public function testRegistrationValidationErrorsArePolish(array $payload, string $message): void
    {
        $this->browser->jsonRequest('POST', '/api/register', $payload);

        self::assertResponseStatusCodeSame(400);
        self::assertSame(['message' => $message], $this->responseData());
        self::assertSame(0, $this->entityManager->getRepository(User::class)->count([]));
    }

    public static function registrationErrors(): iterable
    {
        yield 'missing fields' => [[], 'Uzupełnij poprawnie wszystkie wymagane pola.'];
        yield 'invalid field type' => [
            ['email' => [], 'password' => 'secret123', 'accountType' => 'client'],
            'Uzupełnij poprawnie wszystkie wymagane pola.',
        ];
        foreach (['', '12345', '      '] as $password) {
            yield 'short password: ' . $password => [
                ['email' => 'client@example.com', 'password' => $password, 'accountType' => 'client'],
                'Hasło musi zawierać co najmniej 6 znaków.',
            ];
        }
        yield 'unsupported account type' => [
            ['email' => 'client@example.com', 'password' => 'secret123', 'accountType' => 'admin'],
            'Wybierz prawidłowy typ konta.',
        ];
    }

    #[DataProvider('invalidCredentials')]
    public function testInvalidLoginKeepsResponseStructureAndUsesPolishMessage(string $email, string $password): void
    {
        $this->createUser();

        $this->browser->jsonRequest('POST', '/api/login_check', compact('email', 'password'));

        self::assertResponseStatusCodeSame(401);
        self::assertSame(['code' => 401, 'message' => 'Nieprawidłowe dane.'], $this->responseData());
    }

    public static function invalidCredentials(): iterable
    {
        yield 'wrong password' => ['client@example.com', 'wrong-password'];
        yield 'unknown email' => ['unknown@example.com', 'secret123'];
    }

    public function testMalformedRegistrationPayloadKeepsTechnicalMessage(): void
    {
        $this->browser->request('POST', '/api/register', server: ['CONTENT_TYPE' => 'application/json'], content: '{');

        self::assertResponseStatusCodeSame(400);
        self::assertSame(['message' => 'Invalid JSON payload.'], $this->responseData());
    }

    private function createUser(): User
    {
        $user = new User('client@example.com', '', [User::ROLE_CLIENT]);
        $hasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        $user->setPassword($hasher->hashPassword($user, 'secret123'));
        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }

    private function responseData(): array
    {
        return json_decode($this->browser->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
    }
}
