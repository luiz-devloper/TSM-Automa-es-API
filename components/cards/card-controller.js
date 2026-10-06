import { Result } from "../../utils/result.js";
import { CardAutomacoesService } from "./card-service.js";


export class CardAutomacoesController {

    #cardAutomacoesService;

    /**
     * 
     * @param {CardAutomacoesService} cardAutomacoesService 
     */
    constructor(cardAutomacoesService) {
        this.#cardAutomacoesService = cardAutomacoesService
    }

    async moveToPhase({ phaseId, procedimentos, boardId }) {
        const cards = procedimentos?.split(',')?.map(id => id.trim())

        const result = await this.#cardAutomacoesService.moveCardToPhase(phaseId, cards, boardId);

        if (!result.isSuccess) {
            result.setStatusCode(400);
        }

        return result
    }

    async reschedulingCard({ cardId }) {
        const result = await this.#cardAutomacoesService.reschedulingCard(cardId);

        if (!result.isSuccess) {
            result.setStatusCode(400);
        }

        return result
    }

    async createProceduresOfWorkOrder({ cardId }) {
        const result = await this.#cardAutomacoesService.createProcedureOfWorkOrder(cardId);

        if (!result.isSuccess) {
            result.setStatusCode(400);
        }

        return result
    }

    async linkProcedutesInWorkOrder({ formId, cardId, values, fieldInfoId }) {
        
        const result = await this.#cardAutomacoesService.linkProcedutesInWorkOrder(formId, cardId, values, fieldInfoId);

        if (!result.isSuccess) {
            result.setStatusCode(400);
        }

        return result
    }
}