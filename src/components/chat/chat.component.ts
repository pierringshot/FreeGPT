
import { Component, model, input, output, ElementRef, ViewChild, signal, viewChildren, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { ChatMessage } from '../../services/llm.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
  template: `
    <div class="h-full flex flex-col bg-cyber-black relative font-sans overflow-hidden">
      
      <!-- Background Grid -->
      <div class="absolute inset-0 z-0 opacity-5 pointer-events-none" 
           style="background-image: linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px); background-size: 24px 24px;">
      </div>

      <!-- Header -->
      <div class="p-4 border-b border-cyber-border bg-cyber-dark/80 backdrop-blur z-20 flex justify-between items-center h-[65px] flex-shrink-0">
        <div class="flex items-center gap-3">
           <div class="p-2 bg-neon-green/10 rounded-sm text-neon-green">
             <app-icon name="message-square" [size]="18"></app-icon>
           </div>
           <h2 class="text-sm font-bold text-cyber-text uppercase tracking-wider">Mesaj Qurucusu</h2>
        </div>
        <div class="flex items-center gap-2">
           <button 
            (click)="showImportModal.set(true)" 
            class="text-[10px] text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/10 flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all uppercase tracking-widest font-bold"
           >
             <app-icon name="code" [size]="12"></app-icon>
             JSON Import
           </button>
           <button 
             (click)="clearMessages()" 
             class="text-[10px] text-neon-red border border-neon-red/30 hover:bg-neon-red/10 flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all uppercase tracking-widest font-bold"
           >
             <app-icon name="trash" [size]="12"></app-icon>
             Təmizlə
           </button>
        </div>
      </div>

      <!-- Messages List -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10 custom-scrollbar pb-24 md:pb-36 overscroll-contain" #scrollContainer>
        @for (msg of messages(); track $index) {
          <div class="group relative rounded-sm border bg-cyber-dark/50 backdrop-blur-sm p-1 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]"
               [ngClass]="getRoleStyles(msg.role)">
            
            <!-- Handle & Controls -->
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
              <div class="flex items-center gap-2">
                 <span class="text-[10px] font-mono opacity-50">ROLE:</span>
                 <select 
                  [(ngModel)]="msg.role"
                  class="bg-transparent text-xs font-bold uppercase tracking-wide border-none focus:ring-0 cursor-pointer hover:text-white transition-colors appearance-none pr-4"
                  [class.text-neon-red]="msg.role === 'system'"
                  [class.text-neon-green]="msg.role === 'user'"
                  [class.text-neon-blue]="msg.role === 'assistant'"
                >
                  <option value="system" class="bg-cyber-black text-neon-red">System</option>
                  <option value="user" class="bg-cyber-black text-neon-green">User</option>
                  <option value="assistant" class="bg-cyber-black text-neon-blue">Assistant</option>
                </select>
              </div>

              <div class="flex items-center gap-3 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  (click)="toggleRecording($index)"
                  class="text-cyber-muted hover:text-neon-green transition-all transform hover:scale-110 active:scale-95 p-1"
                  [class.text-neon-red]="recordingIndex() === $index"
                  [class.animate-pulse]="recordingIndex() === $index"
                  title="Səsli daxil etmə"
                >
                  <app-icon name="mic" [size]="16"></app-icon>
                </button>
                
                <button 
                  (click)="removeMessage($index)"
                  class="text-cyber-muted hover:text-neon-red transition-all transform hover:scale-110 active:scale-95 p-1"
                  title="Bloku sil"
                >
                  <app-icon name="x" [size]="16"></app-icon>
                </button>
              </div>
            </div>

            <!-- Editor with Smart Collapse -->
            <div class="p-1 relative">
                <textarea
                  #textareaRef
                  [ngModel]="msg.content"
                  (ngModelChange)="updateMessageContent($index, $event)"
                  placeholder="Giriş məlumatı daxil et..."
                  class="w-full bg-transparent p-3 text-base md:text-sm text-cyber-text placeholder-cyber-border focus:outline-none resize-none font-mono leading-relaxed rounded-b-sm selection:bg-neon-green selection:text-black block transition-all duration-200"
                  [class.h-10]="focusedIndex() !== $index && msg.content.length > 0"
                  [class.overflow-hidden]="focusedIndex() !== $index"
                  [class.whitespace-nowrap]="focusedIndex() !== $index"
                  [class.text-ellipsis]="focusedIndex() !== $index"
                  (focus)="onFocus($index)"
                  (blur)="onBlur($index)"
                  (input)="autoResize($event)"
                  (keydown.control.enter)="submit()"
                ></textarea>
                
                <!-- Recording Indicator overlay -->
                @if (recordingIndex() === $index) {
                  <div class="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
                     <span class="w-2 h-2 bg-neon-red rounded-full animate-ping"></span>
                     <span class="text-[9px] text-neon-red font-bold uppercase tracking-widest animate-pulse">Recording...</span>
                  </div>
                }
            </div>
            
            <!-- Decor corner -->
            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20"></div>
          </div>
        }

        <!-- Add Button -->
        <button 
          (click)="addMessage()"
          class="w-full py-4 border border-dashed border-cyber-border hover:border-neon-green/50 bg-cyber-black/30 hover:bg-neon-green/5 rounded-sm text-cyber-muted hover:text-neon-green transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest group active:scale-[0.99] relative overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-neon-green/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          <app-icon name="plus" [size]="14" class="group-hover:rotate-90 transition-transform duration-300"></app-icon>
          <span>Yeni Mesaj Bloku</span>
        </button>
      </div>

      <!-- JSON Import Modal -->
      @if (showImportModal()) {
        <div class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div class="bg-cyber-dark border border-cyber-border w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[80vh]">
              <div class="p-3 border-b border-cyber-border flex justify-between items-center bg-cyber-black">
                 <h3 class="text-neon-blue font-bold text-xs uppercase tracking-widest">JSON Import</h3>
                 <button (click)="showImportModal.set(false)" class="text-cyber-muted hover:text-white"><app-icon name="x" [size]="16"></app-icon></button>
              </div>
              <div class="p-4 flex-1 flex flex-col gap-2">
                 <p class="text-[10px] text-cyber-muted">
                    Raw JSON Array (<code>[&#123;"role": "...", "content": "..."&#125;]</code>) daxil edin:
                 </p>
                 <textarea 
                   [(ngModel)]="jsonImportContent"
                   class="w-full h-64 bg-black border border-cyber-border text-neon-green font-mono text-xs p-3 focus:outline-none focus:border-neon-blue resize-none"
                   placeholder='[{"role": "user", "content": "Hello"}]'
                 ></textarea>
              </div>
              <div class="p-3 border-t border-cyber-border bg-cyber-black flex justify-end gap-2">
                 <button (click)="showImportModal.set(false)" class="px-4 py-2 text-xs text-cyber-muted hover:text-white">Ləğv et</button>
                 <button (click)="processJsonImport()" class="px-4 py-2 bg-neon-blue/10 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/20 text-xs font-bold uppercase tracking-wider rounded-sm">Import</button>
              </div>
           </div>
        </div>
      }

      <!-- Command Dock (Bottom Gradient Area) -->
      <div class="absolute bottom-0 left-0 w-full z-30 pointer-events-none">
         <!-- Gradient Fade -->
         <div class="h-32 bg-gradient-to-t from-cyber-black via-cyber-black/95 to-transparent flex flex-col justify-end items-center pb-4 md:pb-6 px-4 md:px-6">
            
            <div class="w-full max-w-lg relative group pointer-events-auto">
              <!-- Run Button -->
              <button 
                (click)="submit()"
                [disabled]="loading()"
                class="w-full h-14 bg-cyber-dark border font-bold rounded-sm shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group-active:scale-[0.98] relative overflow-hidden z-10"
                [class.border-neon-blue]="!loading()"
                [class.text-neon-blue]="!loading()"
                [class.hover:bg-neon-blue]="!loading()"
                [class.hover:text-black]="!loading()"
                [class.shadow-[0_0_20px_rgba(0,209,255,0.2)]]="!loading()"
                [class.border-neon-red]="loading()"
                [class.text-neon-red]="loading()"
                [class.bg-neon-red/10]="loading()"
              >
                <!-- Button Content -->
                @if (loading()) {
                  <app-icon name="refresh-cw" [size]="20" class="animate-spin"></app-icon>
                  <span class="tracking-[0.2em] animate-pulse">SORĞU EMAL EDİLİR...</span>
                } @else {
                   <app-icon name="play" [size]="20" class="fill-current"></app-icon>
                   <span class="tracking-[0.2em]">SORĞUNU İCRA ET</span>
                }
              </button>
              
              <!-- Decorative Glitch Border (Pseudo) -->
              <div class="absolute -inset-0.5 bg-gradient-to-r from-neon-blue to-neon-purple opacity-30 blur-sm -z-10 group-hover:opacity-60 transition-opacity duration-300 rounded-sm"
                   [class.hidden]="loading()"></div>
            </div>

            <div class="text-center mt-2 text-[10px] text-cyber-muted font-mono uppercase tracking-widest hidden md:block opacity-50">
               ShortCut: Ctrl + Enter
            </div>
         </div>
      </div>

    </div>
  `
})
export class ChatComponent implements OnDestroy {
  messages = model.required<ChatMessage[]>();
  loading = input<boolean>(false);
  runRequest = output<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  // Access all textareas to handle auto-resize
  textareas = viewChildren<ElementRef<HTMLTextAreaElement>>('textareaRef');

  recordingIndex = signal<number | null>(null);
  focusedIndex = signal<number | null>(null);
  
  // JSON Import State
  showImportModal = signal(false);
  jsonImportContent = '';
  
  recognition: any;
  tempTranscript = ''; 
  originalContent = ''; 

  constructor() {
    // Effect to handle auto-resizing when messages change or focus changes
    effect(() => {
      // Trigger dependency on messages, textareas and focus
      const msgs = this.messages();
      const els = this.textareas();
      const focused = this.focusedIndex();

      // Schedule resize after DOM update
      setTimeout(() => {
        els.forEach((t, i) => {
            if (i === focused) {
                this.adjustHeight(t.nativeElement);
            } else {
                // If collapsed, height is handled by CSS classes (h-10)
                // But we reset to auto just in case
                if (t.nativeElement.value === '') {
                    t.nativeElement.style.height = 'auto';
                }
            }
        });
      });
    });

    this.initSpeechRecognition();
  }

  ngOnDestroy() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  processJsonImport() {
      try {
          const parsed = JSON.parse(this.jsonImportContent);
          if (Array.isArray(parsed)) {
              // Basic Validation
              const valid = parsed.every(m => m.role && typeof m.content === 'string');
              if (valid) {
                  this.messages.set(parsed);
                  this.showImportModal.set(false);
                  this.jsonImportContent = '';
                  this.scrollToBottom();
              } else {
                  alert('JSON formatı yalnışdır. Role və Content sahələri mütləqdir.');
              }
          } else {
              alert('JSON Array olmalıdır.');
          }
      } catch(e) {
          alert('JSON sintaksis xətası.');
      }
  }

  onFocus(index: number) {
      this.focusedIndex.set(index);
      // Immediate resize on focus
      setTimeout(() => {
          const els = this.textareas();
          if (els && els[index]) {
            this.adjustHeight(els[index].nativeElement);
          }
      });
  }

  onBlur(index: number) {
      this.focusedIndex.set(null);
  }

  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = navigator.language || 'en-US';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
           const index = this.recordingIndex();
           if (index !== null) {
             this.originalContent = this.messages()[index].content || '';
             this.tempTranscript = '';
           }
        };

        this.recognition.onresult = (event: any) => {
          const index = this.recordingIndex();
          if (index === null) return;

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
             this.originalContent = (this.originalContent + ' ' + finalTranscript).trim();
          }
          
          const displayContent = (this.originalContent + ' ' + interimTranscript).trim();
          
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            newMsgs[index] = { ...newMsgs[index], content: displayContent };
            return newMsgs;
          });
          
          // Trigger resize for the active textarea
          const textareas = this.textareas();
          if (textareas && textareas[index]) {
            this.adjustHeight(textareas[index].nativeElement);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          this.recordingIndex.set(null);
        };

        this.recognition.onend = () => {
          if (this.recordingIndex() !== null) {
            this.recordingIndex.set(null);
          }
        };
      }
    }
  }

  getRoleStyles(role: string): string {
    switch (role) {
      case 'system': return 'border-neon-red/20 shadow-[0_0_10px_rgba(255,0,60,0.05)]';
      case 'user': return 'border-neon-green/20 shadow-[0_0_10px_rgba(0,255,65,0.05)]';
      case 'assistant': return 'border-neon-blue/20 shadow-[0_0_10px_rgba(0,209,255,0.05)]';
      default: return 'border-cyber-border';
    }
  }

  addMessage() {
    this.messages.update(msgs => [...msgs, { role: 'user', content: '' }]);
    this.scrollToBottom();
  }

  removeMessage(index: number) {
    this.messages.update(msgs => msgs.filter((_, i) => i !== index));
    if (this.recordingIndex() === index) {
      this.recognition.stop();
      this.recordingIndex.set(null);
    }
  }

  clearMessages() {
    this.messages.set([{ role: 'system', content: 'You are a helpful AI assistant.' }]);
    this.recordingIndex.set(null);
  }

  updateMessageContent(index: number, content: string) {
    this.messages.update(msgs => {
      const newMsgs = [...msgs];
      newMsgs[index] = { ...newMsgs[index], content };
      return newMsgs;
    });
  }

  submit() {
    if (!this.loading()) {
      this.runRequest.emit();
    }
  }

  toggleRecording(index: number) {
     if (!this.recognition) {
       alert('Brauzeriniz səs tanıma funksiyasını dəstəkləmir (Google Chrome və ya Edge istifadə edin).');
       return;
     }

     if (this.recordingIndex() === index) {
       this.recognition.stop();
       this.recordingIndex.set(null);
     } else {
       if (this.recordingIndex() !== null) {
         this.recognition.stop();
       }
       
       this.recordingIndex.set(index);
       try {
         this.recognition.start();
       } catch(e) {
         console.warn('Recognition start failed', e);
         this.recordingIndex.set(null);
       }
     }
  }

  adjustHeight(element: HTMLTextAreaElement) {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  autoResize(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.adjustHeight(target);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
