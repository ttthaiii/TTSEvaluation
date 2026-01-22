'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SecurityContextType {
    masterKey: string | null;
    setMasterKey: (key: string | null) => void;
    isAuthenticated: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider = ({ children }: { children: ReactNode }) => {
    const [masterKey, setMasterKey] = useState<string | null>(null);

    const value = {
        masterKey,
        setMasterKey,
        isAuthenticated: !!masterKey,
    };

    return (
        <SecurityContext.Provider value={value}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
};
