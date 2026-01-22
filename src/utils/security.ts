import CryptoJS from 'crypto-js';

// Validates that the key is of sufficient length (e.g., at least 4 chars for now, can be stricter)
export const validateKey = (key: string): boolean => {
    return key.length >= 4;
};

// Encrypts any data (object, string, number) into a ciphertext string
export const encryptData = (data: any, key: string): string => {
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, key).toString();
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Encryption failed');
    }
};

// Decrypts ciphertext back to original data
export const decryptData = (ciphertext: string, key: string): any => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            // If decryption produces empty string, it likely means wrong key (padding error)
            throw new Error('Decryption resulted in empty string');
        }

        return JSON.parse(decryptedString);
    } catch (error) {
        // Determine if it was a JSON parse error or AES decrypt error
        console.error('Decryption failed:', error);
        throw new Error('Invalid Key or Corrupted Data');
    }
};
