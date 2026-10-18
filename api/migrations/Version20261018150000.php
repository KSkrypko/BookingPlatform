<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261018150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add nullable booking and service ownership without assigning historical records.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE services ADD provider_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE bookings ADD client_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_services_provider ON services (provider_id)');
        $this->addSql('CREATE INDEX idx_bookings_client ON bookings (client_id)');
        $this->addSql('CREATE INDEX idx_bookings_service ON bookings (service_id)');
        $this->addSql('ALTER TABLE services ADD CONSTRAINT fk_services_provider FOREIGN KEY (provider_id) REFERENCES users (id)');
        $this->addSql('ALTER TABLE bookings ADD CONSTRAINT fk_bookings_client FOREIGN KEY (client_id) REFERENCES users (id)');
        $this->addSql('ALTER TABLE bookings ADD CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services (id) NOT VALID');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Removing ownership would discard access-control data.');
    }
}
