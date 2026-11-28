# Database migrations

Production databases created before Flyway are automatically baselined at
version `1` on their first deploy. Flyway then applies `V2` and every later
versioned migration exactly once.

Do not use `spring.jpa.hibernate.ddl-auto=update` in production. Add each
schema or data change as a new `V<next>__description.sql` file and deploy it
with the application. For a completely new environment, first restore the
current VocaPet baseline schema, then run Flyway migrations from version `2`.
