export const getServerSecret = (): string => {
    const secret = process.env.SERVER_SECRET;
    if (!secret) {
        throw new Error('SERVER_SECRET is not defined in environment variables.');
    }
    return secret;
};
