export class Result {
    isSuccess;
    statusCode;
    #error; 
    #value;

    constructor(isSuccess,error,value) {
        this.isSuccess = isSuccess;
        this.#error = error;
        this.statusCode = 200;
        this.#value = value;

    }
    
    getValue(){
        if(this.isSuccess == false){
            return this.#error;
        }
        return this.#value
    }

    setStatusCode(statusCode){
        this.statusCode = statusCode;
    }

    static ok(value){
        return new Result(true,null,value);
    }

    static fail(error){
        return new Result(false,error);
    }
}