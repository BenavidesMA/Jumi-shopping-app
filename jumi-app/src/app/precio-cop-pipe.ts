import { Pipe, PipeTransform } from '@angular/core';

const formatoCop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

@Pipe({
  name: 'precioCop'
})
export class PrecioCopPipe implements PipeTransform {
  transform(valor: number): string {
    return '$ ' + formatoCop.format(valor);
  }
}
