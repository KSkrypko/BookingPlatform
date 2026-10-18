<?php

declare(strict_types=1);

namespace App\Tests\Migrations;

use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Tools\DsnParser;
use Doctrine\Migrations\Configuration\Connection\ExistingConnection;
use Doctrine\Migrations\Configuration\Migration\ConfigurationArray;
use Doctrine\Migrations\DependencyFactory;
use Doctrine\Migrations\MigratorConfiguration;
use Doctrine\Migrations\Version\Version;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group('migration')]
final class BookingOwnershipMigrationTest extends TestCase
{
    public function testPreservesHistoricalDataAndEnforcesNewServiceReferences(): void
    {
        $databaseUrl = $_SERVER['MIGRATION_DATABASE_URL'] ?? $_ENV['MIGRATION_DATABASE_URL'] ?? getenv('MIGRATION_DATABASE_URL');

        if ($databaseUrl === false || $databaseUrl === '') {
            self::markTestSkipped('Set MIGRATION_DATABASE_URL to a temporary PostgreSQL database.');
        }

        $parameters = (new DsnParser(['postgresql' => 'pdo_pgsql']))->parse($databaseUrl);
        $connection = DriverManager::getConnection($parameters);
        self::assertInstanceOf(PostgreSQLPlatform::class, $connection->getDatabasePlatform());
        self::assertSame('booking_platform_migration_test', $connection->getDatabase());

        $schemaName = 'booking_migration_' . bin2hex(random_bytes(8));
        $connection->executeStatement('CREATE SCHEMA ' . $schemaName);

        try {
            $connection->executeStatement('SET search_path TO ' . $schemaName);
            $migrations = DependencyFactory::fromConnection(
                new ConfigurationArray([
                    'migrations_paths' => ['DoctrineMigrations' => dirname(__DIR__, 2) . '/migrations'],
                ]),
                new ExistingConnection($connection)
            );
            $migrations->getMetadataStorage()->ensureInitialized();
            $plan = $migrations->getMigrationPlanCalculator()->getPlanUntilVersion(
                new Version('DoctrineMigrations\\Version20260407135336')
            );
            $migrations->getMigrator()->migrate($plan, new MigratorConfiguration());

            foreach ([
                [100, 'client@example.com', 'ROLE_CLIENT'],
                [101, 'other-client@example.com', 'ROLE_CLIENT'],
                [200, 'provider@example.com', 'ROLE_PROVIDER'],
                [201, 'other-provider@example.com', 'ROLE_PROVIDER'],
            ] as [$userId, $email, $role]) {
                $connection->insert('users', [
                    'id' => $userId,
                    'email' => $email,
                    'roles' => json_encode([$role], JSON_THROW_ON_ERROR),
                    'password' => 'historical-password-hash',
                    'created_at' => '2026-01-01 08:00:00',
                ]);
            }

            foreach ([10 => true, 20 => false] as $serviceId => $isActive) {
                $connection->insert('services', [
                    'id' => $serviceId,
                    'name' => 'Historical service ' . $serviceId,
                    'description' => 'Original description',
                    'price' => '125.50',
                    'duration_minutes' => 60,
                    'created_at' => '2026-01-01 09:00:00',
                    'is_active' => $isActive ? 'true' : 'false',
                ]);
            }

            foreach ([10, 20, 999999] as $index => $serviceId) {
                $connection->insert('bookings', [
                    'id' => $index + 1,
                    'service_id' => $serviceId,
                    'customer_name' => 'Historical customer ' . $index,
                    'customer_email' => 'client@example.com',
                    'booking_date' => '2026-01-05 10:00:00',
                    'created_at' => '2026-01-01 10:00:00',
                ]);
            }

            $usersBefore = $connection->fetchAllAssociative('SELECT * FROM users ORDER BY id');
            $servicesBefore = $connection->fetchAllAssociative('SELECT * FROM services ORDER BY id');
            $bookingsBefore = $connection->fetchAllAssociative('SELECT * FROM bookings ORDER BY id');

            $plan = $migrations->getMigrationPlanCalculator()->getPlanUntilVersion(
                new Version('DoctrineMigrations\\Version20261018150000')
            );
            $migrations->getMigrator()->migrate($plan, new MigratorConfiguration());

            self::assertSame($usersBefore, $connection->fetchAllAssociative('SELECT * FROM users ORDER BY id'));
            self::assertSame($servicesBefore, $connection->fetchAllAssociative(
                'SELECT id, name, description, price, duration_minutes, created_at, is_active FROM services ORDER BY id'
            ));
            self::assertSame($bookingsBefore, $connection->fetchAllAssociative(
                'SELECT id, service_id, customer_name, customer_email, booking_date, created_at FROM bookings ORDER BY id'
            ));
            self::assertSame([null, null], $connection->fetchFirstColumn('SELECT provider_id FROM services ORDER BY id'));
            self::assertSame([null, null, null], $connection->fetchFirstColumn('SELECT client_id FROM bookings ORDER BY id'));

            $this->expectException(ForeignKeyConstraintViolationException::class);

            $connection->insert('bookings', [
                'id' => 4,
                'service_id' => 888888,
                'client_id' => 100,
                'customer_name' => 'New customer',
                'customer_email' => 'client@example.com',
                'booking_date' => '2030-01-07 10:00:00',
                'created_at' => '2030-01-01 10:00:00',
            ]);
        } finally {
            $connection->executeStatement('DROP SCHEMA ' . $schemaName . ' CASCADE');
            $connection->close();
        }
    }
}
