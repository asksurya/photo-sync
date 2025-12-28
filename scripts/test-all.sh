#!/bin/bash
set -e

echo "Running all tests..."

echo ""
echo "=== Grouping Service ==="
cd services/grouping
python -m pytest --cov=src --cov-report=term-missing
cd ../..

echo ""
echo "=== Deduplication Service ==="
cd services/deduplication
python -m pytest --cov=src --cov-report=term-missing
cd ../..

echo ""
echo "=== API Gateway ==="
cd services/gateway
npm test
cd ../..

echo ""
echo "=== Web UI ==="
cd services/web
npm test
cd ../..

echo ""
echo "✅ All tests passed!"
