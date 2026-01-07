
import { Component, model, signal, computed, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { ChatConfig, Tool } from '../../services/llm.service';

interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  description: string;
  contextWindow: string;
  maxOutput: string;
  tags: string[]; 
  strengths: string[];
  weaknesses: string[];
}

interface ToolPreset {
  id: string;
  name: string;
  description: string; 
  usage: string; 
  tool: Tool; 
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="h-full flex flex-col bg-cyber-dark border-r border-cyber-border text-sm overflow-hidden font-sans transition-all duration-300 relative"
         [class.w-80]="!collapsed()"
         [class.w-[60px]]="collapsed()">
      
      <!-- Brand Header -->
      <div class="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-black/50 flex-shrink-0 h-[65px]">
        @if (!collapsed()) {
          <div class="flex items-center gap-2 text-neon-green overflow-hidden whitespace-nowrap">
             <div class="w-8 h-8 rounded-sm bg-neon-green/10 border border-neon-green/20 flex items-center justify-center relative overflow-hidden group flex-shrink-0">
               <div class="absolute inset-0 bg-neon-green/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
               <app-icon name="terminal" [size]="18" class="relative z-10"></app-icon>
             </div>
             <div class="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
               <span class="font-bold tracking-wider text-cyber-text glitch-hover cursor-default">CYBER<span class="text-neon-green">.AI</span></span>
               <span class="text-[10px] text-cyber-muted font-mono tracking-widest">V2.0.5</span>
             </div>
          </div>
          
          <div class="flex gap-1">
            <button (click)="saveState.emit()" class="p-1.5 text-cyber-muted hover:text-neon-green hover:bg-neon-green/10 rounded-sm transition-all" title="Yadda Saxla (Export)">
              <app-icon name="save" [size]="16"></app-icon>
            </button>
            <button (click)="triggerUpload.emit()" class="p-1.5 text-cyber-muted hover:text-neon-blue hover:bg-neon-blue/10 rounded-sm transition-all" title="Yüklə (Import)">
              <app-icon name="upload" [size]="16"></app-icon>
            </button>
            <button (click)="resetToDefaults.emit()" class="p-1.5 text-cyber-muted hover:text-neon-red hover:bg-neon-red/10 rounded-sm transition-all" title="Sıfırla">
              <app-icon name="rotate-ccw" [size]="16"></app-icon>
            </button>
          </div>
        } @else {
           <div class="w-full flex justify-center">
             <button (click)="toggleCollapse.emit()" class="text-cyber-muted hover:text-white">
               <app-icon name="chevron-right" [size]="20"></app-icon>
             </button>
           </div>
        }
      </div>
      
      <!-- Collapse Toggle (Absolute on border) -->
      @if(!collapsed()) {
         <button 
           (click)="toggleCollapse.emit()"
           class="absolute top-1/2 -right-3 w-6 h-6 bg-cyber-black border border-cyber-border rounded-full flex items-center justify-center text-cyber-muted hover:text-neon-blue hover:border-neon-blue transition-all z-50 shadow-lg"
         >
           <app-icon name="chevron-left" [size]="14"></app-icon>
         </button>
      }

      <!-- Settings Scroll Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8" [class.hidden]="collapsed()">
        
        <!-- API Connection -->
        <section class="space-y-4">
           <h3 class="text-[10px] font-bold text-neon-purple uppercase tracking-[0.2em] flex items-center gap-2">
             <span class="w-1 h-1 bg-neon-purple rounded-full"></span>
             Bağlantı
           </h3>
           
           <div class="space-y-1.5 group">
             <label class="text-[11px] text-cyber-muted group-hover:text-cyber-text transition-colors">Base URL</label>
             <div class="relative">
                <input 
                  type="text" 
                  [(ngModel)]="config().baseUrl"
                  class="input-cyber w-full p-3 text-base md:text-xs rounded-sm placeholder-cyber-border"
                  placeholder="https://..."
                />
             </div>
           </div>

           <div class="space-y-1.5 group">
             <label class="text-[11px] text-cyber-muted group-hover:text-cyber-text transition-colors">API Açar (Key)</label>
             <div class="relative">
               <input 
                 [type]="showKey() ? 'text' : 'password'" 
                 [(ngModel)]="config().apiKey"
                 class="input-cyber w-full p-3 text-base md:text-xs rounded-sm pr-10 text-neon-purple"
               />
               <button 
                 (click)="toggleKey()" 
                 class="absolute right-3 top-3 text-cyber-muted hover:text-white transition-colors"
               >
                 <app-icon [name]="showKey() ? 'eye-off' : 'eye'" [size]="14"></app-icon>
               </button>
             </div>
           </div>
        </section>

        <!-- Model Selection -->
        <section class="space-y-4 relative z-20">
           <h3 class="text-[10px] font-bold text-neon-blue uppercase tracking-[0.2em] flex items-center gap-2">
             <span class="w-1 h-1 bg-neon-blue rounded-full"></span>
             Modellər
           </h3>
           
           <div class="relative">
             <button 
               (click)="toggleModelDropdown()"
               class="input-cyber w-full p-3 rounded-sm text-left flex justify-between items-center group border-l-2 border-l-transparent hover:border-l-neon-blue"
             >
               <div class="flex items-center gap-3 overflow-hidden">
                 <!-- Provider Dot -->
                 <div [class]="getProviderColor(selectedModelData()?.provider) + ' w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]'"></div>
                 <span class="text-xs font-mono font-medium text-cyber-text truncate">{{ config().model }}</span>
               </div>
               <!-- Fixed Icon Position -->
               <app-icon name="chevron-down" [size]="14" class="text-cyber-muted group-hover:text-neon-blue flex-shrink-0 ml-2"></app-icon>
             </button>

             @if (showModelDropdown()) {
                <div class="absolute top-full left-0 w-full mt-2 bg-cyber-black border border-cyber-border rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in zoom-in-95 duration-200">
                  <div class="p-2 border-b border-cyber-border bg-cyber-dark">
                    <input 
                      type="text" 
                      [(ngModel)]="modelSearch"
                      placeholder="Model axtar..."
                      class="w-full bg-cyber-black border border-cyber-border rounded-sm p-2 text-base md:text-xs text-neon-green font-mono focus:outline-none focus:border-neon-green"
                      autoFocus
                    />
                  </div>
                  <div class="overflow-y-auto flex-1">
                    @for (m of filteredModels(); track m.id) {
                      <button 
                        (click)="selectModel(m.id)"
                        class="w-full text-left px-4 py-3 text-xs border-l-2 border-transparent hover:bg-cyber-dark hover:border-l-neon-green hover:text-cyber-text transition-all flex items-center justify-between group"
                        [class.bg-cyber-dark]="m.id === config().model"
                        [class.border-l-neon-green]="m.id === config().model"
                        [class.text-neon-green]="m.id === config().model"
                        [class.text-cyber-muted]="m.id !== config().model"
                      >
                        <span class="truncate pr-2 font-mono">{{ m.id }}</span>
                        @if(m.tags.includes('Thinking')) {
                          <app-icon name="info" [size]="12" class="text-neon-purple opacity-50 group-hover:opacity-100"></app-icon>
                        }
                      </button>
                    }
                  </div>
                </div>
                <div (click)="showModelDropdown.set(false)" class="fixed inset-0 z-40 bg-transparent"></div>
             }
           </div>

           <!-- Advanced Info Panel -->
           @if (selectedModelData(); as info) {
             <div class="mt-4 bg-cyber-black/50 border border-cyber-border rounded-sm p-4 space-y-3 relative overflow-hidden">
               <!-- Decor -->
               <div class="absolute top-0 right-0 p-1">
                  <div class="w-2 h-2 border-t border-r border-cyber-muted"></div>
               </div>
               
               <div class="flex items-center justify-between">
                 <span class="text-[10px] font-bold text-cyber-text uppercase bg-cyber-border/50 px-2 py-0.5 rounded-full">{{ info.provider }}</span>
                 <div class="flex flex-wrap gap-1 justify-end">
                   @for (tag of info.tags; track tag) {
                     <span 
                        (click)="filterByTag(tag)"
                        class="text-[9px] px-1.5 py-0.5 rounded-sm border border-cyber-border text-cyber-muted hover:border-neon-purple hover:text-neon-purple cursor-pointer transition-colors uppercase tracking-wider"
                     >{{ tag }}</span>
                   }
                 </div>
               </div>
               
               <div class="h-px w-full bg-gradient-to-r from-transparent via-cyber-border to-transparent"></div>

               <!-- Description -->
               <p class="text-[10px] text-cyber-muted leading-relaxed italic border-l-2 border-neon-blue pl-2 opacity-80">
                 {{ info.description }}
               </p>

               <!-- Stats Grid -->
               <div class="grid grid-cols-2 gap-2">
                  <div class="bg-cyber-dark/80 p-2 rounded-sm border border-cyber-border/50">
                    <span class="text-[9px] text-cyber-muted block uppercase tracking-wider">Context</span>
                    <span class="text-xs text-neon-blue font-mono">{{ info.contextWindow }}</span>
                  </div>
                  <div class="bg-cyber-dark/80 p-2 rounded-sm border border-cyber-border/50">
                    <span class="text-[9px] text-cyber-muted block uppercase tracking-wider">Max Out</span>
                    <span class="text-xs text-neon-blue font-mono">{{ info.maxOutput }}</span>
                  </div>
               </div>
             </div>
           }
        </section>

        <!-- Tools Section -->
        <section class="space-y-4">
           <h3 class="text-[10px] font-bold text-neon-red uppercase tracking-[0.2em] flex items-center gap-2">
             <span class="w-1 h-1 bg-neon-red rounded-full"></span>
             Alətlər
           </h3>
           
           <div class="space-y-2">
             <div class="flex gap-2">
               <div class="relative flex-1">
                 <select 
                   [value]="selectedPresetId()"
                   (change)="onPresetChange($any($event).target.value)"
                   class="input-cyber w-full p-2 text-xs rounded-sm appearance-none cursor-pointer"
                 >
                   <option value="" disabled selected>Alət Seçin...</option>
                   @for (preset of toolPresets; track preset.id) {
                     <option [value]="preset.id">{{ preset.name }}</option>
                   }
                 </select>
                 <app-icon name="chevron-down" [size]="12" class="absolute right-2 top-3 text-cyber-muted pointer-events-none"></app-icon>
               </div>
               <button 
                 (click)="addTool()"
                 class="p-2 bg-cyber-dark border border-cyber-border rounded-sm hover:border-neon-red hover:text-neon-red transition-colors"
                 title="Əlavə et"
               >
                 <app-icon name="plus" [size]="14"></app-icon>
               </button>
             </div>

             <!-- Error Feedback -->
             @if (toolError()) {
               <div class="text-[10px] text-neon-red bg-neon-red/10 border border-neon-red/20 p-2 rounded-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                 <app-icon name="x" [size]="12"></app-icon>
                 {{ toolError() }}
               </div>
             }

             <!-- Preview -->
             @if (activePreset(); as preset) {
               <div class="bg-cyber-black border border-cyber-border p-3 rounded-sm space-y-2 animate-in fade-in slide-in-from-top-1">
                 <div>
                   <span class="text-[9px] text-neon-red font-bold uppercase tracking-widest">Təsvir:</span>
                   <p class="text-[10px] text-cyber-muted mt-1 leading-relaxed">{{ preset.description }}</p>
                 </div>
               </div>
             }

             <!-- Active Tools List -->
             <div class="space-y-2 mt-4">
               @if (config().tools.length > 0) {
                 <div class="text-[9px] text-cyber-muted font-bold uppercase tracking-widest mb-2">Aktiv Alətlər:</div>
               }
               
               @for (tool of config().tools; track tool.function.name; let i = $index) {
                 <div class="bg-cyber-dark/50 border border-cyber-border rounded-sm overflow-hidden group hover:border-neon-red/50 transition-colors">
                   <div class="flex items-center justify-between p-2 bg-cyber-black/50 border-b border-cyber-border/50">
                     <div class="flex items-center gap-2 overflow-hidden">
                       <app-icon name="wrench" [size]="10" class="text-neon-red flex-shrink-0"></app-icon>
                       <span class="text-[10px] font-mono text-cyber-text truncate">{{ tool.function.name }}</span>
                     </div>
                     <div class="flex gap-1">
                       <button (click)="toggleToolEdit(i)" class="p-1 hover:text-neon-blue transition-colors" title="Konfiqurasiya">
                         <app-icon name="code" [size]="10"></app-icon>
                       </button>
                       <button (click)="removeTool(i)" class="p-1 hover:text-neon-red transition-colors" title="Sil">
                         <app-icon name="x" [size]="10"></app-icon>
                       </button>
                     </div>
                   </div>
                   
                   @if (editingToolIndex() === i) {
                     <div class="p-2">
                       <textarea 
                         [value]="getToolJson(tool)"
                         (change)="updateToolJson(i, $any($event.target).value)"
                         class="w-full bg-cyber-black border border-cyber-border rounded-sm text-[9px] font-mono p-2 text-neon-green h-32 focus:outline-none focus:border-neon-blue resize-y"
                       ></textarea>
                     </div>
                   }
                 </div>
               }
             </div>
           </div>
        </section>

        <!-- Parameters -->
        <section class="space-y-6">
           <h3 class="text-[10px] font-bold text-neon-green uppercase tracking-[0.2em] flex items-center gap-2">
             <span class="w-1 h-1 bg-neon-green rounded-full"></span>
             Parametrlər
           </h3>
           
           <div class="space-y-3">
             <div class="flex justify-between items-center text-[11px]">
               <label class="text-cyber-muted">Temperature</label>
               <span class="font-mono text-neon-green">{{ config().temperature }}</span>
             </div>
             <input type="range" min="0" max="2" step="0.1" [(ngModel)]="config().temperature" 
               class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:hover:shadow-[0_0_10px_#00ff41] transition-all"/>
           </div>

           <div class="space-y-3">
             <div class="flex justify-between items-center text-[11px]">
               <label class="text-cyber-muted">Max Tokens</label>
               <span class="font-mono text-neon-green">{{ config().maxTokens }}</span>
             </div>
             <input type="range" min="128" max="16384" step="128" [(ngModel)]="config().maxTokens" 
               class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:hover:shadow-[0_0_10px_#00ff41] transition-all"/>
           </div>
        </section>

      </div>

      <!-- Footer Branding & Theme -->
      <div class="p-4 border-t border-cyber-border bg-cyber-black relative z-10 flex-shrink-0 flex items-center justify-between gap-2" [class.flex-col]="collapsed()">
         @if (!collapsed()) {
            <a href="https://github.com/pierringshot" target="_blank" class="block group text-center flex-1">
                <div class="text-[10px] font-mono font-bold text-cyber-muted group-hover:text-neon-blue transition-colors tracking-[0.2em] mb-1 glitch-hover">
                [PIERRINGSHOT]
                </div>
            </a>
         }
         
         <button 
           (click)="toggleTheme.emit()" 
           class="p-2 text-cyber-muted hover:text-white bg-cyber-dark hover:bg-cyber-border border border-cyber-border rounded-sm transition-all"
           [title]="isDark() ? 'İşıqlı Rejim' : 'Qaranlıq Rejim'"
         >
           <app-icon [name]="isDark() ? 'sun' : 'moon'" [size]="14"></app-icon>
         </button>
      </div>
    </div>
  `
})
export class SidebarComponent {
  config = model.required<ChatConfig>();
  collapsed = input<boolean>(false);
  isDark = input<boolean>(true);

  resetToDefaults = output<void>();
  saveState = output<void>();
  triggerUpload = output<void>();
  toggleCollapse = output<void>();
  toggleTheme = output<void>();
  
  showKey = signal(false);
  showModelDropdown = signal(false);
  modelSearch = signal('');

  // Tools State
  selectedPresetId = signal('');
  editingToolIndex = signal<number | null>(null);
  toolError = signal<string | null>(null);

  toolPresets: ToolPreset[] = [
    {
      id: 'weather',
      name: 'Hava Proqnozu',
      description: 'Modelə real vaxt rejimində hava məlumatlarını əldə etmək imkanı verir.',
      usage: 'Bakıda hava bu gün necədir?',
      tool: {
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city and state' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      }
    },
    {
      id: 'search',
      name: 'Google Axtarış',
      description: 'Modelin internetə çıxışını təmin edir.',
      usage: 'Ən son iPhone modeli hansıdır?',
      tool: {
        type: 'function',
        function: {
          name: 'google_search',
          description: 'Search the web for information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' },
            },
            required: ['query'],
          },
        },
      }
    },
    {
      id: 'calc',
      name: 'Kalkulyator',
      description: 'Mürəkkəb riyazi hesablamalar aparmaq üçün dəqiq alət.',
      usage: '155 * 32',
      tool: {
        type: 'function',
        function: {
          name: 'calculator',
          description: 'Perform a mathematical calculation',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'Math expression' },
            },
            required: ['expression'],
          },
        },
      }
    }
  ];

  fullModels: ModelDefinition[] = [
    { 
      id: 'zai-org/GLM-4.6', 
      provider: 'ZhipuAI', 
      name: 'GLM 4', 
      description: 'ZhipuAI-nin qabaqcıl modeli, yüksək ümumiləşdirmə.',
      contextWindow: '128k',
      maxOutput: '4k',
      tags: ['General'], 
      strengths: ['Balanced', 'Bilingual'], 
      weaknesses: [] 
    },
    { 
      id: 'deepseek-ai/DeepSeek-R1-0528', 
      provider: 'DeepSeek', 
      name: 'R1 Snapshot', 
      description: 'Mürəkkəb məntiq və riyazi problemlər üçün.',
      contextWindow: '128k',
      maxOutput: '8k',
      tags: ['Reasoning', 'Math'], 
      strengths: ['Chain of Thought', 'Complex Logic'], 
      weaknesses: ['High Latency'] 
    },
    { 
      id: 'deepseek-ai/deepseek-r1', 
      provider: 'DeepSeek', 
      name: 'R1', 
      description: 'Güclü düşünmə (reasoning) qabiliyyətinə malik.',
      contextWindow: '128k',
      maxOutput: '8k',
      tags: ['Reasoning'], 
      strengths: ['Reasoning', 'Open Source'], 
      weaknesses: ['Latency'] 
    },
     { 
      id: 'Qwen/Qwen3-235B-A22B-Thinking-2507', 
      provider: 'Qwen', 
      name: 'Qwen3 Thinking', 
      description: 'Böyük parametrlərə malik, dərin düşünmə tələb edən tapşırıqlar üçün nəzərdə tutulub.',
      contextWindow: '32k',
      maxOutput: '8k',
      tags: ['Reasoning', 'High Capacity'], 
      strengths: ['Deep Thinking', 'Nuance'], 
      weaknesses: ['Very Slow'] 
    },
    { 
      id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', 
      provider: 'Qwen', 
      name: 'Qwen3 Instruct', 
      description: 'Təlimatları dəqiq yerinə yetirən, geniş bilik bazasına malik nəhəng model.',
      contextWindow: '32k',
      maxOutput: '8k',
      tags: ['Instruct', 'High Capacity'], 
      strengths: ['Knowledge', 'Instruction Following'], 
      weaknesses: [] 
    },
    { 
      id: 'openai/gpt-oss-120b', 
      provider: 'OpenAI', 
      name: 'GPT OSS 120B', 
      description: 'Açıq mənbəli GPT variantı.',
      contextWindow: '16k',
      maxOutput: '4k',
      tags: ['High Capacity'], 
      strengths: ['General Knowledge'], 
      weaknesses: [] 
    },
    { 
      id: 'mistralai/mistral-large-3-675b-instruct-2512', 
      provider: 'Mistral', 
      name: 'Mistral Large 3', 
      description: 'Avropa dilləri və mürəkkəb mühakimə üçün.',
      contextWindow: '32k',
      maxOutput: '4k',
      tags: ['High Capacity'], 
      strengths: ['European Languages', 'Reasoning'], 
      weaknesses: [] 
    },
    { 
      id: 'deepseek-ai/deepseek-v3.1', 
      provider: 'DeepSeek', 
      name: 'V3.1', 
      description: 'Güclü kodlama və riyaziyyat qabiliyyətləri.',
      contextWindow: '128k',
      maxOutput: '8k',
      tags: ['Instruct'], 
      strengths: ['Coding', 'Math'], 
      weaknesses: [] 
    }
  ];

  filteredModels = computed(() => {
    const search = this.modelSearch().toLowerCase();
    return this.fullModels.filter(m => 
      m.id.toLowerCase().includes(search) || 
      m.name.toLowerCase().includes(search) ||
      m.tags.some(t => t.toLowerCase().includes(search))
    );
  });

  selectedModelData = computed(() => {
    return this.fullModels.find(m => m.id === this.config().model) || null;
  });

  activePreset = computed(() => {
    return this.toolPresets.find(p => p.id === this.selectedPresetId()) || null;
  });

  getProviderColor(provider: string = ''): string {
    const p = provider.toLowerCase();
    if (p.includes('deepseek')) return 'bg-blue-500 text-blue-500';
    if (p.includes('openai')) return 'bg-green-500 text-green-500';
    if (p.includes('qwen')) return 'bg-purple-500 text-purple-500';
    if (p.includes('mistral')) return 'bg-orange-500 text-orange-500';
    return 'bg-gray-500 text-gray-500';
  }

  toggleKey() {
    this.showKey.update(v => !v);
  }

  toggleModelDropdown() {
    this.showModelDropdown.update(v => !v);
    if (this.showModelDropdown()) {
      this.modelSearch.set('');
    }
  }

  selectModel(id: string) {
    this.config.update(c => ({ ...c, model: id }));
    this.showModelDropdown.set(false);
  }

  filterByTag(tag: string) {
    this.modelSearch.set(tag);
    this.showModelDropdown.set(true);
  }

  // Tool Methods
  onPresetChange(id: string) {
    this.selectedPresetId.set(id);
    this.toolError.set(null);
  }

  addTool() {
    const presetId = this.selectedPresetId();
    if (!presetId) {
      this.toolError.set('Zəhmət olmasa bir alət seçin.');
      return;
    }

    const preset = this.toolPresets.find(t => t.id === presetId);
    if (preset) {
      const currentTools = this.config().tools || [];
      
      // Check for duplicates
      if (currentTools.some(t => t.function.name === preset.tool.function.name)) {
        this.toolError.set('Bu alət artıq siyahıda mövcuddur.');
        setTimeout(() => this.toolError.set(null), 3000);
        return;
      }

      // Deep copy to allow independent editing
      const newTool = JSON.parse(JSON.stringify(preset.tool));
      
      this.toolError.set(null);
      this.config.update(c => {
         return { ...c, tools: [...currentTools, newTool] };
      });
    }
  }

  removeTool(index: number) {
    this.config.update(c => ({
      ...c,
      tools: c.tools.filter((_, i) => i !== index)
    }));
    if (this.editingToolIndex() === index) {
      this.editingToolIndex.set(null);
    }
  }

  toggleToolEdit(index: number) {
    if (this.editingToolIndex() === index) {
      this.editingToolIndex.set(null);
    } else {
      this.editingToolIndex.set(index);
    }
  }

  getToolJson(tool: Tool): string {
    return JSON.stringify(tool, null, 2);
  }

  updateToolJson(index: number, jsonString: string) {
    try {
      const updatedTool = JSON.parse(jsonString);
      this.config.update(c => {
        const newTools = [...c.tools];
        newTools[index] = updatedTool;
        return { ...c, tools: newTools };
      });
    } catch (e) {
      console.warn('Invalid JSON for tool configuration');
    }
  }
}
