import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PanelAcceso } from '../panel-acceso/panel-acceso';
import { Auth, esCorreoValido, mensajeErrorAuth } from '../servicios/auth';
import { destinoSeguro } from '../servicios/auth-guard';
import { EstadoTienda } from '../servicios/estado-tienda';

@Component({
  selector: 'app-iniciar-sesion',
  imports: [FormsModule, RouterLink, PanelAcceso],
  templateUrl: './iniciar-sesion.html',
  styleUrl: './iniciar-sesion.scss'
})
export class IniciarSesion {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly estadoTienda = inject(EstadoTienda);

  readonly volver = input<string>();

  correo = '';
  clave = '';
  readonly msg = signal('');
  readonly cargando = signal(false);
  readonly mostrarClave = signal(false);

  tipoClave(): string {
    if (this.mostrarClave()) {
      return 'text';
    }
    return 'password';
  }

  textoOjo(): string {
    if (this.mostrarClave()) {
      return 'Ocultar contraseña';
    }
    return 'Mostrar contraseña';
  }

  alternarClave(): void {
    this.mostrarClave.update((visible) => !visible);
  }

  parametrosRetorno(): Record<string, string> {
    const volver = this.volver();
    if (volver === undefined || volver === '') {
      return {};
    }
    return { volver };
  }

  async handleLogin(): Promise<void> {
    if (this.cargando()) {
      return;
    }
    const correo = this.correo.trim();
    if (correo === '' || this.clave === '') {
      this.msg.set('Ingresa tu correo electrónico y tu contraseña.');
      return;
    }
    if (!esCorreoValido(correo)) {
      this.msg.set('El correo electrónico no es válido.');
      return;
    }
    this.msg.set('');
    this.cargando.set(true);
    try {
      await this.auth.ingresar(correo, this.clave);
      await this.router.navigateByUrl(destinoSeguro(this.router, this.volver()));
    } catch (error) {
      this.msg.set(mensajeErrorAuth(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
