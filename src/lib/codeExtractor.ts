import { Message } from '@/hooks/useChat';
import { CodeFile } from '@/components/code/CodePreview';

// Extracts code blocks from markdown content
export function extractCodeBlocks(messages: Message[]): CodeFile[] {
  const codeBlockRegex = /```(\w+)?\s*(?:\n|$)([\s\S]*?)```/g;
  const files: CodeFile[] = [];
  let fileCounter = 1;

  // Process only assistant messages
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  for (const message of assistantMessages) {
    let match;
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'text';
      const content = match[2].trim();
      
      if (content.length > 0) {
        // Try to extract filename from the content or previous line
        let filename = extractFilename(message.content, match.index) || 
                       `code${fileCounter}.${getExtension(language)}`;
        
        // Avoid duplicates - update if same name exists
        const existingIndex = files.findIndex(f => f.name === filename);
        if (existingIndex >= 0) {
          files[existingIndex] = { name: filename, language: mapLanguage(language), content };
        } else {
          files.push({ name: filename, language: mapLanguage(language), content });
          fileCounter++;
        }
      }
    }
  }

  return files;
}

function extractFilename(content: string, codeBlockIndex: number): string | null {
  // Look for common patterns before the code block
  const beforeBlock = content.slice(Math.max(0, codeBlockIndex - 200), codeBlockIndex);
  
  // Pattern: filename.ext or path/to/filename.ext
  const patterns = [
    /(?:file|create|update|in)\s*[:`]?\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)/i,
    /`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)`/,
    /([a-zA-Z0-9_\-]+\.[a-zA-Z]+)\s*:?\s*$/m,
  ];

  for (const pattern of patterns) {
    const match = beforeBlock.match(pattern);
    if (match) {
      // Get just the filename, not the full path
      const parts = match[1].split('/');
      return parts[parts.length - 1];
    }
  }

  return null;
}

function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    typescript: 'tsx',
    tsx: 'tsx',
    ts: 'ts',
    javascript: 'js',
    jsx: 'jsx',
    js: 'js',
    python: 'py',
    css: 'css',
    html: 'html',
    json: 'json',
    sql: 'sql',
    bash: 'sh',
    shell: 'sh',
    markdown: 'md',
  };
  return extensions[language.toLowerCase()] || 'txt';
}

function mapLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
  };
  return languageMap[language.toLowerCase()] || language.toLowerCase();
}
