#!/bin/bash
# ============================================================
# 测试报告浏览器 — 启动临时 HTTP 服务器查看 pytest-html 报告
#
# 用法:
#   bash scripts/view-reports.sh              # 扫描所有 reports/ 目录
#   bash scripts/view-reports.sh -p 19999     # 指定端口（默认 19999）
#   Ctrl+C 停止
# ============================================================

set -e

PORT=19999
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--port) PORT="$2"; shift 2 ;;
        *) echo "用法: $0 [-p PORT]"; exit 1 ;;
    esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR=$(mktemp -d /tmp/big365-reports-XXXXXX)
trap "rm -rf $TMPDIR" EXIT

# ── Generate report index page ───────────────────────────────────────

cat > "$TMPDIR/index.html" << 'HTML'
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>big365 测试报告</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         background:#f5f5f5; color:#333; padding:20px; max-width:900px; margin:0 auto; }
  h1 { font-size:22px; margin-bottom:8px; }
  .sub { color:#888; font-size:13px; margin-bottom:24px; }
  .group { background:#fff; border-radius:8px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  .group h2 { font-size:16px; margin-bottom:10px; color:#1a73e8; }
  .group a { display:block; padding:6px 0; color:#333; text-decoration:none;
             border-bottom:1px solid #f0f0f0; font-family:monospace; font-size:13px; }
  .group a:hover { color:#1a73e8; background:#f8f9ff; }
  .group a:last-child { border-bottom:none; }
  .pass { color:#28a745; margin-left:8px; font-size:12px; }
  .fail { color:#dc3545; margin-left:8px; font-size:12px; }
  .empty { color:#aaa; font-style:italic; padding:6px 0; }
</style>
</head>
<body>
<h1>📊 big365 测试报告</h1>
<p class="sub">点击下方链接查看 pytest-html 报告</p>
HTML

found_any=false
find "$ROOT" -maxdepth 5 -type d -name "reports" 2>/dev/null | sort | while read dir; do
    rel="${dir#$ROOT/}"

    # Count total and passed/failed from the latest report
    latest=$(ls "$dir" 2>/dev/null | grep -E '^202' | sort -r | head -1)
    passed="" ; failed=""
    if [ -n "$latest" ] && [ -f "$dir/$latest/report.html" ]; then
        passed=$(grep -oP '"passed">\K\d+' "$dir/$latest/report.html" 2>/dev/null | head -1)
        failed=$(grep -oP '"failed">\K\d+' "$dir/$latest/report.html" 2>/dev/null | head -1)
    fi

    cat >> "$TMPDIR/index.html" << GROUP
<div class="group">
  <h2>$rel</h2>
GROUP

    ls "$dir" 2>/dev/null | grep -E '^202' | sort -r | while read sub; do
        if [ -f "$dir/$sub/report.html" ]; then
            ts="${sub:0:4}-${sub:4:2}-${sub:6:2} ${sub:9:2}:${sub:11:2}:${sub:13:2}"
            # Symlink each report into tmpdir for clean URLs
            mkdir -p "$TMPDIR/$rel/$sub"
            ln -sf "$dir/$sub/report.html" "$TMPDIR/$rel/$sub/report.html" 2>/dev/null || true
            # Also link assets/
            if [ -d "$dir/$sub/assets" ]; then
                ln -sf "$dir/$sub/assets" "$TMPDIR/$rel/$sub/assets" 2>/dev/null || true
            fi
            if [ -d "$dir/$sub/screenshots" ]; then
                ln -sf "$dir/$sub/screenshots" "$TMPDIR/$rel/$sub/screenshots" 2>/dev/null || true
            fi

            pct=""
            [ -n "$sub" ] && [ "$sub" = "$latest" ] && [ -n "$passed" ] && [ -n "$failed" ] && \
                pct="<span class='pass'>✅ $passed</span><span class='fail'>❌ $failed</span>"
            echo "    <a href=\"/$rel/$sub/report.html\">$sub/report.html<span style='color:#888;margin-left:10px;font-size:11px'>$ts</span>$pct</a>" >> "$TMPDIR/index.html"
        fi
    done

    echo "</div>" >> "$TMPDIR/index.html"
    found_any=true
done

echo "</body></html>" >> "$TMPDIR/index.html"

# ── Print overview ────────────────────────────────────────────────────

LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

echo "========================================"
echo "  测试报告浏览器"
echo "========================================"
echo ""
echo "  🌐 本机:  http://localhost:$PORT"
[ -n "$LAN_IP" ] && echo "  🌐 远程:  http://$LAN_IP:$PORT"
echo ""

find "$ROOT" -maxdepth 5 -type d -name "reports" 2>/dev/null | sort | while read dir; do
    rel="${dir#$ROOT/}"
    count=$(ls "$dir" 2>/dev/null | grep -cE '^202' || echo 0)
    echo "  $rel/  ($count 份报告)"
done

echo ""
echo "  按 Ctrl+C 停止"
echo "========================================"

cd "$TMPDIR"
python3 -m http.server "$PORT" --bind 0.0.0.0 2>/dev/null || \
    python3 -m http.server "$PORT"
