import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { normalizeSearchText } from '../../../helper/search-utils';

@Component({
  selector: 'app-tag-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagComboboxComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative w-full text-left" #container>
      <!-- Caixa Principal de Input e Badges -->
      <div
        class="min-h-[46px] w-full rounded-lg border bg-white dark:bg-gray-700 px-3 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text transition-all duration-150 shadow-sm"
        [ngClass]="{
          'border-red-500 ring-1 ring-red-500': isInvalid && touched,
          'border-blue-600 ring-2 ring-blue-500/20 dark:border-blue-500 dark:ring-blue-500/30': isOpen,
          'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500':
            !isOpen && (!isInvalid || !touched),
          'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800': disabled
        }"
        (click)="onContainerClick($event)"
      >
        <!-- Tags Selecionadas -->
        <span
          *ngFor="let item of selectedItems"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 transition-colors shadow-xs"
        >
          <span
            class="max-w-[260px] sm:max-w-[380px] truncate select-none"
            [title]="item"
          >
            {{ item }}
          </span>
          <button
            *ngIf="!disabled"
            type="button"
            (click)="removeItem(item, $event)"
            class="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded p-0.5 transition"
            title="Remover"
          >
            <i class="fas fa-times text-[10px]"></i>
          </button>
        </span>

        <!-- Input de Texto para Escrever / Filtrar -->
        <div class="flex-1 min-w-[160px] flex items-center">
          <input
            #textInput
            type="text"
            [id]="id"
            [disabled]="disabled"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            (focus)="onInputFocus()"
            (keydown)="onKeyDown($event)"
            [placeholder]="
              selectedItems.length === 0
                ? placeholder
                : '+ Escreva para procurar...'
            "
            class="w-full bg-transparent border-0 p-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 leading-6"
          />
        </div>

        <!-- Botões de Ação à Direita -->
        <div
          class="flex items-center gap-1 ml-auto pl-1 flex-shrink-0"
          (click)="$event.stopPropagation()"
        >
          <button
            *ngIf="selectedItems.length > 0 && !disabled"
            type="button"
            (click)="clearAll($event)"
            title="Limpar seleção"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-xs transition"
          >
            <i class="fas fa-times"></i>
          </button>
          <button
            type="button"
            [disabled]="disabled"
            (click)="toggleDropdown($event)"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-xs transition focus:outline-none"
            title="Abrir/Fechar lista"
          >
            <i
              class="fas fa-chevron-down transition-transform duration-200"
              [ngClass]="{ 'rotate-180': isOpen }"
            ></i>
          </button>
        </div>
      </div>

      <!-- Painel Dropdown Flutuante -->
      <div
        *ngIf="isOpen"
        class="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden text-sm"
      >
        <!-- Cabeçalho Informativo -->
        <div
          class="px-3.5 py-2 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <span *ngIf="filteredItems.length > 0">
            {{ filteredItems.length }} opção(ões)
            <span *ngIf="selectedItems.length > 0">
              ({{ selectedItems.length }} selecionada(s))
            </span>
          </span>
          <span *ngIf="filteredItems.length === 0">
            Nenhuma opção correspondente
          </span>
          <span class="text-[11px] text-gray-400 hidden sm:inline">
            <kbd class="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[10px]">Enter</kbd> seleciona • <kbd class="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-[10px]">↑↓</kbd> navega
          </span>
        </div>

        <!-- Lista Rolável de Opções -->
        <div
          #optionsList
          class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40 py-1"
        >
          <div
            *ngFor="let item of displayItems; let i = index"
            [id]="uniqueId + '-opt-' + i"
            (mouseenter)="activeIndex = i"
            (click)="toggleItem(item, $event)"
            class="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition select-none"
            [ngClass]="{
              'bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium':
                isSelected(item),
              'bg-gray-100/80 dark:bg-gray-700/80':
                activeIndex === i && !isSelected(item),
              'hover:bg-gray-100 dark:hover:bg-gray-700/70 text-gray-800 dark:text-gray-200':
                !isSelected(item) && activeIndex !== i
            }"
          >
            <div class="flex items-center gap-2 truncate">
              <!-- Indicador de seleção -->
              <span
                class="w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0"
                [ngClass]="{
                  'bg-blue-600 border-blue-600 text-white': isSelected(item),
                  'border-gray-300 dark:border-gray-600': !isSelected(item)
                }"
              >
                <i *ngIf="isSelected(item)" class="fas fa-check"></i>
              </span>
              <span class="truncate">{{ item }}</span>
            </div>

            <span
              *ngIf="activeIndex === i"
              class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold flex-shrink-0"
            >
              Enter
            </span>
          </div>

          <!-- Limite de visualização para manter performance rápida -->
          <div
            *ngIf="filteredItems.length > maxDisplayItems"
            class="px-3 py-2 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/40 italic"
          >
            A mostrar as primeiras {{ maxDisplayItems }} de {{ filteredItems.length }} opções. Escreva para refinar a pesquisa.
          </div>

          <!-- Estado Vazio (quando não existe nenhuma correspondência) -->
          <div
            *ngIf="filteredItems.length === 0"
            class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-xs"
          >
            <i class="fas fa-exclamation-circle text-amber-500 text-base mb-1.5 block"></i>
            <span class="font-medium">Nenhuma opção encontrada para "<strong>{{ searchQuery }}</strong>"</span>
            <p class="text-[11px] text-gray-400 mt-1">Apenas opções válidas do catálogo podem ser selecionadas.</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TagComboboxComponent implements ControlValueAccessor, OnChanges {
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  @ViewChild('textInput') textInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('optionsList') optionsListRef!: ElementRef<HTMLElement>;

  @Input() items: string[] = [];
  @Input() allItems?: string[]; // Catálogo completo (para permitir pesquisar técnicas mesmo que um filtro esteja ativo)
  @Input() placeholder: string = 'Selecione ou escreva...';
  @Input() allowCustom: boolean = false; // Não permite itens inventados/personalizados
  @Input() disabled: boolean = false;
  @Input() id: string = '';
  @Input() isInvalid: boolean = false;

  @Output() selectionChange = new EventEmitter<string[]>();

  selectedItems: string[] = [];
  filteredItems: string[] = [];
  searchQuery: string = '';
  isOpen: boolean = false;
  touched: boolean = false;
  activeIndex: number = -1;
  maxDisplayItems: number = 100;
  uniqueId: string = 'combobox-' + Math.random().toString(36).substring(2, 9);

  private onChange: (value: string[]) => void = () => {};
  private onTouchedCallback: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] || changes['allItems']) {
      this.applyFilter();
    }
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    if (Array.isArray(value)) {
      this.selectedItems = value
        .map((v) =>
          typeof v === 'string'
            ? v
            : v?.display || v?.value || v?.name || String(v),
        )
        .filter(Boolean);
    } else if (typeof value === 'string' && value.trim()) {
      const clean = value.replace(/[{}]/g, '');
      this.selectedItems = clean
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      this.selectedItems = [];
    }
    this.applyFilter();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.isOpen = false;
    }
  }

  // Filtragem Inteligente e Ordenação por Relevância
  applyFilter(): void {
    const rawTerm = this.searchQuery.trim();
    const term = normalizeSearchText(rawTerm);

    // Quando o utilizador está a escrever uma pesquisa ativa, usa o catálogo completo (se disponível)
    const sourceList =
      term && this.allItems && this.allItems.length > 0
        ? this.allItems
        : this.items || [];

    if (!term) {
      this.filteredItems = [...sourceList];
      this.activeIndex = this.filteredItems.length > 0 ? 0 : -1;
      return;
    }

    const exactIdMatch: string[] = [];
    const prefixIdMatch: string[] = [];
    const prefixNameMatch: string[] = [];
    const otherMatches: string[] = [];

    for (const item of sourceList) {
      const norm = normalizeSearchText(item);
      const parts = norm.split(' - ');
      const itemId = parts[0]?.trim();
      const itemName = parts.slice(1).join(' - ').trim();

      if (itemId === term) {
        // Correspondência exata de ID (Ex: "T1687" corresponde exatamente ao ID "T1687")
        exactIdMatch.push(item);
      } else if (itemId.startsWith(term)) {
        // ID começa pelo termo digitado (Ex: "T16" -> "T1687")
        prefixIdMatch.push(item);
      } else if (itemName.startsWith(term)) {
        // Nome começa pelo termo digitado
        prefixNameMatch.push(item);
      } else if (norm.includes(term)) {
        // Termo consta algures na string
        otherMatches.push(item);
      }
    }

    this.filteredItems = [
      ...exactIdMatch,
      ...prefixIdMatch,
      ...prefixNameMatch,
      ...otherMatches,
    ];

    this.activeIndex = this.filteredItems.length > 0 ? 0 : -1;
  }

  get displayItems(): string[] {
    return this.filteredItems.slice(0, this.maxDisplayItems);
  }

  isSelected(item: string): boolean {
    const norm = normalizeSearchText(item);
    return this.selectedItems.some((s) => normalizeSearchText(s) === norm);
  }

  // Seleciona ou remove opção ao clicar
  toggleItem(item: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const norm = normalizeSearchText(item);
    const existingIndex = this.selectedItems.findIndex(
      (s) => normalizeSearchText(s) === norm,
    );

    if (existingIndex >= 0) {
      this.selectedItems.splice(existingIndex, 1);
    } else {
      this.selectedItems.push(item);
    }

    this.emitChange();
    this.searchQuery = '';
    this.applyFilter();
    this.focusTextInput();
  }

  // Seleção direta (ex: quando o utilizador prime Enter)
  selectItem(item: string): void {
    const norm = normalizeSearchText(item);
    if (!this.selectedItems.some((s) => normalizeSearchText(s) === norm)) {
      this.selectedItems.push(item);
      this.emitChange();
    }
    this.searchQuery = '';
    this.isOpen = false;
    this.applyFilter();
    this.focusTextInput();
  }

  removeItem(item: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const norm = normalizeSearchText(item);
    this.selectedItems = this.selectedItems.filter(
      (s) => normalizeSearchText(s) !== norm,
    );
    this.emitChange();
  }

  clearAll(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedItems = [];
    this.searchQuery = '';
    this.applyFilter();
    this.emitChange();
  }

  onSearchChange(): void {
    this.applyFilter();
    if (!this.isOpen) {
      this.isOpen = true;
    }
  }

  onInputFocus(): void {
    this.isOpen = true;
    this.applyFilter();
  }

  onContainerClick(event: MouseEvent): void {
    if (this.disabled) return;
    this.isOpen = true;
    this.focusTextInput();
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.applyFilter();
      this.focusTextInput();
    } else {
      this.markTouched();
    }
  }

  // Gestão de Teclado: Enter, Setas Cima/Baixo, Backspace, Esc
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Apenas funciona se existir pelo menos uma opção correspondente válida
      if (this.filteredItems.length > 0) {
        const target =
          this.activeIndex >= 0 && this.activeIndex < this.displayItems.length
            ? this.displayItems[this.activeIndex]
            : this.filteredItems[0];

        if (target) {
          this.selectItem(target);
        }
      }
      // Se não houver correspondência, não faz nada (bloqueia adições personalizadas não existentes)
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isOpen) {
        this.isOpen = true;
        this.applyFilter();
        return;
      }
      if (this.displayItems.length > 0) {
        this.activeIndex = (this.activeIndex + 1) % this.displayItems.length;
        this.scrollActiveIntoView();
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.isOpen && this.displayItems.length > 0) {
        this.activeIndex =
          (this.activeIndex - 1 + this.displayItems.length) %
          this.displayItems.length;
        this.scrollActiveIntoView();
      }
      return;
    }

    if (
      event.key === 'Backspace' &&
      !this.searchQuery &&
      this.selectedItems.length > 0
    ) {
      this.selectedItems.pop();
      this.emitChange();
      return;
    }

    if (event.key === 'Escape') {
      this.isOpen = false;
      this.markTouched();
      return;
    }
  }

  private scrollActiveIntoView(): void {
    setTimeout(() => {
      const el = document.getElementById(
        this.uniqueId + '-opt-' + this.activeIndex,
      );
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private focusTextInput(): void {
    setTimeout(() => {
      this.textInputRef?.nativeElement?.focus();
    });
  }

  private emitChange(): void {
    const copy = [...this.selectedItems];
    this.onChange(copy);
    this.selectionChange.emit(copy);
  }

  private markTouched(): void {
    if (!this.touched) {
      this.touched = true;
      this.onTouchedCallback();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.isOpen &&
      this.containerRef &&
      !this.containerRef.nativeElement.contains(event.target as Node)
    ) {
      this.isOpen = false;
      this.markTouched();
    }
  }
}
