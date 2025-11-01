#!/bin/bash
set -e

# Admin MCP Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: development, staging, production

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying Admin MCP to $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$SCRIPT_DIR/.env.$ENVIRONMENT" ]; then
    echo "📝 Loading environment from .env.$ENVIRONMENT"
    export $(cat "$SCRIPT_DIR/.env.$ENVIRONMENT" | grep -v '^#' | xargs)
elif [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📝 Loading environment from .env"
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
else
    echo "❌ No environment file found. Please create .env or .env.$ENVIRONMENT"
    exit 1
fi

# Validate required environment variables
required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "JWKS_URI")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

if [ ! -d "$SCRIPT_DIR/dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful"

# Run database migrations (if applicable)
if [ -f "$SCRIPT_DIR/migrations/run.sh" ]; then
    echo "🗄️  Running database migrations..."
    bash "$SCRIPT_DIR/migrations/run.sh"
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    local port=${PORT:-3000}

    echo "🏥 Running health checks..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ Health check passed"
            return 0
        fi
        echo "⏳ Attempt $attempt/$max_attempts - waiting for server..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Deployment strategy based on environment
case $ENVIRONMENT in
    development)
        echo "🔧 Starting in development mode..."
        npm run dev:http &
        SERVER_PID=$!
        sleep 5
        if health_check; then
            echo "✅ Development server running (PID: $SERVER_PID)"
            echo "📍 Server available at http://localhost:${PORT:-3000}"
        else
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
        ;;

    staging|production)
        echo "🐳 Deploying with Docker..."

        # Build Docker image
        docker build -t admin-mcp:$ENVIRONMENT .

        # Stop existing container
        docker-compose down 2>/dev/null || true

        # Start new container
        docker-compose up -d

        # Wait for container to be healthy
        sleep 10
        if health_check; then
            echo "✅ Deployment successful"
            echo "📍 Server available at http://localhost:${PORT:-3000}"
            docker-compose ps
        else
            echo "❌ Deployment failed"
            docker-compose logs
            exit 1
        fi
        ;;

    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Usage: ./deploy.sh [development|staging|production]"
        exit 1
        ;;
esac

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "  - View logs: docker-compose logs -f (for Docker deployments)"
echo "  - Run tests: npm test"
echo "  - Monitor: curl http://localhost:${PORT:-3000}/health"
