import cron from "node-cron";
import { GoalfyApiAdapter } from "../cards/card-externalApi.js";

const goalfyApi = new GoalfyApiAdapter();

export function cronJobVerifyCardsInExecution() {

    cron.schedule('0 0 * * *', async () => {
        console.log('Executando cron job (CronJobVerifyCardsInExecution):', new Date().toISOString());
        try {
            const schedulingExecutionPhase = process.env.SCHEDULING_EXECUTION_PHASE;
            const schedulingCardsId = await goalfyApi.getCardsByPhase(schedulingExecutionPhase);

            for (let schedulingId of schedulingCardsId) {

                const procedureCardsId = await goalfyApi.getRelationCardsInProcedure(schedulingId);
                const phaseTitles = [];

                for (let procedureId of procedureCardsId) {
                    const card = await goalfyApi.getCard(procedureId);
                    phaseTitles.push(card.phase.id);
                }
                // obs se NÃO houver nenhum card em procediemntos com a phase id "26956ba0-9ab8-43f1-a085-407db1311b95"
                // significa então que todos os processos que ja estavam ali relacionado a determinado agendamento
                // ja foram para outra fase. E PORTANTO SE ISSO FOR VERDADEIRO, ESSA CONDICIONAL SERÁ FALSE;
                if (phaseTitles.includes(process.env.PROCEDURES_EXECUTION_PHASE) == false) {
                    // portanto: mover o agendamento para "devolução de peças"
                    goalfyApi.moveCardToPhase(schedulingId, process.env.SCHEDULING_RETURN_PHASE, process.env.PROCEDURE_BOARD_ID)
                }
            }
        } catch (error) {
            await logger.error(`Erro ao verificar os procediementos atrelados á agendamentos`);
        }
    });

}