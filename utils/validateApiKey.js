import dotenv from "dotenv";
import { timingSafeEqual } from 'node:crypto';

dotenv.config();

const API_KEY = process.env.API_KEY;

export function validadeKey(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            status: 401,
            error: 'Unauthorized',
            message: 'Token de autorização não informado.'
        });
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({
            status: 401,
            error: 'Unauthorized',
            message: 'Formato de autorização inválido.'
        });
    }

    const tokenBuffer = Buffer.from(token);
    const apiKeyBuffer = Buffer.from(API_KEY);


    if (
        tokenBuffer.length !== apiKeyBuffer.length ||
        !timingSafeEqual(tokenBuffer, apiKeyBuffer)
    ) {
        return res.status(401).json({
            status: 401,
            error: 'Unauthorized',
            message: 'Token inválido.'
        });
    }

    next();
}