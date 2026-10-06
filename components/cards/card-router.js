import { Router } from "express";
import { CardFactory } from "./card-factory.js";
import { ExpressAdapter } from "../../server/adpterRequest.js";


export class CardsRoutes {

    #controller;
    #router;

    constructor() {
        this.#router = Router()
        this.#controller = CardFactory.getController();

    }

    getRoutes() {

        this.#router.route("/api/automacoes/moveTo")
            .post(
                ExpressAdapter.adapt(
                    this.#controller.moveToPhase.bind(this.#controller)
                )
            )

        this.#router.route("/api/automacoes/card/rescheduling")
            .put(
                ExpressAdapter.adapt(
                    this.#controller.reschedulingCard.bind(this.#controller)
                )
            )

        this.#router.route("/api/automacoes/card/workOrder/:cardId/procedure")
            .post(
                ExpressAdapter.adapt(
                    this.#controller.createProceduresOfWorkOrder.bind(this.#controller)
                )
            )

        this.#router.route("/api/automacoes/card/procedure")
            .put(
                ExpressAdapter.adapt(
                    this.#controller.linkProcedutesInWorkOrder.bind(this.#controller)
                )
            )

        return this.#router
    }

}