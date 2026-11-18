import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PanelAcceso } from '../panel-acceso/panel-acceso';
import { Auth, LONGITUD_MINIMA_CLAVE, esCorreoValido, mensajeErrorAuth } from '../servicios/auth';
import { destinoSeguro } from '../servicios/auth-guard';
import { EstadoTienda } from '../servicios/estado-tienda';

@Component({
  selector: 'app-crear-cuenta',
  imports: [FormsModule, RouterLink, PanelAcceso],
  templateUrl: './crear-cuenta.html',
  styleUrl: './crear-cuenta.scss'
})
export class CrearCuenta {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly estadoTienda = inject(EstadoTienda);

  readonly volver = input<string>();

  correo = '';
  clave = '';
  confirmacion = '';
  readonly msg = signal('');
  readonly cargando = signal(false);
  readonly mostrarClave = signal(false);
  readonly mostrarConfirmacion = signal(false);

  tipoCampo(visible: boolean): string {
    if (visible) {
      return 'text';
    }
    return 'password';
  }

  textoOjo(visible: boolean): string {
    if (visible) {
      return 'Ocultar contraseña';
    }
    return 'Mostrar contraseña';
  }

  alternarClave(): void {
    this.mostrarClave.update((visible) => !visible);
  }

  alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((visible) => !visible);
  }

  parametrosRetorno(): Record<string, string> {
    const volver = this.volver();
    if (volver === undefined || volver === '') {
      return {};
    }
    return { volver };
  }

  async handleRegister(): Promise<void> {
    if (this.cargando()) {
      return;
    }
    const correo = this.correo.trim();
    if (correo === '' || this.clave === '' || this.confirmacion === '') {
      this.msg.set('Completa el correo, la contraseña y su confirmación.');
      return;
    }
    if (!esCorreoValido(correo)) {
      this.msg.set('El correo electrónico no es válido.');
      return;
    }
    if (this.clave.length < LONGITUD_MINIMA_CLAVE) {
      this.msg.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.clave !== this.confirmacion) {
      this.msg.set('Las contraseñas no coinciden.');
      return;
    }
    this.msg.set('');
    this.cargando.set(true);
    try {
      await this.auth.registrar(correo, this.clave);
      await this.router.navigateByUrl(destinoSeguro(this.router, this.volver()));
    } catch (error) {
      this.msg.set(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
