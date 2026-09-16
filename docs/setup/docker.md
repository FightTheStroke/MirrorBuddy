# Docker Deployment

## Development with Docker Compose

```bash
# Start database only
docker-compose up -d postgres

# Start full stack
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Production Build

Run from the repository root. The dependency stage uses the checked-in `.npmrc`,
workspace manifests and frozen lockfile. The builder retains the complete installed
workspace so package-local dependencies remain resolvable.
The build context excludes local dependencies, build output, Git metadata and
environment files; provide runtime credentials through `--env-file`, not image layers.

Configuration-changing pull requests run Docker validation before merge; a failed,
cancelled or unexpectedly skipped Docker job blocks the PR gate.

```bash
# Build image
docker build -t mirrorbuddy:latest .

# Run container
docker run -p 3000:3000 --env-file .env mirrorbuddy:latest
```

## Environment Variables

Ensure `.env` contains all required variables before running:

- `DATABASE_URL` - PostgreSQL connection string
- `AZURE_OPENAI_*` - AI provider credentials
- `GRAFANA_CLOUD_*` - Observability (optional)

## Health Check

Container exposes health endpoint:

```bash
curl http://localhost:3000/api/health
```
