#!/bin/bash
# Teste de segurança: verificar se passwordHash está sendo exposto

cd /Users/fredsonjunior/GERROT/gerrot-backend

# Iniciar servidor
JWT_SECRET=devsecret node dist/main.js &
SERVER_PID=$!
sleep 3

# Criar usuário de teste
EMAIL="security-test-$(date +%s)@gerrot.com"
REG=$(curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"name\":\"Security Test\",\"password\":\"123456\"}")

USER_ID=$(echo "$REG" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).id || ''); }
    catch(e) { console.log(''); }
  });
")

# Login
LOGIN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"123456\"}")

TOKEN=$(echo "$LOGIN" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).accessToken || ''); }
    catch(e) { console.log(''); }
  });
")

# Criar cliente
CLI=$(curl -s -X POST http://localhost:3000/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Client"}')

CLIENT_ID=$(echo "$CLI" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).id || ''); }
    catch(e) { console.log(''); }
  });
")

# Criar projeto
PROJ=$(curl -s -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"Security Test Project\",\"scriptType\":\"social_media\",\"clientId\":\"$CLIENT_ID\"}")

echo "=== VERIFICAÇÃO DE SEGURANÇA - POST /projects ==="
echo "$PROJ" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const p = JSON.parse(d);
      const hasPasswordHash = p.owner && p.owner.passwordHash;
      console.log('Owner tem passwordHash?', hasPasswordHash ? '⚠️  SIM - VULNERABILIDADE!' : '✅ NÃO - SEGURO');
      if (p.owner) {
        console.log('Owner fields:', Object.keys(p.owner).join(', '));
      }
    } catch(e) {
      console.log('Erro:', e.message);
    }
  });
"

# Listar projetos
PROJECTS=$(curl -s http://localhost:3000/projects -H "Authorization: Bearer $TOKEN")

echo ""
echo "=== VERIFICAÇÃO DE SEGURANÇA - GET /projects ==="
echo "$PROJECTS" | node -e "
  let d='';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const ps = JSON.parse(d);
      if (ps.length > 0) {
        const p = ps[0];
        const hasPasswordHash = p.owner && p.owner.passwordHash;
        console.log('Owner tem passwordHash?', hasPasswordHash ? '⚠️  SIM - VULNERABILIDADE!' : '✅ NÃO - SEGURO');
        if (p.owner) {
          console.log('Owner fields:', Object.keys(p.owner).join(', '));
        }
      }
    } catch(e) {
      console.log('Erro:', e.message);
    }
  });
"

# Encerrar servidor
kill -INT $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "=== TESTE CONCLUÍDO ==="
