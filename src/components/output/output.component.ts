import { Component, input, signal, computed, ViewEncapsulation, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { CompletionResponse } from '../../services/llm.service';
import { parse } from 'marked';

@Component({
  selector: 'app-output',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    app-output {
      display: block;
      height: 100%;
    }
    /* ... existing markdown styles kept but applied via ViewEncapsulation ... */
    .markdown-body {
      color: var(--text-main);
      font-family: 'Inter', sans-serif;
      line-height: 1.7;
      font-size: 0.95rem;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      color: var(--text-main);
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 0.75em;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }
    .markdown-body h1 { 
      font-size: 1.75rem; 
      border-bottom: 1px solid var(--border-color); 
      padding-bottom: 0.5rem; 
      color: var(--accent-green);
    }
    .markdown-body h2 { 
      font-size: 1.4rem; 
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.3rem;
    }
    .markdown-body h3 { font-size: 1.2rem; color: var(--accent-blue); }
    .markdown-body p { margin-bottom: 1.25em; }
    
    .markdown-body ul, .markdown-body ol { 
      margin-bottom: 1.25em; 
      padding-left: 1.5em; 
      color: var(--text-muted);
    }
    .markdown-body ul { list-style-type: disc; }
    .markdown-body ol { list-style-type: decimal; }
    .markdown-body li { margin-bottom: 0.5em; }
    
    .markdown-body code {
      background-color: rgba(128, 128, 128, 0.1);
      color: var(--accent-purple);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
    }
    
    .markdown-body pre {
      background-color: var(--bg-panel);
      border: 1px solid var(--border-color);
      padding: 1.25em;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 1.5em;
    }
    .markdown-body pre code {
      background-color: transparent;
      color: var(--text-main);
      padding: 0;
      font-size: 0.85em;
    }

    .markdown-body blockquote {
      border-left: 4px solid var(--accent-purple);
      background: rgba(181, 55, 242, 0.05);
      padding: 1em;
      margin: 1.5em 0;
      color: var(--text-muted);
      font-style: italic;
    }
    
    .markdown-body a {
      color: var(--accent-blue);
      text-decoration: none;
      border-bottom: 1px solid rgba(0, 209, 255, 0.3);
      transition: all 0.2s;
    }
    .markdown-body a:hover {
      color: var(--accent-green);
      border-color: var(--accent-green);
    }
    .markdown-body strong { color: var(--text-main); font-weight: 700; }
    .markdown-body em { color: var(--accent-blue); }
  `],
  template: `
    <div class="h-full flex flex-col bg-cyber-black border-l border-cyber-border font-mono text-sm relative overflow-hidden transition-colors duration-300">
      
      <!-- Scanline Overlay -->
      <div class="absolute inset-0 pointer-events-none z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMCwgMjU1LCA2NSwgMC4wMykiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>

      <!-- Tabs & Tools -->
      <div class="flex items-center h-[65px] px-4 border-b border-cyber-border bg-cyber-dark z-10 flex-shrink-0 justify-between">
        <div class="flex p-1 bg-cyber-black border border-cyber-border rounded-sm">
            <button 
              (click)="activeTab.set('preview')"
              class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-2"
              [class.bg-cyber-border]="activeTab() === 'preview'"
              [class.text-neon-green]="activeTab() === 'preview'"
              [class.text-cyber-muted]="activeTab() !== 'preview'"
              [class.hover:text-cyber-text]="activeTab() !== 'preview'"
            >
              <app-icon name="terminal" [size]="12"></app-icon>
              Preview
            </button>
            <button 
              (click)="activeTab.set('json')"
              class="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-2"
              [class.bg-cyber-border]="activeTab() === 'json'"
              [class.text-neon-purple]="activeTab() === 'json'"
              [class.text-cyber-muted]="activeTab() !== 'json'"
              [class.hover:text-cyber-text]="activeTab() !== 'json'"
            >
              <app-icon name="code" [size]="12"></app-icon>
              JSON
            </button>
        </div>
        
        <div class="flex items-center gap-2">
           @if(data()) {
             <!-- TTS Controls -->
             <div class="flex items-center gap-2 border-r border-cyber-border pr-2 mr-2 relative">
               
               <!-- Auto Read Toggle -->
               <div class="flex items-center gap-2 mr-2" title="Auto-read response when complete">
                 <button 
                   (click)="autoRead.set(!autoRead())"
                   class="w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none ring-1 ring-cyber-border"
                   [class.bg-neon-green]="autoRead()"
                   [class.bg-cyber-black]="!autoRead()"
                 >
                   <div 
                     class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm"
                     [class.translate-x-4]="autoRead()"
                     [class.translate-x-0]="!autoRead()"
                   ></div>
                 </button>
                 <span 
                   class="text-[9px] font-bold uppercase tracking-widest cursor-pointer select-none"
                   [class.text-neon-green]="autoRead()"
                   [class.text-cyber-muted]="!autoRead()"
                   (click)="autoRead.set(!autoRead())"
                 >Auto</span>
               </div>

               <!-- TTS Settings Toggle -->
               <button 
                 (click)="showTtsConfig.set(!showTtsConfig())"
                 class="p-1.5 text-cyber-muted hover:text-white rounded-sm transition-all"
                 [class.text-neon-blue]="showTtsConfig()"
                 title="Audio Settings"
               >
                 <app-icon name="settings" [size]="14"></app-icon>
               </button>

               <!-- TTS Config Dropdown -->
               @if(showTtsConfig()) {
                 <div class="absolute top-full right-0 mt-2 w-48 bg-cyber-black border border-cyber-border shadow-2xl rounded-sm p-3 z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <div class="text-[9px] font-bold text-cyber-muted uppercase tracking-widest border-b border-cyber-border pb-1">Audio Config</div>
                    
                    <!-- Rate -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-[9px] text-cyber-muted">
                        <span>Speed</span>
                        <span class="text-neon-green">{{ ttsRate() }}x</span>
                      </div>
                      <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="ttsRate" class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-neon-green">
                    </div>

                    <!-- Pitch -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-[9px] text-cyber-muted">
                        <span>Pitch</span>
                        <span class="text-neon-blue">{{ ttsPitch() }}</span>
                      </div>
                      <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="ttsPitch" class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-neon-blue">
                    </div>

                    <!-- Volume -->
                     <div class="space-y-1">
                      <div class="flex justify-between text-[9px] text-cyber-muted">
                        <span>Volume</span>
                        <span class="text-neon-purple">{{ (ttsVolume() * 100).toFixed(0) }}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" [(ngModel)]="ttsVolume" class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-neon-purple">
                    </div>
                 </div>
                 <div (click)="showTtsConfig.set(false)" class="fixed inset-0 z-40 bg-transparent"></div>
               }

               <!-- Voice Select -->
               @if (voices().length > 0) {
                 <div class="relative group hidden xl:block ml-2">
                    <select 
                      [ngModel]="selectedVoiceName()"
                      (ngModelChange)="selectedVoiceName.set($event)"
                      class="bg-cyber-black text-[10px] text-cyber-muted border border-transparent hover:border-cyber-border hover:text-white rounded-sm py-1 pl-2 pr-6 appearance-none cursor-pointer focus:outline-none focus:border-neon-blue transition-all w-28 truncate"
                      title="Select Voice"
                    >
                      @for (voice of voices(); track voice.name) {
                        <option [value]="voice.name">{{ voice.name }}</option>
                      }
                    </select>
                    <app-icon name="chevron-down" [size]="10" class="absolute right-2 top-2 text-cyber-muted pointer-events-none"></app-icon>
                 </div>
               }
               
               <!-- Play/Stop -->
               <button 
                 (click)="toggleSpeech()"
                 class="flex items-center justify-center p-1.5 rounded-sm transition-all relative overflow-hidden ml-1"
                 [class.text-neon-green]="isSpeaking()"
                 [class.bg-neon-green-10]="isSpeaking()"
                 [class.text-cyber-muted]="!isSpeaking()"
                 [class.hover:text-cyber-text]="!isSpeaking()"
                 [title]="isSpeaking() ? 'Stop Speaking' : 'Read Aloud'"
               >
                 <app-icon [name]="isSpeaking() ? 'stop-circle' : 'volume-2'" [size]="16"></app-icon>
                 @if(isSpeaking()) {
                   <span class="absolute inset-0 bg-neon-green/10 animate-pulse"></span>
                 }
               </button>
             </div>

             <!-- Copy -->
             <button 
               (click)="copyToClipboard()"
               class="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-cyber-muted hover:text-white hover:bg-white/5 rounded-sm transition-all group"
               title="Copy to Clipboard"
             >
               <app-icon [name]="copied() ? 'check' : 'copy'" [size]="14" [class]="copied() ? 'text-neon-green' : 'group-hover:text-neon-blue'"></app-icon>
               <span [class.text-neon-green]="copied()">{{ copied() ? 'COPIED' : 'COPY' }}</span>
             </button>
           }
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        
        <!-- Error -->
        @if (error()) {
           <div class="p-6 h-full flex items-center justify-center">
             <div class="w-full max-w-md bg-neon-red/5 border border-neon-red/30 p-6 relative">
                <!-- Glitch corners -->
                <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-neon-red"></div>
                <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neon-red"></div>

                <div class="w-12 h-12 bg-neon-red/10 flex items-center justify-center mx-auto mb-4 text-neon-red">
                   <app-icon name="x" [size]="24"></app-icon>
                </div>
                <h3 class="text-white font-bold text-center mb-2 uppercase tracking-widest glitch-hover text-neon-red">Xəta Baş Verdi</h3>
                <div class="bg-black/50 border border-neon-red/20 p-4 text-left overflow-auto max-h-60 mt-4">
                    <pre class="text-neon-red text-xs whitespace-pre-wrap">{{ error() }}</pre>
                </div>
             </div>
           </div>
        } 
        
        <!-- Loading (Initial) -->
        @else if (loading() && !data()) {
           <div class="absolute inset-0 flex flex-col items-center justify-center gap-6">
             <div class="relative w-16 h-16">
                <div class="absolute inset-0 border-t-2 border-neon-green rounded-full animate-spin"></div>
                <div class="absolute inset-2 border-r-2 border-neon-blue rounded-full animate-spin" style="animation-direction: reverse"></div>
                <div class="absolute inset-4 border-b-2 border-neon-purple rounded-full animate-spin"></div>
             </div>
             <p class="text-xs text-neon-green animate-pulse uppercase tracking-[0.3em]">Məlumat alınır...</p>
           </div>
        }

        <!-- Empty -->
        @else if (!data() && !loading()) {
           <div class="flex flex-col items-center justify-center h-full text-cyber-muted select-none">
             <app-icon name="terminal" [size]="64" class="opacity-10 mb-6"></app-icon>
             <p class="text-[10px] uppercase tracking-[0.4em] opacity-40">Gözləmə Rejimi</p>
           </div>
        } 

        <!-- Output -->
        @else {
           @if (activeTab() === 'preview') {
             <div class="p-6 md:p-8 text-sm">
                @if (loading()) {
                   <div class="mb-4 flex items-center gap-2 text-neon-green text-xs font-mono uppercase tracking-widest">
                     <span class="inline-block w-2 h-2 bg-neon-green rounded-full animate-pulse"></span>
                     Streaming...
                   </div>
                }
                <!-- Markdown Content -->
                <div class="markdown-body" [innerHTML]="parsedContent()"></div>
                
                @if (loading()) {
                  <span class="inline-block w-2.5 h-5 bg-neon-green align-middle ml-1 animate-[pulse-fast_0.5s_infinite] mt-2"></span>
                }
             </div>
           } @else {
             <div class="p-4 h-full">
               <pre class="text-xs text-neon-purple font-mono h-full overflow-auto p-4 bg-cyber-dark/30 border border-cyber-border select-text">{{ getJsonString() }}</pre>
             </div>
           }
        }
      </div>

      <!-- Status Bar -->
      <div class="h-8 border-t border-cyber-border bg-cyber-black flex items-center justify-between px-4 text-[9px] text-cyber-muted uppercase tracking-widest select-none z-10 relative flex-shrink-0">
         <!-- Active Line -->
         @if (loading()) {
            <div class="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple animate-[pulse-fast_1s_infinite]"></div>
         }

         @if (data()) {
           <div class="flex gap-4 md:gap-6">
              <span class="flex items-center gap-2">
                 LATENCY: <span class="text-neon-blue">{{ latency() }}ms</span>
              </span>
              @if (data()?.usage; as usage) {
                <span class="flex items-center gap-2">
                   TOKENS: <span class="text-neon-purple">{{ usage.total_tokens }}</span>
                </span>
              }
           </div>
           <div class="flex items-center gap-2">
              <span class="text-cyber-text hidden md:inline">{{ data()?.model }}</span>
              <div [class.bg-neon-green]="!loading()" [class.bg-orange-500]="loading()" class="w-1.5 h-1.5 rounded-full"></div>
           </div>
         } @else {
            <span class="opacity-30">SYSTEM READY</span>
            <div class="w-1.5 h-1.5 rounded-full bg-cyber-muted opacity-30"></div>
         }
      </div>

    </div>
  `
})
export class OutputComponent implements OnDestroy {
  data = input<CompletionResponse | null>(null);
  fullHistory = input<any[]>([]); // For full JSON copy
  loading = input<boolean>(false);
  error = input<string | null>(null);
  latency = input<number>(0);
  responseComplete = input<boolean>(false);

  activeTab = signal<'preview' | 'json'>('preview');
  copied = signal(false);

  // TTS State
  voices = signal<SpeechSynthesisVoice[]>([]);
  selectedVoiceName = signal<string>('');
  isSpeaking = signal(false);
  autoRead = signal(false);
  showTtsConfig = signal(false);
  
  // Audio Parameters
  ttsRate = signal(1.0);
  ttsPitch = signal(1.0);
  ttsVolume = signal(1.0);

  // Queue System
  private lastSpokenLength = 0;
  private speechQueue: string[] = [];
  private isProcessingQueue = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private retryCount = 0;

  constructor() {
    this.initVoices();

    // Reset logic when a new response starts (loading true, no data yet)
    effect(() => {
        if (this.loading() && !this.data()) {
             this.stopSpeech();
        }
    });

    // Streaming Auto-Read Effect
    effect(() => {
        const data = this.data();
        const auto = this.autoRead();
        const complete = this.responseComplete();

        // Trigger only if auto-read is on and we have data
        if (auto && data) {
             this.handleStreamingSpeech(complete);
        }
    });
  }

  ngOnDestroy() {
    this.stopSpeech();
  }

  initVoices() {
    if (typeof window === 'undefined') return;

    const load = () => {
      const vs = window.speechSynthesis.getVoices();
      this.voices.set(vs);
      if (!this.selectedVoiceName() && vs.length > 0) {
        const defaultVoice = vs.find(v => v.default) || vs[0];
        this.selectedVoiceName.set(defaultVoice.name);
      }
    };

    window.speechSynthesis.onvoiceschanged = load;
    load();
  }

  toggleSpeech() {
    if (typeof window === 'undefined') return;

    if (this.isSpeaking()) {
      this.stopSpeech();
      this.autoRead.set(false);
    } else {
      this.speakFullText();
    }
  }

  stopSpeech() {
      if (typeof window !== 'undefined') {
          window.speechSynthesis.cancel();
      }
      this.isSpeaking.set(false);
      this.speechQueue = [];
      this.isProcessingQueue = false;
      this.lastSpokenLength = 0;
      this.currentUtterance = null;
      this.retryCount = 0;
  }

  speakFullText() {
    this.stopSpeech();
    const text = this.getPlainText();
    if (!text) return;
    
    // Split full text into reasonable chunks
    const chunks = this.chunkText(text);
    chunks.forEach(c => this.speechQueue.push(c));
    this.processSpeechQueue();
  }

  handleStreamingSpeech(isComplete: boolean) {
      const fullText = this.getPlainText();
      
      if (fullText.length < this.lastSpokenLength) {
          this.lastSpokenLength = 0;
      }

      const newContent = fullText.slice(this.lastSpokenLength);
      if (!newContent.trim()) return;

      if (isComplete) {
           const chunks = this.chunkText(newContent);
           chunks.forEach(c => this.speechQueue.push(c));
           this.lastSpokenLength = fullText.length;
           this.processSpeechQueue();
           return;
      }

      // Split by sentence terminators
      let lastBreak = -1;
      const sentenceEnd = /([.!?])\s+/g;
      let match;
      
      while ((match = sentenceEnd.exec(newContent)) !== null) {
           lastBreak = match.index + match[0].length;
      }

      if (lastBreak > 0) {
           const chunk = newContent.slice(0, lastBreak);
           if (chunk.trim()) {
              const chunks = this.chunkText(chunk);
              chunks.forEach(c => this.speechQueue.push(c));
              this.processSpeechQueue();
           }
           this.lastSpokenLength += lastBreak;
      }
  }

  // Safety splitter for very long texts to avoid synthesis-failed
  private chunkText(text: string): string[] {
      const MAX_LENGTH = 160; // Safe limit for most browsers
      if (text.length <= MAX_LENGTH) return [text];
      
      const chunks = [];
      const sentences = text.match(/[^.!?]+[.!?]+|\s*$/g) || [text];
      
      let currentChunk = '';
      for (const s of sentences) {
          if ((currentChunk + s).length > MAX_LENGTH) {
              if (currentChunk) chunks.push(currentChunk);
              currentChunk = s;
          } else {
              currentChunk += s;
          }
      }
      if (currentChunk) chunks.push(currentChunk);
      return chunks;
  }

  processSpeechQueue() {
      if (typeof window === 'undefined' || this.isProcessingQueue || this.speechQueue.length === 0) {
          return;
      }

      if (window.speechSynthesis.speaking) {
           this.isSpeaking.set(true);
           // Wait loop if busy
           return;
      }
      
      window.speechSynthesis.resume();

      this.isProcessingQueue = true;
      this.isSpeaking.set(true);

      const text = this.speechQueue.shift();
      if (!text) {
          this.isProcessingQueue = false;
          return;
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      const utterance = this.currentUtterance;
      
      const voice = this.voices().find(v => v.name === this.selectedVoiceName());
      if (voice) utterance.voice = voice;
      utterance.rate = this.ttsRate();
      utterance.pitch = this.ttsPitch();
      utterance.volume = this.ttsVolume();

      utterance.onend = () => {
          this.isProcessingQueue = false;
          this.retryCount = 0;
          if (this.speechQueue.length > 0) {
              this.processSpeechQueue();
          } else {
              this.isSpeaking.set(false);
          }
      };

      utterance.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') {
              this.isProcessingQueue = false;
              return;
          }
          console.warn('TTS Error:', e.error);
          
          this.isProcessingQueue = false;

          // Recover from synthesis-failed
          if (e.error === 'synthesis-failed' || e.error === 'network') {
             if (this.retryCount < 2) {
                 this.retryCount++;
                 console.log('Retrying TTS...');
                 window.speechSynthesis.cancel();
                 // Re-queue current text
                 this.speechQueue.unshift(text);
                 setTimeout(() => this.processSpeechQueue(), 250);
                 return;
             }
          }

          if (this.speechQueue.length > 0) {
               setTimeout(() => this.processSpeechQueue(), 100);
          } else {
               this.isSpeaking.set(false);
          }
      };

      try {
          window.speechSynthesis.speak(utterance);
      } catch (err) {
          console.error('Speech synthesis speak failed:', err);
          this.isProcessingQueue = false;
          this.isSpeaking.set(false);
      }
  }

  getPlainText() {
    const html = this.parsedContent();
    if (typeof document === 'undefined') return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let text = temp.textContent || temp.innerText || '';
    text = text.replace(/[#*`_~]/g, ''); 
    return text;
  }

  parsedContent = computed(() => {
    const content = this.data()?.choices[0]?.message?.content || '';
    return parse(content, { async: false, breaks: true, gfm: true }) as string;
  });

  getJsonString() {
    const exportObj = {
        messages: this.fullHistory(),
        response: this.data()
    };
    return JSON.stringify(exportObj, null, 2);
  }

  async copyToClipboard() {
    const text = this.activeTab() === 'preview' 
      ? (this.data()?.choices[0]?.message?.content || '') 
      : this.getJsonString();
      
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }
}