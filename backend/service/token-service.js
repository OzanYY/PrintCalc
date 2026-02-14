const jwt = require("jsonwebtoken")
const tokenModel = require("../models/token-model");

class TokenService {
    generateToken(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {expiresIn: "30m"});
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {expiresIn: "30d"});

        return {
            accessToken,
            refreshToken
        }
    }

    async saveToken(userId, refreshToken) {
        // Данный спсоб позволяет авторизовать только одного пользователя с одного устройства, если он перезайдет с другого, то токен перезапишется, и все гг вп
        const tokenData = await tokenModel.findByUser(userId);
        if (tokenData) {
            tokenData.refreshToken = refreshToken;
            return tokenData.saveToken();
        }
        const token = await tokenModel.create({user: userId, refreshToken});
        return token;
    }
}

module.exports = new TokenService();