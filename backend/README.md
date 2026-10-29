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

# Real-time order updates

Order changes are broadcast over WebSockets through Redis. Start Redis with the
database for local development:

```powershell
docker compose up -d db redis
```

Host-run Django uses `CHANNEL_REDIS_URL=redis://localhost:6379/1` by default;
Compose sets `CHANNEL_REDIS_URL=redis://redis:6379/1` for the web service. The
frontend connects to `/ws/orders/` after exchanging its JWT for a 60-second
ticket at `/api/ws/ticket/`.

Set `WS_ALLOWED_ORIGINS` to a comma-separated list of browser origins allowed to
open the socket (it defaults to `CORS_ALLOWED_ORIGINS`). When deploying behind
Nginx, Caddy, or another proxy, enable WebSocket upgrade headers and allow long
idle connections. The container runs Uvicorn (`config.asgi:application`) rather
than WSGI/Gunicorn so it can serve both HTTP and WebSockets.
