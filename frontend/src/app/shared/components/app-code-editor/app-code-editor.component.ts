import {
  Component,
  EventEmitter,
  Input,
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
    >
      <div
        *ngIf="showPlaceholder && placeholder"
        class="absolute inset-0 p-3 text-sm text-gray-400 dark:text-gray-500 pointer-events-none select-none whitespace-pre-wrap z-10 bg-white dark:bg-[#131b2e]"
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
    this.showPlaceholder = !val;
  }
  @Input() set language(lang: string) {
    this.model = { ...this.model, language: this.normalizeLanguage(lang) };
  }
  @Input() readOnly: boolean = false;
  @Input() height: string = '280px';
  @Input() minHeight: string = '160px';
  @Input() maxHeight: string = '800px';
  @Input() placeholder: string = '';

  @Output() codeChange = new EventEmitter<string>();

  currentTheme: string = 'vs';
  showPlaceholder: boolean = true;
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

  ngOnInit(): void {
    this.editorOptions.readOnly = this.readOnly;
    this.showPlaceholder = !this.model.value;
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

  onEditorLoaded(editor: any): void {
    this.editorInstance = editor;

    // Esconde o placeholder assim que o utilizador clica no editor
    if (editor?.onDidFocusEditorText) {
      editor.onDidFocusEditorText(() => {
        this.showPlaceholder = false;
      });
    }
    if (editor?.onDidBlurEditorText) {
      editor.onDidBlurEditorText(() => {
        this.showPlaceholder = !this.model.value;
      });
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
    this.showPlaceholder = !value;
    this.codeChange.emit(value);
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
