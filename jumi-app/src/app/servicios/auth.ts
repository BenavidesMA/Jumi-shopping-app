import { Injectable, OnDestroy, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import type { Unsubscribe, User } from 'firebase/auth';
import { auth } from '../../firebase/config';

export const LONGITUD_MINIMA_CLAVE = 6;

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function esCorreoValido(correo: string): boolean {
    return FORMATO_CORREO.test(correo);
}

export function mensajeErrorAuth(error: unknown): string {
    let codigo = '';
    if (error instanceof FirebaseError) {
        codigo = error.code;
    }
    if (codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password' || codigo === 'auth/user-not-found') {
        return 'Correo o contraseña incorrectos.';
    } else if (codigo === 'auth/invalid-email') {
        return 'El correo electrónico no es válido.';
    } else if (codigo === 'auth/email-already-in-use') {
        return 'Ya existe una cuenta con este correo.';
    } else if (codigo === 'auth/weak-password' || codigo === 'auth/password-does-not-meet-requirements') {
        return 'La contraseña debe tener al menos 6 caracteres.';
    } else if (codigo === 'auth/too-many-requests') {
        return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    } else if (codigo === 'auth/network-request-failed') {
        return 'No hay conexión. Revisa tu red e inténtalo de nuevo.';
    } else if (codigo === 'auth/operation-not-allowed') {
        return 'El acceso con correo y contraseña no está habilitado en Firebase.';
    }
    return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

@Injectable({ providedIn: 'root' })
export class Auth implements OnDestroy {
    readonly usuario = signal<User | null>(null);
    readonly resuelto = signal(false);

    private readonly cancelar: Unsubscribe;

    constructor() {
        this.cancelar = onAuthStateChanged(auth, (usuario) => {
            this.usuario.set(usuario);
            this.resuelto.set(true);
        });
    }

    ngOnDestroy(): void {
        this.cancelar();
    }

    esperarEstadoInicial(): Promise<void> {
        return auth.authStateReady();
    }

    usuarioActual(): User | null {
        return auth.currentUser;
    }

    async ingresar(correo: string, clave: string): Promise<User> {
        const credencial = await signInWithEmailAndPassword(auth, correo, clave);
        return credencial.user;
    }

    async registrar(correo: string, clave: string): Promise<User> {
        const credencial = await createUserWithEmailAndPassword(auth, correo, clave);
        return credencial.user;
    }

    salir(): Promise<void> {
        return signOut(auth);
    }

    nombreVisible(): string {
        const usuario = this.usuario();
        if (usuario === null) {
            return '';
        }
        if (usuario.displayName !== null && usuario.displayName.trim() !== '') {
            return usuario.displayName.trim().split(' ')[0];
        }
        if (usuario.email === null) {
            return 'Cliente';
        }
        const parteLocal = usuario.email.split('@')[0];
        const primera = parteLocal.split(/[._\-+0-9]/)[0];
        if (primera === '') {
            return parteLocal;
        }
        return primera.charAt(0).toUpperCase() + primera.slice(1);
    }
}