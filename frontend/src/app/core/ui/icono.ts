import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, effect, inject, input } from '@angular/core';
import {
  ArrowDown,
  Building2,
  Info,
  ImageUp,
  CalendarHeart,
  Camera,
  ArrowUp,
  CalendarCheck,
  CalendarDays,
  LogOut,
  Delete,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudCheck,
  Download,
  Eraser,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  Users,
  Wand,
  X,
  Sun,
  Moon,
  SunMoon,
  FileUp,
  Rows2,
  TriangleAlert,
  ArrowRight,
  RotateCcw,
  type IconNode,
} from 'lucide';

const ICONOS = {
  ArrowDown,
  Building2,
  Info,
  ImageUp,
  CalendarHeart,
  Camera,
  ArrowUp,
  CalendarCheck,
  CalendarDays,
  LogOut,
  Delete,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudCheck,
  Download,
  Eraser,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserMinus,
  UserPlus,
  Users,
  Wand,
  X,
  Sun,
  Moon,
  SunMoon,
  FileUp,
  Rows2,
  TriangleAlert,
  ArrowRight,
  RotateCcw,
} satisfies Record<string, IconNode>;

export type NombreIcono = keyof typeof ICONOS;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ícono Lucide dibujado como SVG en línea, con trazo uniforme. */
@Component({
  selector: 'app-icono',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none' },
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input(20);
  readonly trazo = input(2);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    effect(() => this.dibujar(ICONOS[this.nombre()], this.tamano(), this.trazo()));
  }

  private dibujar(nodos: IconNode, tamano: number, trazo: number): void {
    const r = this.renderer;
    const svg = r.createElement('svg', SVG_NS) as SVGElement;
    const atributos: Record<string, string> = {
      width: String(tamano),
      height: String(tamano),
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': String(trazo),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    };
    Object.entries(atributos).forEach(([k, v]) => r.setAttribute(svg, k, v));

    for (const [etiqueta, attrs] of nodos) {
      const hijo = r.createElement(etiqueta, SVG_NS);
      Object.entries(attrs).forEach(([k, v]) => r.setAttribute(hijo, k, String(v)));
      r.appendChild(svg, hijo);
    }

    const el = this.host.nativeElement;
    el.replaceChildren(svg);
  }
}
