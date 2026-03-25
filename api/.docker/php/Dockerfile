FROM php:8.4-fpm

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    zip \
    curl \
    tzdata \
    && docker-php-ext-install pdo pdo_pgsql zip

ENV TZ=Europe/Warsaw

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY .docker/php/php-ini-overrides.ini /usr/local/etc/php/conf.d/php-ini-overrides.ini

WORKDIR /var/www/app