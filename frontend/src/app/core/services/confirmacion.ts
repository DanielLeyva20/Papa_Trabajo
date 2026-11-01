import { Injectable, signal } from '@angular/core';

export interface PedidoConfirmacion {
  titulo: string;
  mensaje: string;
  aceptar: string;
  peligro?: boolean;
}

interface PedidoActivo extends PedidoConfirmacion {
  responder: (respuesta: boolean) => void;
}

/** Preguntas de sí/no antes de acciones que no se pueden deshacer fácilmente. */
@Injectable({ providedIn: 'root' })
export class Confirmacion {
  readonly activo = signal<PedidoActivo | null>(null);

  preguntar(pedido: PedidoConfirmacion): Promise<boolean> {
    this.activo()?.responder(false);
    return new Promise((resolve) => {
      this.activo.set({
        ...pedido,
        responder: (respuesta) => {
          this.activo.set(null);
          resolve(respuesta);
        },
      });
    });
  }
}
