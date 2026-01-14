#!/bin/bash
# Fix port conflict for production deployment

echo "🔍 Checking for port conflicts..."

# Check if Redis port 6379 is in use
if lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 6379 is already in use!"
    echo ""
    echo "Processes using port 6379:"
    lsof -i :6379
    echo ""
    echo "Options:"
    echo "1. Stop old ETC containers: docker-compose -f docker-compose.prod.yml down"
    echo "2. Kill local Redis: sudo systemctl stop redis (or brew services stop redis)"
    echo "3. Kill specific process: kill -9 <PID>"
    exit 1
else
    echo "✅ Port 6379 is available"
fi

# Check other critical ports
for port in 80 443 5432 9000 9001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $port is in use"
        lsof -i :$port | head -5
    else
        echo "✅ Port $port is available"
    fi
done

echo ""
echo "🎉 All ports are available for deployment!"
