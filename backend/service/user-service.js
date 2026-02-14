const UserModel = require("../models/user-model")
const bcrypt = require("bcrypt")
const uuid = require("uuid")
const mailService = require("../service/mail-service")
const tokenService = require("../service/token-service")
const UserDto = require("../dtos/user-dto")

class UserService {
    async registration(email, password) {
        const candidate = await UserModel.findByEmail(email);
        if (candidate) {
            throw new Error(`Пользователь с почтовым адерсом ${email} уже существует`)
        }

        const hashedPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const user = await UserModel.create({ email, password: hashedPassword, activationLink })
        await mailService.sendActivationMail(email, activationLink);

        const uesrDto = new UserDto(user);
        const tokens = tokenService.generateToken({...UserDto});
        await tokenService.saveToken(UserDto.id, tokens.refreshToken);

        return {
            ...tokens,
            user: UserDto
        }
    }
}

module.exports = new UserService();