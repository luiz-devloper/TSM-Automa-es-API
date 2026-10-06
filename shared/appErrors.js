export class UnexpectedError {
    constructor(errorMessage) {
        this.errorMessage = errorMessage;
        this.errorName = "UnexpectedError"
    }

    static create(errorMessage) {
        return new UnexpectedError(errorMessage);
    }
}

export class InternalServerError {
    constructor() {
        this.errorMessage = "internal server error"
        this.errorName = "InternalServerError"
    }

    static create() {
        return new InternalServerError()
    }
}

export class MoveCardError {
    constructor(message, cardId, phaseId) {
        this.errorName = "MoveCardError";
        this.errorMessage = message
        this.cardId = cardId;
        this.phaseId = phaseId;
    }

    static create(cardId, phaseId) {
        return new MoveCardError("erro ao mover o card para nova fase", cardId, phaseId)
    }
}


export class ReschedulingError {
    constructor(message, cardId, phaseId) {
        this.errorName = "ReschedulingError";
        this.errorMessage = message
        this.cardId = cardId;
    }

    static create(cardId, reschedulingName) {
        return new ReschedulingError(`erro ao reagendar card ${cardId} para novo reagendamento ${reschedulingName}`,cardId)
    }
}