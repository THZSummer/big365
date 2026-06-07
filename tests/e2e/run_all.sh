#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
API_URL="${API_URL:-http://localhost:8080}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

echo "=========================================="
echo "  big365 End-to-End Validation"
echo "=========================================="
echo "API URL: $API_URL"
echo "Web URL: $WEB_URL"
echo ""

# Step 1: Health Check
echo "[1/6] Health Check..."
curl -s "${API_URL}/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']==True; print('  ✅ Backend healthy')"

# Step 2: Register Business
echo "[2/6] Register log_monitor business..."
curl -s -X POST "${API_URL}/api/biz/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "bizName": "log_monitor",
    "bizLabel": "日志监控",
    "dimensions": [
      {"columnName": "a", "displayName": "app", "leafMin": 1, "leafMax": 10},
      {"columnName": "b", "displayName": "endpoint", "leafMin": 1, "leafMax": 100}
    ],
    "dateRange": {"from": "20260101", "to": "20260103"}
  }' | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d['code']=='BIZ_ALREADY_EXISTS':
    print('  ⚠️  Business already exists, skipping')
else:
    assert d['success']==True
    print(f'  ✅ Tables created: {d[\"data\"][\"tablesCreated\"]}')
"

# Step 3: Write Data
echo "[3/6] Write sample data..."
curl -s -X POST "${API_URL}/api/log_monitor/space/write" \
  -H 'Content-Type: application/json' \
  -d '{"coordinates": {"a": 3, "b": 7}, "date": "20260101", "value": 100}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']==True; print(f'  ✅ Rows affected: {d[\"data\"][\"rowsAffected\"]}')"

# Step 4: Query Data
echo "[4/6] Query data..."
curl -s "${API_URL}/api/log_monitor/space/query?a=0&b=0&date=20260101" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']==True; print(f'  ✅ Grand Total: {d[\"data\"][\"value\"]}')"

# Step 5: List Dimensions
echo "[5/6] List dimensions..."
curl -s "${API_URL}/api/log_monitor/dimensions" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']==True; print(f'  ✅ Dimensions: {len(d[\"data\"][\"items\"])}')"

# Step 6: Frontend Check
echo "[6/6] Check frontend..."
if curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}" | grep -q 200; then
  echo "  ✅ Frontend accessible"
else
  echo "  ⚠️  Frontend not reachable (may need manual check)"
fi

echo ""
echo "=========================================="
echo "  ✅ E2E Validation Complete!"
echo "=========================================="
