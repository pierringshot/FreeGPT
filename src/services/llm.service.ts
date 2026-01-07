import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  tools: Tool[];
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  async *streamMessage(config: ChatConfig, messages: ChatMessage[]): AsyncGenerator<CompletionResponse> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const baseUrl = config.baseUrl.replace(/\/$/, '');
      const url = `${baseUrl}/chat/completions`;

      // Sanitize messages to ensure only valid properties are sent
      const cleanMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Ensure numeric parameters are actually numbers (input[type=range] often binds as strings)
      const temperature = Number(config.temperature);
      const maxTokens = Number(config.maxTokens);
      const topP = Number(config.topP);

      // Clean up body parameters
      const body: any = {
        model: config.model,
        messages: cleanMessages,
        temperature: isNaN(temperature) ? 0.7 : temperature,
        max_tokens: isNaN(maxTokens) ? 1024 : maxTokens,
        top_p: isNaN(topP) ? 1.0 : topP,
        stream: true
      };

      // Only attach tools if they exist to prevent API errors with empty arrays on some providers
      if (config.tools && config.tools.length > 0) {
        body.tools = config.tools;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        if (response.status === 429) {
             throw new Error("Həddindən çox sorğu göndərilib, xahiş edirik bir az gözləyin");
        }
        
        // Robust Error Extraction
        const textBody = await response.text();
        let errorMessage = `API Xətası: ${response.status} ${response.statusText}`;
        
        try {
            const errorData = JSON.parse(textBody);
            if (errorData?.error) {
                if (typeof errorData.error === 'string') {
                    // Handle "openai_error" string case
                    errorMessage = errorData.error;
                } else if (typeof errorData.error === 'object') {
                     // Extract meaningful message from object
                     errorMessage = errorData.error.message || 
                                    errorData.error.code || 
                                    errorData.error.type ||
                                    JSON.stringify(errorData.error);
                }
            } else if (errorData?.message) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            // If JSON parse fails, use the raw text if short enough
            if (textBody && textBody.length < 200) {
                errorMessage += ` (${textBody})`;
            }
        }
        
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('Boş cavab gövdəsi');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedContent = '';
      let responseId = '';
      let responseModel = '';
      let responseCreated = Date.now();
      let usage: CompletionResponse['usage'] | undefined;
      
      let buffer = ''; // Buffer for incomplete chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        // Keep the last line in the buffer as it might be incomplete
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);
            
            // Capture metadata from first chunk or wherever it appears
            if (!responseId && data.id) {
                responseId = data.id;
                responseModel = data.model;
                responseCreated = data.created;
            }

            const choice = data.choices?.[0];
            const deltaContent = choice?.delta?.content || '';
            
            accumulatedContent += deltaContent;

            if (data.usage) {
                usage = data.usage;
            }

            const syntheticResponse: CompletionResponse = {
              id: responseId || 'streaming',
              object: 'chat.completion',
              created: responseCreated,
              model: responseModel || config.model,
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: accumulatedContent
                },
                finish_reason: choice?.finish_reason || ''
              }],
              usage: usage
            };

            yield syntheticResponse;

          } catch (e) {
            console.warn('JSON Parse Error in stream chunk:', dataStr);
          }
        }
      }
      
      // Process remaining buffer if any
      if (buffer.trim()) {
         const trimmed = buffer.trim();
         if (trimmed.startsWith('data: ')) {
             const dataStr = trimmed.slice(6);
             if (dataStr !== '[DONE]') {
                 try {
                    const data = JSON.parse(dataStr);
                    // Emit final chunk if valid
                    const choice = data.choices?.[0];
                    if (choice?.delta?.content) {
                       accumulatedContent += choice.delta.content;
                       yield {
                          id: responseId || 'streaming',
                          object: 'chat.completion',
                          created: responseCreated,
                          model: responseModel || config.model,
                          choices: [{
                            index: 0,
                            message: { role: 'assistant', content: accumulatedContent },
                            finish_reason: choice?.finish_reason || ''
                          }],
                          usage
                       };
                    }
                 } catch(e) {}
             }
         }
      }

    } catch (err: any) {
      console.error('LlmService Error:', err);
      // Ensure the error message is user-friendly
      const msg = err.message || 'Naməlum xəta baş verdi';
      this.error.set(msg);
      throw new Error(msg); // Re-throw with clean message
    } finally {
      this.loading.set(false);
    }
  }
}