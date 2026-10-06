import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputLogPath = process.env.LOG_PATH
    ? path.resolve(process.env.LOG_PATH)
    : path.resolve(__dirname, '../../log/errors.log');

const REPORT_ENDPOINT = 'https://flow.goalfy.com.br/automations/v1/d314c99f-b39d-4093-bf65-32ad3310c0c1/hooks/catch/';

console.log(`📍 Diretório do script: ${__dirname}`);
console.log(`🎯 Caminho absoluto do log: ${inputLogPath}`);

/**
 * Lê o arquivo de logs e analisa as entradas
 */
function processErrorLogs(logFilePath) {
    if (!fs.existsSync(logFilePath)) {
        throw new Error(`Arquivo não encontrado em: ${logFilePath}`);
    }

    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    let totalErrors = 0;
    const errorsByType = {};
    const affectedCards = [];
    const logDetails = [];

    lines.forEach(line => {
        try {
            const logEntry = JSON.parse(line);

            if (logEntry.level === 'error') {
                totalErrors++;

                const timestamp = new Date(logEntry.timestamp).toLocaleString('pt-BR');
                const message = logEntry.message;

                const urlMatch = message.match(/(https?:\/\/app\.goalfy\.com\.br\/[^\s]+)/);
                const cardUrl = urlMatch ? urlMatch[0] : null;

                let category = 'Outros Erros';
                if (message.includes('reagendar card')) {
                    category = 'Falha ao Reagendar Card';
                } else if (message.includes('mover card')) {
                    category = 'Falha ao Mover Card';
                } else if (message.includes('procediementos atrelados')) {
                    category = 'Falha ao Verificar Procedimentos';
                }

                errorsByType[category] = (errorsByType[category] || 0) + 1;

                if (cardUrl) {
                    affectedCards.push({ timestamp, category, url: cardUrl });
                }

                logDetails.push({ timestamp, category, message, cardUrl });
            }
        } catch (err) {
            // Ignora linhas que não são JSON válido
        }
    });

    return { totalErrors, errorsByType, affectedCards, logDetails };
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Paleta por categoria, para a barrinha lateral e o badge de cada item
const CATEGORY_COLORS = {
    'Falha ao Reagendar Card': '#d97706',
    'Falha ao Mover Card': '#dc2626',
    'Falha ao Verificar Procedimentos': '#7c3aed',
    'Outros Erros': '#6b7280',
};

function colorFor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Outros Erros'];
}

function htmlShell(title, bodyContent) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background:#eef1f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;">
        <tr><td>${bodyContent}</td></tr>
    </table>
</body>
</html>`;
}

/**
 * Relatório para quando NÃO há erros
 */
function generateNoErrorsReport() {
    const now = new Date().toLocaleString('pt-BR');

    const body = `
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px;text-align:center;">
            <div style="font-size:40px;line-height:1;">✅</div>
            <h1 style="margin:12px 0 4px;color:#ffffff;font-size:20px;">Tudo certo por aqui</h1>
            <p style="margin:0;color:#d1fae5;font-size:13px;">Nenhum erro registrado no período monitorado</p>
        </div>
        <div style="padding:28px 32px;text-align:center;">
            <p style="font-size:14px;color:#4b5563;margin:0;">
                A varredura em <strong>errors.log</strong> não encontrou nenhuma entrada com nível
                <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">error</code>.
            </p>
            <p style="font-size:12px;color:#9ca3af;margin-top:20px;">Verificado em ${now}</p>
        </div>
    </div>`;

    return htmlShell('Relatório de Monitoramento — Sem Erros', body);
}

/**
 * Relatório com erros, layout mais elaborado
 */
function generateHtmlReport(summary) {
    const { totalErrors, errorsByType, affectedCards, logDetails } = summary;
    const now = new Date().toLocaleString('pt-BR');

    const statsCards = Object.entries(errorsByType).map(([type, count]) => `
        <td style="padding:6px;">
            <div style="background:#ffffff;border-radius:10px;padding:14px;border-left:4px solid ${colorFor(type)};box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                <div style="font-size:22px;font-weight:700;color:${colorFor(type)};">${count}</div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;">${escapeHtml(type)}</div>
            </div>
        </td>`).join('');

    const affectedCardsSection = affectedCards.length > 0 ? `
        <div style="margin-top:28px;">
            <h2 style="font-size:15px;color:#111827;margin:0 0 12px;">🔗 Cards Afetados Diretamente</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                <tr style="background:#f9fafb;">
                    <th align="left" style="padding:10px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Data/Hora</th>
                    <th align="left" style="padding:10px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Tipo</th>
                    <th align="left" style="padding:10px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Card</th>
                </tr>
                ${affectedCards.map(item => `
                <tr>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;color:#374151;">${escapeHtml(item.timestamp)}</td>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;">
                        <span style="background:${colorFor(item.category)}20;color:${colorFor(item.category)};padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;">${escapeHtml(item.category)}</span>
                    </td>
                    <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;">
                        <a href="${escapeHtml(item.url)}" style="color:#2563eb;text-decoration:none;font-weight:600;">Acessar card →</a>
                    </td>
                </tr>`).join('')}
            </table>
        </div>` : '';

    const logDetailsSection = logDetails.map(log => `
        <div style="background:#ffffff;border-left:4px solid ${colorFor(log.category)};border-radius:8px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#6b7280;margin-bottom:4px;">
                <span style="color:${colorFor(log.category)};font-weight:700;">${escapeHtml(log.category)}</span>
                <span>${escapeHtml(log.timestamp)}</span>
            </div>
            <div style="font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(log.message)}</div>
        </div>`).join('');

    const body = `
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:28px 32px;">
            <div style="font-size:28px;">📊</div>
            <h1 style="margin:8px 0 4px;color:#ffffff;font-size:20px;">Relatório de Monitoramento de Erros</h1>
            <p style="margin:0;color:#fecaca;font-size:13px;">Gerado em ${now}</p>
        </div>

        <div style="padding:24px 32px 8px;">
            <div style="display:inline-block;background:#fef2f2;color:#b91c1c;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;">
                ${totalErrors} erro${totalErrors > 1 ? 's' : ''} encontrado${totalErrors > 1 ? 's' : ''}
            </div>

            <h2 style="font-size:15px;color:#111827;margin:24px 0 10px;">📈 Resumo por Categoria</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>${statsCards}</tr>
            </table>

            ${affectedCardsSection}

            <h2 style="font-size:15px;color:#111827;margin:28px 0 10px;">📋 Histórico Detalhado</h2>
            ${logDetailsSection}
        </div>

        <div style="padding:16px 32px;background:#f9fafb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Relatório automático — TSM Automações</p>
        </div>
    </div>`;

    return htmlShell('Relatório de Monitoramento de Erros', body);
}

/**
 * Envia o relatório via HTTP POST
 */
async function sendReport(reportContent, summary) {
    const response = await fetch(REPORT_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${process.env.REPORT_TOKEN}`,
        },
        body: JSON.stringify({
            totalErrors: summary.totalErrors,
            errorsByType: summary.errorsByType,
            report: reportContent,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Falha ao enviar relatório (HTTP ${response.status}): ${text}`);
    }

    return response;
}

/**
 * Limpa o conteúdo do arquivo de log, mantendo o arquivo (só esvazia)
 */
function clearLogFile(logFilePath) {
    fs.writeFileSync(logFilePath, '', 'utf-8');
    console.log(`🧹 Log limpo em: ${logFilePath}`);
}

cron.schedule('0 8 * * 1-5', async () => {
    console.log('Executando cron job (CronJobErrorRelatory):', new Date().toISOString());
    try {
        const summary = processErrorLogs(inputLogPath);

        const reportContent = summary.totalErrors === 0
            ? generateNoErrorsReport()
            : generateHtmlReport(summary);

        // Só limpa se o envio foi confirmado (sendReport lança erro se falhar)
        await sendReport(reportContent, summary);

        console.log(summary.totalErrors === 0
            ? `✅ Nenhum erro encontrado — relatório informativo enviado para: ${REPORT_ENDPOINT}`
            : `✅ Relatório enviado com sucesso para: ${REPORT_ENDPOINT}`);

        // Limpa o log só quando havia algo a limpar
        if (summary.totalErrors > 0) {
            clearLogFile(inputLogPath);
        }
    } catch (error) {
        console.error('❌ Erro ao processar:', error.message);
        // Se o envio falhar, o log NÃO é limpo — nada se perde
    }
}, {
    timezone: 'America/Sao_Paulo', // importante para não rodar no horário errado (UTC)
});