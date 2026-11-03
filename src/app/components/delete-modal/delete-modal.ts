import { Component, input, output } from '@angular/core';

// Modal para borrar con dos opciones distintas, que el padre manda a peticiones distintas:
//   softDelete  borrado lógico: la API solo marca isDeleted, el dato sigue en la base de datos
//   hardDelete  borrado definitivo: la API lo elimina de la base de datos para siempre
@Component({
  selector: 'app-delete-modal',
  imports: [],
  templateUrl: './delete-modal.html',
  styleUrl: './delete-modal.css',
})
export class DeleteModal {
  open = input<boolean>(false);
  // Nombre de lo que se va a borrar (ejercicio, rutina o usuario)
  itemName = input<string>('');
  // Cuántos elementos se borran: con más de uno el título habla del grupo, no de un nombre
  count = input<number>(1);
  // Aviso extra que depende de la entidad (por ejemplo, que un ejercicio sale de sus rutinas)
  hardNote = input<string>('');
  // Si ya está borrado lógicamente, no se ofrece borrarlo lógicamente otra vez
  allowSoft = input<boolean>(true);
  // Mientras se envía la petición se desactivan los botones para no borrar dos veces
  busy = input<boolean>(false);

  softDelete = output<void>();
  hardDelete = output<void>();
  cancelled = output<void>();
}
