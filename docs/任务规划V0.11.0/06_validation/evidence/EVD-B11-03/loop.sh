#!/bin/bash
# B11-03a 运行态闭环：POST→GET→PATCH→DELETE→GET(不存在) + 异常路径；输出 status + body
BASE=http://localhost:3457/api/v1/admin
MID=$(cat /workspace/work/matrix-ev/mid.txt)
step(){ # name method url [body] [cookiejar]
  local cj=${5:-/workspace/work/matrix-ev/cj.txt}
  local out; out=$(curl -s -b "$cj" --max-time 100 -o /tmp/mx-body -w "%{http_code}" -X "$2" "$3" -H 'content-type: application/json' ${4:+-d "$4"})
  echo "[$1] $2 ${3#http://localhost:3457} -> HTTP $out"; head -c 600 /tmp/mx-body; echo
}
RES=$1
if [ "$RES" = protocols ]; then
  step create POST $BASE/protocols "{\"entityType\":\"model\",\"entityId\":\"$MID\",\"protocol\":\"ANTHROPIC\",\"supported\":true,\"probeMethod\":\"documented\",\"confidence\":0.7}"
  ID=$(sed -n 's/.*"data":{"id":"\([^"]*\)".*/\1/p' /tmp/mx-body); echo "id=$ID"
  step get GET $BASE/protocols/$ID
  step patch PATCH $BASE/protocols/$ID '{"supported":false,"confidence":0.9}'
  step patch-conflict PATCH $BASE/protocols/$ID '{"protocol":"OPENAI"}'
  step patch-invalid PATCH $BASE/protocols/$ID '{"protocol":"openai_chat"}'
  step patch-unknown-key PATCH $BASE/protocols/$ID '{"foo":1}'
  step delete DELETE $BASE/protocols/$ID
  step get-after-delete GET $BASE/protocols/$ID
  step bad-id GET $BASE/protocols/not-a-uuid
  step anon-delete DELETE $BASE/protocols/$ID '' /dev/null
else
  step create POST $BASE/capabilities "{\"modelId\":\"$MID\",\"capability\":\"function_calling\",\"supported\":true,\"source\":\"observed\"}"
  ID=$(sed -n 's/.*"data":{"id":"\([^"]*\)".*/\1/p' /tmp/mx-body); echo "id=$ID"
  step get GET $BASE/capabilities/$ID
  step patch PATCH $BASE/capabilities/$ID '{"supported":false,"maxContextLength":131072}'
  step patch-invalid PATCH $BASE/capabilities/$ID '{"capability":"telepathy"}'
  step create-ghost-model POST $BASE/capabilities '{"modelId":"ghost","capability":"vision","supported":true}'
  step delete DELETE $BASE/capabilities/$ID
  step get-after-delete GET $BASE/capabilities/$ID
fi
echo "audit_rows($RES)=$(/usr/lib/postgresql/17/bin/psql -h /tmp -p 55433 -U postgres -d aidean_matrix -tA -c "select string_agg(action::text, ',' order by created_at) from audit_logs where table_name='$([ $RES = protocols ] && echo protocol_compatibilities || echo capability_matrices)' and record_id='$ID'")"
