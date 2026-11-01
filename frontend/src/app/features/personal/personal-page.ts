import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CARGO_ETIQUETA } from '../../core/models/dominio';
import { Avatar } from '../../core/ui/avatar';
import { Icono } from '../../core/ui/icono';
import { SelectorMes } from '../../core/ui/selector-mes';
import { EditorAgente } from './componentes/editor-agente';
import { PersonalStore } from './personal.store';

@Component({
  selector: 'app-personal-page',
  imports: [Icono, Avatar, SelectorMes, EditorAgente],
  providers: [PersonalStore],
  templateUrl: './personal-page.html',
  styleUrl: './personal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalPage {
  protected readonly store = inject(PersonalStore);
  protected readonly etiquetaCargo = CARGO_ETIQUETA;
}
