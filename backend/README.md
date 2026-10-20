# Local PostgreSQL development

The backend uses the PostgreSQL service in `docker-compose.yml` for local
development. The database is bound to `127.0.0.1:5433`, leaving the default
PostgreSQL port `5432` available for a separately installed server. Host-run
Django connects to that mapped port; Docker Compose application services connect
to the database container directly.

1. Copy `.env.example` to `.env` if you do not already have a local environment
   file. Set a private `SECRET_KEY` and change the local database password in
   both `DB_PASSWORD` and `POSTGRES_PASSWORD` to the same value.
2. Start PostgreSQL from the `backend` directory:

   ```powershell
   docker compose up -d db
   ```

3. Create the schema and an administrator account:

   ```powershell
   .\venv\Scripts\python.exe manage.py migrate
   .\venv\Scripts\python.exe manage.py createsuperuser
   .\venv\Scripts\python.exe manage.py runserver
   ```

The configured local database is `rjogani`. This setup starts with an empty
database; it does not copy data from Supabase. Existing Docker volumes are
preserved when the Compose database container is recreated.