'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogMode } from '../components/ui/Dialog';

interface ModalContextType {
    showAlert: (title: string, message: string) => Promise<boolean>;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<DialogMode>('alert');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    // Store resolve function to handle Promise
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

    const openDialog = (mode: DialogMode, title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setMode(mode);
            setTitle(title);
            setMessage(message);
            setIsOpen(true);
            setResolveRef(() => resolve);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolveRef) resolveRef(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolveRef) resolveRef(false);
    };

    const showAlert = useCallback((title: string, message: string) => {
        setMode('alert');
        return openDialog('alert', title, message);
    }, []);

    const showConfirm = useCallback((title: string, message: string) => {
        setMode('confirm');
        return openDialog('confirm', title, message);
    }, []);

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <Dialog
                isOpen={isOpen}
                mode={mode}
                title={title}
                message={message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
