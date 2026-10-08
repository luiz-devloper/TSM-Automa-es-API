import { UnexpectedError } from "../../shared/appErrors.js";
import { logger } from "../../shared/logger.js";
import { Result } from "../../utils/result.js";
import { GoalfyApiAdapter } from "./card-externalApi.js";

export class CardAutomacoesService {

    #goalfyApi;

    /**
     * 
     * @param {GoalfyApiAdapter} goalfyApi 
     */
    constructor(goalfyApi) {
        this.#goalfyApi = goalfyApi
    }

    async moveCardToPhase(phaseId, cards, boardId) {
        try {
            const requests = cards.map(async cardId => {
                return this.#goalfyApi.moveCardToPhase(cardId, phaseId, boardId)
            })

            const results = await Promise.all(requests);
            // só chega aqui se TODOS deram certo
            return Result.ok(results);

        } catch (error) {
            console.log(error);
            return Result.fail(UnexpectedError.create("não foi possivel mover os cards"))
        }
    }

    async reschedulingCard(cardId) {
        try {
            const phasesOfRescheduling = {
                firstRescheduling: {
                    value: process.env.FIRST_RESCHEDULING,
                    name: "Primeira tentativa"
                },
                secondRescheduling: {
                    value: process.env.SECOND_RESCHEDULING,
                    name: "Segunda tentativa"
                },
                thirdRescheduling: {
                    value: process.env.THIRD_RESCHEDULING,
                    name: "Terceira tentativa"
                },
                activateManager: {
                    value: process.env.LAST_RESCHEDULING,
                    name: "Acionar o gestor"
                }
            }

            const card = await this.#goalfyApi.getCard(cardId);
            const tag = card.phasesHistory[0].form.fields.find(el => el.fieldType == "tag").value[0];
            const field = card.phasesHistory[0].form.fields.find(el => el.fieldType == "tag");
            let chosedRescheduling = null;

            switch (tag) {
                case phasesOfRescheduling.firstRescheduling.value:
                    chosedRescheduling = phasesOfRescheduling.secondRescheduling;
                    break;

                case phasesOfRescheduling.secondRescheduling.value:
                    chosedRescheduling = phasesOfRescheduling.thirdRescheduling;
                    break;

                case phasesOfRescheduling.thirdRescheduling.value:
                    chosedRescheduling = phasesOfRescheduling.activateManager;
                    break;
            }

            if (tag !== phasesOfRescheduling.activateManager.value) {
                await this.#goalfyApi.updateReschedulingOfCard(
                    cardId,
                    chosedRescheduling,
                    field.boardId,
                    field.id);
            }

            return Result.ok("card movido para o reagendamento com sucesso!")

        } catch (error) {
            return Result.fail(UnexpectedError.create("não foi possivel trocar o reagendamento do card"))
        }
    }

    async createProcedureOfWorkOrder(cardId) {
        try {
            const data = await this.#goalfyApi.getCard(cardId);
            const allFields = [
                ...(data.form?.fields || []),
                ...(data.phasesHistory?.flatMap(p => p.form?.fields || []) || [])
            ];
            
            const helpDesk = allFields.find(el => el.name == "fieldHelpDesk")?.value;
            const formId = data.phasesHistory[1].form.id;
            const clientId = allFields.find(el => el.name == "fieldTESTE")?.value[0];
            const workOrderId = allFields.find(el => el.name == "fieldOrdem de servio")?.value;

            const platesInstalation = this.#getPlatesArray("instala", "Instalação", allFields);
            const platesMaintenance = this.#getPlatesArray("manuten", "Manutenção", allFields);
            const platesWithdrawal = this.#getPlatesArray("retirada", "Retirada", allFields);

            // Juntei todas as placas em um único array de objetos (se preferir separadas, basta usar as constantes acima)
            const allPlates = [
                ...platesInstalation,
                ...platesMaintenance,
                ...platesWithdrawal
            ];

            const requests = allPlates.map(async plate => {
                return this.#goalfyApi.createProcedureCard(clientId, plate.value, workOrderId, plate.type, helpDesk);
            })

            const proceduresCards = await Promise.all(requests);
            const proceduresId = proceduresCards.map(el => el.id);

            // só chega aqui se TODOS deram certo
            return Result.ok({
                formId,
                values: JSON.stringify(proceduresId),
                cardId,
                fieldInfoId: process.env.CONNECTED_BOARD
            });

        } catch (error) {
            console.log(error);
            return Result.fail(UnexpectedError.create("não foi posivel criar procedimentos relacionado á ordem de serviço"))
        }
    }

    async linkProcedutesInWorkOrder(formId, cardId, values, fieldInfoId) {
        try {
            const data = await this.#goalfyApi.updateCard(formId,fieldInfoId,values,cardId);
            return Result.ok(data);
        } catch (error) {
            return Result.fail(UnexpectedError.create("não foi posivel vincular procedimentos relacionado á ordem de serviço"))
        }
    }


    #getPlatesArray = (nomeBusca, tipoInstalacao, allFields) => {
        const campo = allFields.find(f => f.name && f.name.toLowerCase().includes(nomeBusca));
        if (!campo || !campo.value) return [];

        return String(campo.value)
            .split(/[,;\n\r]+/)
            .map(p => p.trim())
            .filter(Boolean)
            .map(placa => ({
                value: placa,
                type: tipoInstalacao
            }));
    };

}
