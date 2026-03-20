#!/bin/bash
set -e

echo "==> Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-17 libpq-dev

echo "==> Installing Rails..."
gem install rails --no-document

echo "==> Setting up Postgres wrapper script..."
mkdir -p ~/scripts
cat > ~/scripts/start-postgres.sh << 'SCRIPT'
#!/bin/bash
# Ensure runtime directory exists (tmpfs /run is wiped on reboot)
mkdir -p /run/postgresql
chown postgres:postgres /run/postgresql
chmod 775 /run/postgresql

# Start Postgres in the foreground via pg_ctlcluster
exec pg_ctlcluster 17 main start --foreground
SCRIPT
chmod +x ~/scripts/start-postgres.sh

echo "==> Registering Postgres as a Sprite service..."
sprite-env services create postgres \
  --cmd sudo \
  --args ~/scripts/start-postgres.sh \
  --no-stream

# Wait for Postgres to be ready
echo "==> Waiting for Postgres to start..."
for i in $(seq 1 30); do
  if pg_isready -q 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! pg_isready -q 2>/dev/null; then
  echo "ERROR: Postgres did not start in time."
  exit 1
fi

echo "==> Creating database user..."
sudo -u postgres createuser -s "$(whoami)" 2>/dev/null || true

echo "==> Installing Ruby gems..."
bundle install

echo "==> Creating databases and running migrations..."
bin/rails db:create db:migrate

echo "==> Building Tailwind CSS..."
bin/rails tailwindcss:build

echo "==> Registering Rails as a Sprite service..."
sprite-env services create rails \
  --cmd "$(pwd)/bin/rails" \
  --args "server,-b,0.0.0.0,-p,3000" \
  --dir "$(pwd)" \
  --needs postgres \
  --http-port 3000 \
  --env RAILS_ENV=development \
  --no-stream

echo ""
echo "==> TimePicker is installed and running!"
echo "    The app is accessible through the Sprite proxy URL."
echo ""
echo "    Useful commands:"
echo "      sprite-env services list        # Check service status"
echo "      sprite-env services stop rails   # Stop the server"
echo "      sprite-env services start rails  # Start the server"
