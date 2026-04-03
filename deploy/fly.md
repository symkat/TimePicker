# Deploying TimePicker on Fly.io

This guide covers deploying TimePicker using **Fly Machines** and **Fly Managed Postgres (MPG)**.

## Prerequisites

- A [Fly.io](https://fly.io) account
- The `flyctl` CLI installed: https://fly.io/docs/flyctl/install/
- Authenticated: `fly auth login`

## 1. Update database.yml for Fly

The default production config uses four separate PostgreSQL databases (primary, cache, queue, cable). For simplicity on Fly, consolidate them into a single database by updating `config/database.yml`:

```yaml
production:
  primary: &primary_production
    <<: *default
    url: <%= ENV["DATABASE_URL"] %>
  cache:
    <<: *primary_production
    migrations_paths: db/cache_migrate
  queue:
    <<: *primary_production
    migrations_paths: db/queue_migrate
  cable:
    <<: *primary_production
    migrations_paths: db/cable_migrate
```

This lets all four database roles share the single Fly MPG database via `DATABASE_URL`, which `fly mpg attach` sets automatically.

## 2. Launch the Fly app

From the project root:

```bash
fly launch --no-deploy
```

This detects the Dockerfile and generates a `fly.toml`. Review and adjust the generated config. Here's a recommended `fly.toml`:

```toml
app = "timepicker"          # choose your app name
primary_region = "iad"      # pick your preferred region

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 80        # Thruster listens on 80
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

> **Note:** The Dockerfile uses Thruster (which wraps Puma and handles HTTP caching/compression), exposing port 80. Fly's proxy terminates TLS and forwards to port 80.

## 3. Create a Managed Postgres cluster

```bash
fly mpg create --name timepicker-db --region iad --plan basic
```

This creates a Basic plan cluster ($38/month, 2 shared vCPUs, 1 GB RAM, 10 GB storage). Adjust `--region` to match your app's `primary_region`.

Available plans: `basic`, `starter`, `launch`, `scale`, `performance`.

## 4. Attach the database to your app

```bash
fly mpg attach <cluster-id> -a timepicker
```

Find your `<cluster-id>` from the output of `fly mpg create` or `fly mpg list`.

This automatically:
- Creates a database user for your app
- Sets the `DATABASE_URL` secret on your app (using the pooled PGBouncer URL)
- Triggers a redeploy (which will fail if you haven't deployed yet -- that's fine)

## 5. Set secrets

```bash
fly secrets set RAILS_MASTER_KEY=$(cat config/master.key) -a timepicker
```

`SECRET_KEY_BASE` is derived from the master key via `credentials.yml.enc`, so you don't need to set it separately. `DATABASE_URL` was already set by `fly mpg attach`.

Verify your secrets:

```bash
fly secrets list -a timepicker
```

You should see `DATABASE_URL` and `RAILS_MASTER_KEY`.

## 6. Deploy

```bash
fly deploy
```

The first deploy will:
1. Build the Docker image (remotely on Fly's builders)
2. Run `db:prepare` via the entrypoint script (creates tables and runs migrations)
3. Start Puma via Thruster on port 80

Monitor the deployment:

```bash
fly logs -a timepicker
```

## 7. Verify

```bash
fly status -a timepicker
fly open -a timepicker       # opens the app in your browser
```

Check the health endpoint:

```bash
curl https://timepicker.fly.dev/up
```

## Post-deploy operations

### Run a Rails console

```bash
fly ssh console -a timepicker -C "/rails/bin/rails console"
```

### Run migrations manually

```bash
fly ssh console -a timepicker -C "/rails/bin/rails db:migrate"
```

### Connect to the database locally

```bash
fly mpg connect             # opens psql directly
# or
fly mpg proxy               # proxies to localhost for GUI tools
```

### View database status

```bash
fly mpg status <cluster-id>
```

### Scale the app

```bash
# Vertical: change VM size
fly scale vm shared-cpu-2x -a timepicker

# Horizontal: add machines
fly scale count 2 -a timepicker
```

### Scale the database

Upgrade the MPG plan via the Fly dashboard or CLI:

```bash
fly mpg update <cluster-id> --plan starter
```

## Custom domain

1. Add a certificate:
   ```bash
   fly certs add yourdomain.com -a timepicker
   ```

2. Point your DNS to the app:
   - `CNAME` record: `yourdomain.com` -> `timepicker.fly.dev`
   - Or use an `A`/`AAAA` record with the IP from `fly ips list`

3. Update `config/environments/production.rb` to set the host:
   ```ruby
   config.action_mailer.default_url_options = { host: "yourdomain.com" }
   ```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` not set | Run `fly mpg attach <cluster-id> -a timepicker` |
| Asset compilation fails | Ensure `SECRET_KEY_BASE_DUMMY=1` is in the Dockerfile (it is by default) |
| `db:prepare` fails | Check logs with `fly logs`; verify DATABASE_URL with `fly ssh console -C "echo \$DATABASE_URL"` |
| App won't start | Check `fly logs -a timepicker` for boot errors; verify `RAILS_MASTER_KEY` is set |
| Connection pool exhaustion | Fly MPG uses PGBouncer by default; ensure `RAILS_MAX_THREADS` aligns with your pool size |

## Cost estimate (minimum viable)

| Resource | Plan | Monthly cost |
|----------|------|-------------|
| Fly Machine | shared-cpu-1x, 512 MB | ~$3-5 |
| Managed Postgres | Basic (1 GB RAM, 10 GB) | ~$41 |
| **Total** | | **~$44-46/month** |
