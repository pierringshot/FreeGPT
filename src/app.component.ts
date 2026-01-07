
import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { OutputComponent } from './components/output/output.component';
import { IconComponent } from './ui/icon.component';
import { LlmService, ChatConfig, ChatMessage, CompletionResponse } from './services/llm.service';

const DEFAULT_CONFIG: ChatConfig = {
  baseUrl: 'https://api.typegpt.net/v1',
  apiKey: 'sk-AQ7hKnlCNU1ZF7jELuUjYt5jqN2vFSPetXwxNfOpKwdIqpeu',
  model: 'deepseek-ai/DeepSeek-R1-0528',
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1.0,
  tools: []
};

const DEFAULT_MESSAGES: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful AI assistant.' },
  { role: 'user', content: 'Tell a short joke about programming.' }
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ChatComponent, OutputComponent, IconComponent],
  template: `
    <main class="flex w-full bg-cyber-black overflow-hidden text-cyber-text font-sans relative h-screen supports-[height:100dvh]:h-[100dvh]">
      
      <!-- Hidden File Input for Import -->
      <input type="file" #fileInput hidden (change)="handleFileImport($event)" accept=".json" />

      <!-- Sidebar (Settings) -->
      <aside 
        class="flex-shrink-0 z-40 h-full border-r border-cyber-border bg-cyber-dark transition-all duration-300 md:relative md:block md:inset-auto"
        [class.w-80]="!sidebarCollapsed()"
        [class.w-[60px]]="sidebarCollapsed()"
        [class.hidden]="mobileTab() !== 'settings'"
        [class.flex]="mobileTab() === 'settings'"
        [class.absolute]="mobileTab() === 'settings'"
        [class.inset-0]="mobileTab() === 'settings'"
        [class.w-full]="mobileTab() === 'settings'"
      >
        <div class="w-full h-full md:pb-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <app-sidebar 
            [(config)]="config" 
            [collapsed]="sidebarCollapsed()"
            [isDark]="isDark()"
            (resetToDefaults)="resetState()"
            (loadSaved)="loadState()"
            (saveState)="downloadConfig()"
            (triggerUpload)="fileInput.click()"
            (toggleCollapse)="toggleSidebar()"
            (toggleTheme)="toggleTheme()"
          ></app-sidebar>
        </div>
      </aside>
      
      <!-- Chat Area -->
      <section 
        class="flex-1 min-w-0 z-20 relative h-full bg-cyber-black md:flex md:flex-col transition-all duration-300"
        [class.hidden]="mobileTab() !== 'chat'"
        [class.flex]="mobileTab() === 'chat'"
        [class.flex-col]="mobileTab() === 'chat'"
      >
        <div class="h-full w-full flex flex-col md:pb-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <app-chat 
            [(messages)]="messages" 
            [loading]="isLoading()"
            (runRequest)="handleRunRequest()"
          ></app-chat>
        </div>
      </section>

      <!-- Output Area -->
      <aside 
        class="flex-shrink-0 z-30 border-l border-cyber-border bg-cyber-black h-full transition-all duration-300 xl:relative xl:block xl:w-[450px] xl:inset-auto"
        [class.hidden]="mobileTab() !== 'output'"
        [class.flex]="mobileTab() === 'output'"
        [class.absolute]="mobileTab() === 'output'"
        [class.inset-0]="mobileTab() === 'output'"
        [class.w-full]="mobileTab() === 'output'"
        [class.xl:flex]="true"
      >
        <div class="w-full h-full md:pb-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <app-output 
            [data]="response()" 
            [fullHistory]="messages()"
            [loading]="isLoading()" 
            [error]="error()" 
            [latency]="latency()"
            [responseComplete]="responseComplete()"
          ></app-output>
        </div>
      </aside>

      <!-- Mobile Bottom Navigation -->
      <nav class="md:hidden fixed bottom-0 left-0 w-full bg-cyber-black border-t border-cyber-border z-50 flex justify-around items-start backdrop-blur-md bg-opacity-95 pb-[env(safe-area-inset-bottom)] pt-1 h-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <button 
          (click)="mobileTab.set('settings')" 
          class="flex flex-col items-center gap-1 p-2 w-1/3 transition-colors duration-200"
          [class.text-neon-green]="mobileTab() === 'settings'"
          [class.text-cyber-muted]="mobileTab() !== 'settings'"
        >
           <app-icon name="settings" [size]="20"></app-icon>
           <span class="text-[10px] uppercase tracking-wider font-bold">Config</span>
        </button>
        
        <button 
          (click)="mobileTab.set('chat')" 
          class="flex flex-col items-center gap-1 p-2 w-1/3 transition-colors duration-200"
          [class.text-neon-green]="mobileTab() === 'chat'"
          [class.text-cyber-muted]="mobileTab() !== 'chat'"
        >
           <app-icon name="message-square" [size]="20"></app-icon>
           <span class="text-[10px] uppercase tracking-wider font-bold">Chat</span>
        </button>
        
        <button 
          (click)="mobileTab.set('output')" 
          class="flex flex-col items-center gap-1 p-2 w-1/3 transition-colors duration-200 relative"
          [class.text-neon-purple]="mobileTab() === 'output'"
          [class.text-cyber-muted]="mobileTab() !== 'output'"
        >
           <div class="relative">
             <app-icon name="terminal" [size]="20"></app-icon>
             @if(isLoading()) {
               <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full animate-ping"></span>
               <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-neon-green rounded-full"></span>
             } @else if (response() && mobileTab() !== 'output') {
               <span class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neon-blue rounded-full"></span>
             }
           </div>
           <span class="text-[10px] uppercase tracking-wider font-bold">Output</span>
        </button>
      </nav>

    </main>
  `
})
export class AppComponent {
  
  // State
  config = signal<ChatConfig>({ ...DEFAULT_CONFIG });
  messages = signal<ChatMessage[]>(this.getClonedDefaults());
  response = signal<CompletionResponse | null>(null);
  latency = signal<number>(0);
  responseComplete = signal(false);
  
  // UI State
  mobileTab = signal<'settings' | 'chat' | 'output'>('chat');
  sidebarCollapsed = signal(false);
  isDark = signal(true);
  
  // Computed from service state
  isLoading = this.llmService.loading;
  error = this.llmService.error;

  constructor(private llmService: LlmService) {
    this.loadState();
    
    // Auto-save effect
    effect(() => {
      const state = {
        config: this.config(),
        messages: this.messages(),
        isDark: this.isDark(),
        sidebarCollapsed: this.sidebarCollapsed()
      };
      localStorage.setItem('typegpt_state', JSON.stringify(state));
    });

    // Theme Effect
    effect(() => {
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            if (this.isDark()) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }
    });
  }

  toggleTheme() {
      this.isDark.update(v => !v);
  }

  toggleSidebar() {
      this.sidebarCollapsed.update(v => !v);
  }

  private getClonedDefaults(): ChatMessage[] {
    return DEFAULT_MESSAGES.map(msg => ({ ...msg }));
  }

  loadState() {
    try {
      const saved = localStorage.getItem('typegpt_state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.config) this.config.set({ ...DEFAULT_CONFIG, ...state.config });
        if (state.messages && Array.isArray(state.messages)) this.messages.set(state.messages);
        if (state.isDark !== undefined) this.isDark.set(state.isDark);
        if (state.sidebarCollapsed !== undefined) this.sidebarCollapsed.set(state.sidebarCollapsed);
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  }

  downloadConfig() {
      const exportData = {
          config: this.config(),
          messages: this.messages(),
          timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typegpt-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }

  handleFileImport(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
          const file = input.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const content = e.target?.result as string;
                  const parsed = JSON.parse(content);
                  
                  if (parsed.config) this.config.set({ ...this.config(), ...parsed.config });
                  if (parsed.messages && Array.isArray(parsed.messages)) this.messages.set(parsed.messages);
                  
                  // Reset file input
                  input.value = '';
              } catch (err) {
                  alert('Invalid JSON file');
              }
          };
          reader.readAsText(file);
      }
  }

  resetState() {
    this.config.set({ ...DEFAULT_CONFIG });
    this.messages.set(this.getClonedDefaults());
    this.response.set(null);
    this.latency.set(0);
  }

  async handleRunRequest() {
    // Auto-switch to output view on mobile when request starts
    if (window.innerWidth < 768) {
      this.mobileTab.set('output');
    }

    const start = Date.now();
    this.response.set(null);
    this.latency.set(0);
    this.responseComplete.set(false);

    try {
      for await (const chunk of this.llmService.streamMessage(this.config(), this.messages())) {
        this.response.set(chunk);
        this.latency.set(Date.now() - start);
      }
      this.responseComplete.set(true);
    } catch (err) {
      console.error('Stream processing failed:', err);
    }
  }
}
