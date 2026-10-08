import { MoveCardError, ReschedulingError, UnexpectedError } from "../../shared/appErrors.js";
import { logger } from "../../shared/logger.js";

export class GoalfyApiAdapter {

    #urlGoalfyCards = "https://api.goalfy.com.br/api/cards";
    #urlGoalfyForms = "https://api.goalfy.com.br/api/forms";
    #goalfyKey = process.env.GOALFY_KEY;

    async getCardsByPhase(phaseId) {
        const response = await fetch(`${this.#urlGoalfyCards}/phase/${phaseId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: "Token eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIyYzk1NTcyOC1iYzQ4LTQzNTEtYmVlYy1mMjc0NDFiMjRlY2MiLCJPUkdfSUQiOiJmZjdlNTIwOC1lMGY4LTQ5ODktODc5Ny1iODBmMDBkMmQyZDEiLCJPTkxZX0FETV9DUkVBVEVfQVVUT01BVElPTiI6dHJ1ZSwiUk9MRVMiOlsiVVNFUiJdLCJPTkxZX0FETV9DUkVBVEVfQk9BUkQiOnRydWUsIk9OTFlfQURNX0NSRUFURV9EQVRBQkFTRSI6dHJ1ZSwiaXNzIjoidXNlcnMtc2VydmljZSIsImNvbXBsZW1lbnRhcnktc3Vic2NyaXB0aW9uIjoiNDNiODg3NTItYjBjMC00MzVmLWFmNWEtMWRhNmZmM2I4ZWY2IiwiT05MWV9BRE1fQ1JFQVRFX1BPUlRBTCI6dHJ1ZSwiT05MWV9BRE1fSU5WSVRFX1VTRVIiOmZhbHNlLCJVU0VSX1JPTEUiOiJVU0VSIiwiaWF0IjoxNzkwMDA4ODkwfQ.zDL1IxkVTHYq88-X68Uap4q6ivw3n7F-um7zW2s63CJGZNZThv5UiL9poIwOEupQk05fTmwJnlxT0J3CDY1e0Q" }
        });

        const data = await response.json();
        const cardIds = data.map(el => el.id);
        return cardIds
    }

    async getCard(cardId) {
        const response = await fetch(`${this.#urlGoalfyCards}/${cardId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
        });

        const card = await response.json();
        return card;
    }

    async moveCardToPhase(cardId, phaseId, boardId) {

        const response = await fetch(`${this.#urlGoalfyCards}/moveTo/${cardId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
            body: JSON.stringify({ phaseId }),
        });

        // fetch NÃO rejeita em 4xx/5xx, então é preciso checar manualmente
        if (!response.ok) {
            await logger.error(`Erro ao tentar mover card https://app.goalfy.com.br/board/${boardId}/cards/${cardId} para a fase com identificador ${phaseId}`);
            throw MoveCardError.create(cardId, phaseId);
        }

        return response.json();
    }

    async getRelationCardsInProcedure(cardId) {
        const response = await fetch(`${this.#urlGoalfyCards}/${cardId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
        });

        const data = await response.json();
        const cardsId = data.form.fields.find(el => el.name == "fieldProcedimentos").value
        return cardsId || null;
    }

    async updateReschedulingOfCard(cardId, rescheduling, boardId, fieldId) {
        try {
            const response = await fetch(`${this.#urlGoalfyForms}/field/${fieldId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
                body: JSON.stringify({
                    name: "fieldReagendamento",
                    value: [rescheduling.value]
                })
            });

            const data = await response.json();
            return data
        } catch (error) {
            await logger.error(`Erro ao tentar reagendar card https://app.goalfy.com.br/board/${boardId}/cards/${cardId} para novo reagendamento ${rescheduling.name}`);
            throw ReschedulingError.create(cardId, rescheduling.name);
        }
    }

    async createProcedureCard(clientId, plate, workOrder, typeRequest, helpDesk) {
        try {
            const response = await fetch(`https://api.goalfy.com.br/api/cards/form`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
                body: JSON.stringify({
                    modelId: process.env.MODEL_ID,
                    fields: [
                        //infoId do cliente
                        {
                            value: [clientId],
                            fieldInfoId: process.env.INFO_CLIENT_ID
                        },
                        //ordem de serviço
                        {
                            value: workOrder,
                            fieldInfoId: process.env.INFO_WORK_ORDER
                        },
                        //placa
                        {
                            value: plate,
                            fieldInfoId: process.env.INFO_PLATE
                        },
                        //tipo solicitação
                        {
                            value: typeRequest,
                            fieldInfoId: process.env.INFO_TYPE_REQUEST
                        },
                        //helpDesk
                        {
                            value: helpDesk,
                            fieldInfoId: process.env.INFO_HELPDESK
                        }
                    ]
                })
            });

            const data = await response.json();
            return data
        } catch (error) {
             await logger.error(`erro ao criar os card de procedimentos vinculados ao card de ordem de serviço https://app.goalfy.com.br/board/075a03af-376f-4053-be5c-4f295d9f91f4/cards/${cardId}`)
            throw UnexpectedError.create("não foi posivel criar procedimentos relacionado á ordem de serviço")
        }
    }

    async updateCard(formId, fieldInfoId, values, cardId) {
        try {
            const response = await fetch(`${this.#urlGoalfyForms}/${formId}/field`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": this.#goalfyKey },
                body: JSON.stringify({
                    fieldInfoId: fieldInfoId,
                    value: values,
                    cardId: cardId
                })
            });

            const data = await response.json();
            return data
        } catch (error) {
            await logger.error(`erro ao vincular os card de procedimentos ao card de ordem de serviço https://app.goalfy.com.br/board/075a03af-376f-4053-be5c-4f295d9f91f4/cards/${cardId}`)
            throw UnexpectedError.create("não foi posivel vincular procedimentos relacionado á ordem de serviço")
        }
    }
}

