import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, Subject, map } from 'rxjs';
import { io, type Socket } from 'socket.io-client';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatUser {
  _id: string;
  name: string;
}

export interface ChatMessage {
  _id: string;
  room: string;
  user: ChatUser;
  text: string;
  timestamp: string;
}

export interface ChatError {
  message: string;
}

interface ChatUsersResponse {
  users: ChatUser[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  // Guardamos una sola conexión para que los componentes compartan el mismo socket.
  private socket: Socket | null = null;

  // Indica si el socket está conectado. El componente podrá observar este estado.
  private readonly connectionState = new BehaviorSubject<boolean>(false);
  readonly connectionStatus$ = this.connectionState.asObservable();

  // Permite que la interfaz pueda mostrar errores de conexión.
  private readonly connectionErrorSubject = new Subject<Error>();
  readonly connectionError$ = this.connectionErrorSubject.asObservable();

  // El servidor envía el historial solo al cliente que acaba de entrar en una sala.
  private readonly historySubject = new Subject<ChatMessage[]>();
  readonly history$ = this.historySubject.asObservable();

  // Los mensajes nuevos se emiten a todos los clientes conectados a la sala.
  private readonly messageSubject = new Subject<ChatMessage>();
  readonly messages$ = this.messageSubject.asObservable();

  // Errores funcionales enviados por el backend (por ejemplo, sala no válida).
  private readonly chatErrorSubject = new Subject<ChatError>();
  readonly chatError$ = this.chatErrorSubject.asObservable();

  getUsers(): Observable<ChatUser[]> {
    // El interceptor HTTP añade el access token a esta petición protegida.
    return this.http
      .get<ChatUsersResponse>(`${environment.apiUrl}/users`, { params: { limit: 100 } })
      .pipe(map((response) => response.users));
  }

  connect(): void {
    // Evita crear otra conexión si ya hay un socket.
    if (this.socket) {
      return;
    }

    // AuthService obtiene el token que se guardó al iniciar sesión.
    const token = this.authService.getToken();

    if (!token) {
      throw new Error('No hay un token de sesión para conectar al chat.');
    }

    // Desactivamos la conexión automática para registrar primero los eventos.
    this.socket = io(environment.socketUrl, {
      autoConnect: false,

      // Socket.IO enviará este objeto durante el handshake con el servidor.
      auth: { token },
    });

    this.socket.on('connect', () => {
      this.connectionState.next(true);
    });

    this.socket.on('disconnect', () => {
      this.connectionState.next(false);
    });

    this.socket.on('connect_error', (error) => {
      this.connectionErrorSubject.next(error);
    });

    this.socket.on('chat:history', (messages: ChatMessage[]) => {
      this.historySubject.next(messages);
    });

    this.socket.on('chat:message', (message: ChatMessage) => {
      this.messageSubject.next(message);
    });

    this.socket.on('chat:error', (error: ChatError) => {
      this.chatErrorSubject.next(error);
    });

    // Inicia la conexión después de configurar sus eventos.
    this.socket.connect();
  }

  joinRoom(room: string): void {
    // El contrato exige entrar en la sala antes de solicitar historial o enviar mensajes.
    this.emit('chat:join', { room });
  }

  sendMessage(room: string, text: string): void {
    // El servidor obtiene el autor del JWT; el cliente solo envía sala y texto.
    this.emit('chat:message', { room, text });
  }

  listen<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const socket = this.socket;

      if (!socket) {
        subscriber.error(
          new Error('Primero debes conectar el servicio de chat.'),
        );
        return;
      }

      // El Observable recibe los datos cuando llega el evento indicado.
      const handler = (data: T) => subscriber.next(data);
      socket.on(eventName, handler);

      // Al cancelar la suscripción, dejamos de escuchar este evento.
      return () => socket.off(eventName, handler);
    });
  }

  emit<T>(eventName: string, payload: T): void {
    if (!this.socket?.connected) {
      throw new Error('No se puede enviar el mensaje: el chat no está conectado.');
    }

    // El nombre y los datos del evento deberán coincidir con el contrato del backend.
    this.socket.emit(eventName, payload);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionState.next(false);
  }
}