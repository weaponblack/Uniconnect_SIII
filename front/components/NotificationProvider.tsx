import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { loadSession } from '@/lib/session';
import { respondToTransferRequest } from '@/lib/study-group-api';
import { authConfig } from '@/constants/AuthConfig';
import { router } from 'expo-router';
import { useToast } from '@/components/Toast';

interface NotificationContextType {
    socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType>({ socket: null });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        let currentSocket: Socket | null = null;

        const connectSocket = async () => {
            const session = await loadSession();
            if (!session?.accessToken) return;

            const apiUrl = authConfig.backendUrl;
            currentSocket = io(apiUrl, {
                auth: { token: session.accessToken },
                transports: ['websocket']
            });

            currentSocket.on('connect', () => {
                console.log('Socket connected successfully');
            });

            currentSocket.on('transferRequest', (request: any) => {
                const groupName = request.group?.name || 'un grupo';
                Alert.alert(
                    'Delegación de Administración',
                    `Te han solicitado administrar el grupo "${groupName}".`,
                    [
                        { 
                            text: 'Rechazar', 
                            style: 'cancel', 
                            onPress: async () => {
                                try {
                                    await respondToTransferRequest(request.id, 'REJECTED');
                                    showToast('Has rechazado la solicitud', 'info');
                                } catch (e) {
                                    console.error(e);
                                    showToast('Error al rechazar solicitud', 'error');
                                }
                            }
                        },
                        { 
                            text: 'Aceptar', 
                            onPress: async () => {
                                try {
                                    await respondToTransferRequest(request.id, 'ACCEPTED');
                                    showToast('¡Ahora eres el administrador!', 'success');
                                    // Could refresh the screen or redirect
                                    router.replace('/(tabs)/study-groups' as any);
                                } catch (e) {
                                    console.error(e);
                                    showToast('Error al aceptar solicitud', 'error');
                                }
                            }
                        }
                    ]
                );
            });

            currentSocket.on('transferAccepted', (request: any) => {
                 showToast('El usuario aceptó tu solicitud de transferencia. Has abandonado el grupo.', 'success');
                 router.replace('/(tabs)/study-groups' as any);
            });

            currentSocket.on('transferRejected', (request: any) => {
                Alert.alert('Solicitud Rechazada', 'El usuario rechazó tu solicitud para administrar el grupo.');
            });

            currentSocket.on('notification', (notif: any) => {
                if(notif.type !== 'ADMIN_TRANSFER_REQUEST') {
                    showToast(notif.message, 'info');
                }
            });

            setSocket(currentSocket);
        };

        connectSocket();

        return () => {
            currentSocket?.disconnect();
        };
    }, []);

    return (
        <NotificationContext.Provider value={{ socket }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotificationContext = () => useContext(NotificationContext);
