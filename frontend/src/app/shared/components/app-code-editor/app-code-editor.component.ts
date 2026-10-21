import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeEditorModule, CodeModel } from '@ngstack/code-editor';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule, CodeEditorModule],
  template: `
    <div
      class="relative w-full resize-y overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm"
      [style.height]="height"
      [style.min-height]="minHeight"
      [style.max-height]="maxHeight"
      (mousedown)="onWrapperMousedown($event)"
    >
      <!-- Placeholder: visível apenas enquanto não há foco e o editor está vazio.
           Fica por cima visualmente mas o mousedown no wrapper já captura o foco
           no Monaco antes do browser processar o click, pelo que o overlay some
           na mesma tick e o cursor do Monaco aparece imediatamente. -->
      <div
        *ngIf="showPlaceholder && placeholder"
        class="absolute inset-0 p-3 font-mono text-sm text-gray-400 dark:text-gray-500 whitespace-pre-wrap z-10 bg-white dark:bg-[#131b2e] cursor-text overflow-auto pointer-events-none select-none"
      >{{ placeholder }}</div>

      <ngs-code-editor
        class="w-full h-full block"
        [theme]="currentTheme"
        [codeModel]="model"
        [options]="editorOptions"
        (loaded)="onEditorLoaded($event)"
        (valueChanged)="onValueChanged($event)"
      >
      </ngs-code-editor>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .resize-y {
        resize: vertical !important;
      }
      .resize-y::-webkit-resizer {
        border-width: 8px;
        border-style: solid;
        border-color: transparent #6b7280 #6b7280 transparent;
      }
    `,
  ],
})
export class AppCodeEditorComponent implements OnInit, OnDestroy {
  @Input() set code(val: string) {
    if (val !== this.model.value) {
      this.model = { ...this.model, value: val || '' };
    }
    this.updatePlaceholderVisibility();
  }
  @Input() set language(lang: string) {
    this.model = { ...this.model, language: this.normalizeLanguage(lang) };
  }
  @Input() readOnly: boolean = false;
  @Input() height: string = '280px';
  @Input() minHeight: string = '160px';
  @Input() maxHeight: string = '800px';

  private _placeholder: string = '';
  @Input() set placeholder(val: string) {
    this._placeholder = val || '';
    this.updatePlaceholderVisibility();
  }
  get placeholder(): string {
    return this._placeholder;
  }

  @Output() codeChange = new EventEmitter<string>();

  currentTheme: string = 'vs';
  showPlaceholder: boolean = true;
  private isFocused: boolean = false;
  private themeObserver!: MutationObserver;
  private editorInstance: any;

  model: CodeModel = {
    value: '',
    language: 'yaml',
    uri: `editor-${Math.random().toString(36).substring(2, 9)}`,
  };

  editorOptions = {
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    scrollbar: {
      alwaysConsumeMouseWheel: false,
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    readOnly: false,
  };

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.editorOptions.readOnly = this.readOnly;
    this.updatePlaceholderVisibility();
    this.detectTheme();

    this.themeObserver = new MutationObserver(() => this.detectTheme());
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  ngOnDestroy(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  focusEditor(): void {
    if (this.editorInstance) {
      this.editorInstance.focus();
      if (!this.model.value || this.model.value.trim() === '') {
        try {
          this.editorInstance.setPosition({ lineNumber: 1, column: 1 });
        } catch (_) {}
      }
    }
    this.isFocused = true;
    this.updatePlaceholderVisibility();
  }

  /** Captura o mousedown na wrapper div para focar o Monaco ANTES do click propagar.
   *  Isso faz com que o placeholder desapareça na mesma tick e o cursor Monaco
   *  apareça imediatamente, tal como um textarea normal. */
  onWrapperMousedown(event: MouseEvent): void {
    if (this.editorInstance) {
      // Não cancelamos o evento — deixamos o Monaco receber o click normalmente.
      // Apenas antecipamos o foco para que o Angular já processe a mudança.
      this.ngZone.run(() => {
        this.isFocused = true;
        this.updatePlaceholderVisibility();
      });
      // Foca o editor; o Monaco posiciona o cursor no local clicado por conta própria.
      this.editorInstance.focus();
    }
  }

  onEditorLoaded(editor: any): void {
    this.editorInstance = editor;

    const onFocus = () => {
      this.ngZone.run(() => {
        this.isFocused = true;
        this.updatePlaceholderVisibility();
      });
    };

    const onBlur = () => {
      this.ngZone.run(() => {
        this.isFocused = false;
        this.updatePlaceholderVisibility();
      });
    };

    if (editor?.onDidFocusEditorWidget) {
      editor.onDidFocusEditorWidget(onFocus);
    }
    if (editor?.onDidFocusEditorText) {
      editor.onDidFocusEditorText(onFocus);
    }
    if (editor?.onDidBlurEditorWidget) {
      editor.onDidBlurEditorWidget(onBlur);
    }
    if (editor?.onDidBlurEditorText) {
      editor.onDidBlurEditorText(onBlur);
    }

    if (this.isFocused && editor?.focus) {
      editor.focus();
    }

    const monaco = (window as any).monaco;
    if (monaco) {
      // Registo do tema escuro alinhado com o Dark Mode da aplicação
      monaco.editor.defineTheme('redshift-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#131b2e', // Tom dark navy/slate integrado
          'editorGutter.background': '#131b2e',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#cbd5e1',
          'editor.lineHighlightBackground': '#1e293b50',
          'editorCursor.foreground': '#f87171', // Cor do cursor combinada com a identidade
        },
      });

      this.detectTheme();
    }
  }

  onValueChanged(value: string): void {
    this.model.value = value;
    this.updatePlaceholderVisibility();
    this.codeChange.emit(value);
  }

  private updatePlaceholderVisibility(): void {
    const hasText = !!(this.model.value && this.model.value.trim().length > 0);
    this.showPlaceholder = !this.isFocused && !hasText && !!this.placeholder;
    this.cdr.markForCheck();
  }

  private detectTheme(): void {
    const isDark = document.documentElement.classList.contains('dark');
    this.currentTheme = isDark ? 'redshift-dark' : 'vs';

    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      monaco.editor.setTheme(this.currentTheme);
    }
  }

  private normalizeLanguage(syntax: string): string {
    switch (syntax?.toLowerCase()) {
      case 'spl (splunk)':
      case 'spl2 (splunk)':
      case 'aql (qradar)':
      case 'kql (sentinel)':
      case 'eql (elastic)':
      case 'cql (crowdstrike)':
      case 'sql':
        return 'sql';
      case 'json':
        return 'json';
      default:
        return 'yaml';
    }
  }
}
