// frontend/src/components/FileUpload.jsx

import React, { useState, useRef } from 'react';
import { useMessages } from '../contexts/MessageContext';

export default function FileUpload({ threadId, onUploadComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const fileInputRef = useRef(null);
  const { uploadFiles } = useMessages();

  // Handle file selection
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0 && !messageContent.trim()) {
      alert("Please select files or enter a message");
      return;
    }

    setIsUploading(true);
    
    try {
      await uploadFiles(threadId, selectedFiles, messageContent);
      setSelectedFiles([]);
      setMessageContent("");
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📈';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '📦';
    return '📎';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Share Files</h3>
        
        {/* Message input */}
        <textarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          placeholder="Add a message with your files (optional)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={2}
        />
      </div>

      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <span className="text-4xl mb-2 block">📁</span>
          <p className="text-gray-600">
            Drag and drop files here, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              browse files
            </button>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Maximum 5 files, 10MB each
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        />
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={isUploading || (selectedFiles.length === 0 && !messageContent.trim())}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            isUploading || (selectedFiles.length === 0 && !messageContent.trim())
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </div>
    </div>
  );
}