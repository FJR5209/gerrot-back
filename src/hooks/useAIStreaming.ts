import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

type AIStatus = 'idle' | 'running' | 'error' | 'done';

interface AIStreamingProps {
  projectId: string;
  token?: string;
}

interface AIChunkPayload {
  textChunk?: string;
}

interface AIFinishedPayload {
  fullResponse?: string;
}

interface AIErrorPayload {
  message?: string;
}

export function useAIStreaming({ projectId, token }: AIStreamingProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<AIStatus>('idle');
  const [partial, setPartial] = useState<string>('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL;
    const socket = io(url, { 
      auth: token ? { token } : undefined, 
      autoConnect: false 
    });
    
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      if (projectId) socket.emit('join_project', { projectId });
    });

    socket.on('ai_started', () => { 
      setStatus('running'); 
      setPartial(''); 
    });
    
    socket.on('ai_chunk', (payload: AIChunkPayload) => { 
      setPartial((p) => p + (payload.textChunk || '')); 
    });
    
    socket.on('ai_finished', (payload: AIFinishedPayload) => { 
      setStatus('done'); 
      setPartial(payload.fullResponse || ''); 
    });
    
    socket.on('ai_error', (payload: AIErrorPayload) => { 
      setStatus('error'); 
      setError(payload.message || 'Erro na IA'); 
    });

    return () => { 
      socket.disconnect(); 
      socketRef.current = null; 
    };
  }, [projectId, token]);

  const sendPrompt = (context: unknown, task: { 
    currentScriptContent?: string; 
    userPrompt: string 
  }) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_prompt', { projectId, context, task });
  };

  return { status, partial, error, sendPrompt };
}