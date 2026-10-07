// test-rate-limit.js
// Uso: node test-rate-limit.js [url] [quantidade] [concorrência]
const TARGET = process.argv[2] || 'https://api-goalfy.tsmmonitoramento.com.br/';
const TOTAL_REQUESTS = Number(process.argv[3] || 50);
const CONCURRENCY = Number(process.argv[4] || 20); // dispara em paralelo, pra simular rajada

async function hit(i) {
    const start = Date.now();
    try {
        const res = await fetch(TARGET, { method: 'GET' });
        const ms = Date.now() - start;
        let body = null;

        // Só lê o corpo quando for status de limite, pra não desperdiçar tempo nas 200
        if (res.status === 429 || res.status === 503) {
            try {
                body = await res.text();
            } catch {
                body = '(falha ao ler corpo)';
            }
        }

        return { i, status: res.status, ms, body };
    } catch (err) {
        return { i, status: 'ERRO', ms: Date.now() - start, error: err.message };
    }
}

async function run() {
    console.log(`Disparando ${TOTAL_REQUESTS} requisições para ${TARGET} (concorrência: ${CONCURRENCY})\n`);

    const results = [];
    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
        const batch = Array.from(
            { length: Math.min(CONCURRENCY, TOTAL_REQUESTS - i) },
            (_, j) => hit(i + j + 1)
        );
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    // Resumo por status
    const byStatus = {};
    results.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    console.log('=== Resultado por status ===');
    Object.entries(byStatus)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
            console.log(`  ${status}: ${count} requisições`);
        });

    const limited = results.filter(r => r.status === 429 || r.status === 503);
    console.log(`\n=== Diagnóstico ===`);

    if (limited.length === 0) {
        console.log('⚠️  Nenhuma requisição foi bloqueada — rate limit pode não estar ativo,');
        console.log('    ou o volume/concorrência do teste foi baixo demais para disparar o limite.');
        console.log('    Tente aumentar a concorrência ou o total de requisições.');
    } else {
        const statusUsed = limited[0].status;
        console.log(`✅ Rate limit ativo — ${limited.length} de ${TOTAL_REQUESTS} requisições foram limitadas.`);

        if (statusUsed === 503) {
            console.log(`⚠️  Retornando 503 em vez de 429 — confira "limit_req_status 429;" no nginx.conf`);
            console.log(`    e lembre de ter dado "sudo nginx -t && sudo systemctl reload nginx" depois de editar.`);
        } else {
            console.log(`✅ Retornando o status correto: 429.`);
        }

        // Mostra o corpo da primeira resposta limitada, pra confirmar se é o JSON customizado
        console.log(`\n--- Corpo da primeira resposta limitada (#${limited[0].i}, ${limited[0].ms}ms) ---`);
        console.log(limited[0].body);

        const isCustomJson = limited[0].body?.trim().startsWith('{');
        console.log(isCustomJson
            ? '\n✅ Corpo customizado em JSON confirmado — location = /429.json está funcionando.'
            : '\n⚠️  O corpo não parece ser o JSON customizado — pode estar caindo na página de erro padrão do Nginx.\n    Confira se "error_page 429 /429.json;" está dentro do location certo.');
    }

    // Tempo médio das que passaram, só por curiosidade
    const ok = results.filter(r => r.status === 200);
    if (ok.length > 0) {
        const avgMs = Math.round(ok.reduce((sum, r) => sum + r.ms, 0) / ok.length);
        console.log(`\nTempo médio das requisições bem-sucedidas: ${avgMs}ms (${ok.length} requisições)`);
    }
}

run();