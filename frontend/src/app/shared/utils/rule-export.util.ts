import * as yaml from 'js-yaml';

export type ExportFormat = 'yml' | 'json' | 'xml';

/**
 * Utilitário partilhado para exportação de regras Sigma nos formatos YML, JSON e XML.
 */
export function exportRuleFormatted(
  ruleId: number | string,
  ruleTitle: string,
  rawCode: string,
  format: ExportFormat = 'yml'
): void {
  const content = rawCode || '';
  if (!content.trim()) {
    console.warn('A regra não possui conteúdo para exportar.');
    return;
  }

  const sanitizedTitle = (ruleTitle || 'rule')
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_');

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `RedRule${ruleId}_${sanitizedTitle}_${dateStr}.${format}`;

  let exportData = content;
  let mimeType = 'text/yaml;charset=utf-8';

  if (format === 'json') {
    mimeType = 'application/json;charset=utf-8';
    try {
      const parsed = yaml.load(content);
      exportData = JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.warn('Falha ao converter YAML para JSON, exportando formato básico:', e);
      exportData = JSON.stringify({ title: ruleTitle, code: content }, null, 2);
    }
  } else if (format === 'xml') {
    mimeType = 'application/xml;charset=utf-8';
    try {
      const parsed = yaml.load(content);
      const xmlBody = objectToXml(parsed, 'sigma_rule');
      exportData = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
    } catch (e) {
      console.warn('Falha ao converter YAML para XML, exportando formato básico:', e);
      exportData = `<?xml version="1.0" encoding="UTF-8"?>\n<sigma_rule>\n  <title>${escapeXml(ruleTitle)}</title>\n  <code><![CDATA[${content}]]></code>\n</sigma_rule>`;
    }
  }

  const blob = new Blob([exportData], { type: mimeType });
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function objectToXml(obj: any, tag: string = 'root', indent: string = ''): string {
  if (obj === null || obj === undefined) {
    return `${indent}<${tag}/>`;
  }
  if (typeof obj !== 'object') {
    return `${indent}<${tag}>${escapeXml(obj)}</${tag}>`;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => objectToXml(item, 'item', indent))
      .join('\n');
  }

  const nextIndent = indent + '  ';
  const children = Object.keys(obj)
    .map((k) => {
      const cleanTag = k.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'field';
      const val = obj[k];
      if (Array.isArray(val)) {
        const arrayItems = val.map((item) => objectToXml(item, 'item', nextIndent + '  ')).join('\n');
        return `${nextIndent}<${cleanTag}>\n${arrayItems}\n${nextIndent}</${cleanTag}>`;
      }
      return objectToXml(val, cleanTag, nextIndent);
    })
    .join('\n');

  return `${indent}<${tag}>\n${children}\n${indent}</${tag}>`;
}

