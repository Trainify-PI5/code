import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileVideo, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface UploadMediaProps {
  onUploadComplete: (assetId: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export const UploadMedia: React.FC<UploadMediaProps> = ({ 
  onUploadComplete, 
  accept = "video/mp4,video/webm,video/quicktime",
  maxSizeMB = 500
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`O arquivo excede o limite de ${maxSizeMB}MB.`);
      setStatus('ERROR');
      return;
    }

    setFile(selected);
    setStatus('IDLE');
    setErrorMsg('');
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus('UPLOADING');
      setProgress(0);

      // 1. Solicita Presigned URL
      const { data: urlData } = await api.post('/media/upload-url', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream'
      });

      const presignedUrl = urlData.url;
      const key = urlData.key;

      // 2. Faz o upload direto para o S3 via XMLHttpRequest para ter progresso real
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Erro no upload para o S3'));
          }
        };

        xhr.onerror = () => reject(new Error('Falha na rede durante o upload'));
        
        xhr.send(file);
      });

      // 3. Confirma o upload no backend
      const { data: completeData } = await api.post('/media/upload-complete', {
        key,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size
      });

      setStatus('SUCCESS');
      onUploadComplete(completeData.id);

    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      setErrorMsg(err.message || 'Erro desconhecido ao enviar arquivo.');
    }
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setStatus('IDLE');
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-outline-variant rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors group"
        >
          <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <UploadCloud className="w-6 h-6 text-on-surface-variant group-hover:text-primary" />
          </div>
          <p className="text-on-surface-variant font-medium">Clique para selecionar um vídeo</p>
          <p className="text-sm text-on-surface-variant mt-1">MP4, WebM ou MOV (Máx. {maxSizeMB}MB)</p>
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <FileVideo className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
              <p className="text-xs text-on-surface-variant">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            
            {status === 'IDLE' && (
              <div className="flex gap-2">
                <button onClick={reset} className="p-2 text-on-surface-variant hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleUpload}
                  className="px-4 py-2 bg-primary-container text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
                >
                  Fazer Upload
                </button>
              </div>
            )}
            {status === 'SUCCESS' && (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            )}
          </div>

          {status === 'UPLOADING' && (
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-on-surface-variant mb-1">
                <span>Enviando...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-outline-variant rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
              <button onClick={reset} className="ml-auto underline font-medium">Tentar novamente</button>
            </div>
          )}
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
    </div>
  );
};
