#!/bin/bash
# Wait for SQL Server to be ready, then run the init SQL script.
# This runs inside the db container on first startup.

echo "Waiting for SQL Server to start..."
for i in $(seq 1 30); do
    /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
        -Q "SELECT 1" -C -b > /dev/null 2>&1 && break
    echo "  attempt $i/30 — not ready yet, retrying..."
    sleep 5
done

echo "SQL Server is up. Running init script..."
/opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
    -v DB_APP_PASSWORD="$DB_APP_PASSWORD" \
    -i /mssql-init.sql -C

echo "Database initialisation complete."
