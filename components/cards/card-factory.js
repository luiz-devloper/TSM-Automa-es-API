import { CardAutomacoesController } from "./card-controller.js";
import { GoalfyApiAdapter } from "./card-externalApi.js";
import { CardAutomacoesService } from "./card-service.js";


export class CardFactory{

    static getController(){
        const api = new GoalfyApiAdapter();
        const service = new CardAutomacoesService(api);
        const controller = new CardAutomacoesController(service);

        return controller
    }
}