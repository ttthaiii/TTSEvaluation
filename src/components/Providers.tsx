'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

import { ModalProvider } from '@/context/ModalContext';
import { EvaluationProvider } from '@/context/EvaluationContext';
import FirebaseAuthSync from './FirebaseAuthSync';

import { SecurityProvider } from '@/context/SecurityContext'; // Import SecurityProvider

export default function Providers({ children, session }: { children: React.ReactNode, session?: Session | null }) {
    return (
        <SessionProvider session={session}>
            <FirebaseAuthSync />
            <EvaluationProvider>
                <ModalProvider>
                    <SecurityProvider>
                        {children}
                    </SecurityProvider>
                </ModalProvider>
            </EvaluationProvider>
        </SessionProvider>
    );
}
