// utils/authRefreshBridge.ts
// Простой синглтон-мост между axios и AuthContext.
// axios не имеет доступа к React-контексту, поэтому регистрируем колбэк сюда,
// а вызываем его после успешного рефреша токена.

type RefreshCallback = () => Promise<void>;

let onTokenRefreshed: RefreshCallback | null = null;

export const authRefreshBridge = {
    /** Регистрирует колбэк. Вызывается из AuthProvider при монтировании. */
    register(cb: RefreshCallback) {
        onTokenRefreshed = cb;
    },

    /** Убирает колбэк. Вызывается из AuthProvider при размонтировании. */
    unregister() {
        onTokenRefreshed = null;
    },

    /** Вызывается из axios-интерцептора после успешного рефреша. */
    async notify() {
        if (onTokenRefreshed) {
            await onTokenRefreshed();
        }
    },
};