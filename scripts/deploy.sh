#!/bin/bash
set -e

COMPOSE_FILES="-f docker-compose.yml"
ENV_MODE="dev"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prod) COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"; ENV_MODE="prod"; shift ;;
        *) break ;;
    esac
done

COMMAND=${1:-help}

function show_help() {
    cat << HELP
Usage: ./scripts/deploy.sh [--prod] COMMAND

Modes:
  --prod    Use production configuration

Commands:
  up        Start all services
  down      Stop all services
  restart   Restart all services
  logs      Show logs (tail -f)
  ps        Show service status
  build     Rebuild all images
  pull      Pull latest images
  health    Check service health
  help      Show this help

Examples:
  ./scripts/deploy.sh up              # Start dev environment
  ./scripts/deploy.sh --prod up       # Start production environment
  ./scripts/deploy.sh logs api-gateway
  ./scripts/deploy.sh --prod health
HELP
}

function cmd_up() {
    echo "Starting services ($ENV_MODE mode)..."
    docker-compose $COMPOSE_FILES up -d
    echo "✅ Services started"
    docker-compose $COMPOSE_FILES ps
}

function cmd_down() {
    echo "Stopping services..."
    docker-compose $COMPOSE_FILES down
    echo "✅ Services stopped"
}

function cmd_restart() {
    echo "Restarting services ($ENV_MODE mode)..."
    docker-compose $COMPOSE_FILES restart
    echo "✅ Services restarted"
}

function cmd_logs() {
    docker-compose $COMPOSE_FILES logs -f --tail=100 "$@"
}

function cmd_ps() {
    docker-compose $COMPOSE_FILES ps
}

function cmd_build() {
    echo "Building images ($ENV_MODE mode)..."
    docker-compose $COMPOSE_FILES build
    echo "✅ Build complete"
}

function cmd_pull() {
    echo "Pulling latest images..."
    docker-compose $COMPOSE_FILES pull
    echo "✅ Pull complete"
}

function cmd_health() {
    echo "Checking service health..."
    docker-compose $COMPOSE_FILES ps --format json | jq -r '.[] | "\(.Name): \(.Health)"'
}

case $COMMAND in
    up) cmd_up ;;
    down) cmd_down ;;
    restart) cmd_restart ;;
    logs) shift; cmd_logs "$@" ;;
    ps) cmd_ps ;;
    build) cmd_build ;;
    pull) cmd_pull ;;
    health) cmd_health ;;
    help) show_help ;;
    *) echo "Unknown command: $COMMAND"; show_help; exit 1 ;;
esac
