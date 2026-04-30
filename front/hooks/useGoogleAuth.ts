import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { saveSession } from '@/lib/session';
import apiClient from '@/lib/api-client';

WebBrowser.maybeCompleteAuthSession();

//const ALLOWED_DOMAIN = 'ucaldas.edu.co';
const ALLOWED_DOMAIN = 'gmail.com';

export function useGoogleAuth() {
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Usar los nombres antiguos o nuevos del .env
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    const googleIosScheme = iosClientId
        ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
        : null;

    const redirectUri = Platform.select({
        ios: googleIosScheme ? `${googleIosScheme}:/oauthredirect` : undefined,
        // TRUCO: Usar el listado y esquema de iOS también en Android
        android: googleIosScheme ? `${googleIosScheme}:/oauthredirect` : undefined,
        default: AuthSession.makeRedirectUri({
            scheme: 'com.ucaldas.estudiantes',
            path: 'oauthredirect',
        }),
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId,
        // TRUCO: Decirle a Google que Android es iOS para evitar el bloqueo de Custom Scheme
        androidClientId: Platform.OS === 'android' ? iosClientId : androidClientId,
        iosClientId,
        redirectUri,
        // Forzar dominio institucional 
        extraParams: {
            hd: ALLOWED_DOMAIN, // hd = hosted domain 
        },
        scopes: ['openid', 'profile', 'email'],
    });

    const signIn = () => {
        if (!iosClientId || !androidClientId || !webClientId) {
            setError('Faltan client IDs de Google en .env');
            return;
        }
        console.log('OAuth redirectUri:', redirectUri);
        setError(null);
        promptAsync();
    };

    useEffect(() => {
        if (response?.type === 'success') {
            fetchUserInfo(response.authentication!.accessToken);
        }
        if (response?.type === 'error') {
            const oauthError = (response?.params as any)?.error_description || (response?.params as any)?.error || 'Solicitud OAuth inválida';
            setError(`Google OAuth: ${oauthError}`);
        }
        if (response?.type === 'dismiss' || response?.type === 'cancel') {
            setError('Inicio de sesión cancelado.');
        }
    }, [response]);

    const fetchUserInfo = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            /*
            // Validar que sea cuenta @ucaldas.edu.co 
            if (!data.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
                setError('Solo se permiten cuentas @ucaldas.edu.co');
                return;
            }*/

            // Sincronizar el token con el backend para guardar la sesión en la app
            try {
                const backendRes = await apiClient.post('/auth/google/web', { accessToken: token });
                const { accessToken: localToken, refreshToken, user: backendUser } = backendRes.data;

                await saveSession({
                    user: {
                        id: backendUser.id,
                        name: backendUser.name,
                        email: backendUser.email,
                        role: backendUser.role || 'student',
                        avatarUrl: backendUser.avatarUrl || null,
                    },
                    accessToken: localToken,
                    refreshToken,
                });

                setUser(backendUser);
            } catch (backendError: any) {
                const msg = backendError?.response?.data?.message || 'Error al autenticar con el servidor de Uniconnect';
                setError(msg);
            }
        } catch (e) {
            setError('Error al obtener información del usuario');
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => setUser(null);

    return { user, error, loading, request, signIn, signOut };
}