import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  X, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { uploadHeadshot, createJob, getJobStatus, streamJobStatus } from './api';

function App() {
  // Form input state
  const [prompt, setPrompt] = useState('');
  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [numThumbnails, setNumThumbnails] = useState(1);
  
  // Status state
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Active job details
  const [jobId, setJobId] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [thumbnails, setThumbnails] = useState([]);
  
  // Drag & drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle file drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop events
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileSelect(file);
    }
  };

  // Handle file input selection
  const handleFileInputChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFileSelect(file);
    }
  };

  // Process selected file and upload to ImageKit
  const handleFileSelect = async (file) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file.');
      return;
    }

    setHeadshotFile(file);
    setIsUploading(true);
    setErrorMessage('');
    
    try {
      const result = await uploadHeadshot(file);
      setHeadshotUrl(result.url);
      setSuccessMessage('Headshot uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to upload headshot. Please try again.');
      setHeadshotFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Clear preview and upload states
  const handleRemoveFile = () => {
    setHeadshotFile(null);
    setHeadshotUrl('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit job to backend and trigger real-time updates
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setErrorMessage('Please enter a description prompt.');
      return;
    }
    if (!headshotUrl) {
      setErrorMessage('Please upload a headshot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setJobId('');
    setJobStatus('pending');
    setThumbnails([]);

    // Close any existing SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // 1. Create job
      const response = await createJob(prompt, headshotUrl, numThumbnails);
      const newJobId = response.job_id;
      setJobId(newJobId);

      // 2. Fetch initial details to set placeholders
      const jobDetails = await getJobStatus(newJobId);
      setJobStatus(jobDetails.status);
      setThumbnails(jobDetails.thumbnails);

      // 3. Connect to EventSource for live progress updates
      eventSourceRef.current = streamJobStatus(newJobId, {
        onThumbnailReady: (data) => {
          setThumbnails(prev => prev.map(t => {
            if (t.style_name === data.style_name) {
              return { 
                ...t, 
                status: 'uploaded', 
                imagekit_url: data.imagekit_url, 
                variants: data.variants 
              };
            }
            return t;
          }));
        },
        onThumbnailFailed: (data) => {
          setThumbnails(prev => prev.map(t => {
            if (t.style_name === data.style_name) {
              return { ...t, status: 'failed', error_message: data.error };
            }
            return t;
          }));
        },
        onCompleted: (data) => {
          setJobStatus(data.status);
          setIsSubmitting(false);
          setSuccessMessage('All thumbnails generated successfully!');
          setTimeout(() => setSuccessMessage(''), 4000);
        },
        onError: () => {
          setErrorMessage('Streaming connection lost. Refreshing status...');
          // Fallback check
          getJobStatus(newJobId).then(details => {
            setJobStatus(details.status);
            setThumbnails(details.thumbnails);
            if (details.status === 'completed' || details.status === 'failed') {
              setIsSubmitting(false);
            }
          });
        }
      });

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while generating thumbnails.');
      setIsSubmitting(false);
      setJobStatus('failed');
    }
  };

  // Helper to trigger safe image download
  const handleDownload = async (url, style) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `thumbnail-${style || 'generated'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <Video className="logo-icon" />
          <h1 className="logo-text">Thumbnail AI</h1>
        </div>
        <div className="status-indicator">
          {jobStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="form-label" style={{ margin: 0 }}>System Status:</span>
              <span className={`status-badge ${jobStatus}`}>{jobStatus}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="main-grid">
        {/* Left Column: Form Controls */}
        <section className="card">
          <h2 className="card-title">
            <Sparkles size={20} className="logo-icon" />
            Generator Options
          </h2>

          <form onSubmit={handleGenerate}>
            {/* 1. Upload Headshot */}
            <div className="form-group">
              <label className="form-label">Step 1: Upload Your Headshot</label>
              
              {!headshotFile ? (
                <div 
                  className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleFileInputChange}
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="upload-icon spinner" />
                      <p className="form-label" style={{ margin: 0 }}>Uploading to cloud...</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="upload-icon" />
                      <p className="form-label" style={{ margin: 0 }}>
                        Drag & drop or <strong>browse</strong>
                      </p>
                      <p className="form-label" style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>
                        Supports PNG, JPG, JPEG
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="preview-container">
                  <img 
                    src={headshotUrl || URL.createObjectURL(headshotFile)} 
                    alt="Headshot preview" 
                    className="preview-image"
                  />
                  {!isUploading && (
                    <button 
                      type="button" 
                      onClick={handleRemoveFile}
                      className="remove-preview-btn"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Prompt Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="prompt-input">Step 2: Describe your Video Topic</label>
              <textarea
                id="prompt-input"
                className="text-input"
                placeholder="e.g. Gaming desktop setup review, full face reaction to scary game, coding tutorial for beginners"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* 3. Number of Thumbnails Selection */}
            <div className="form-group">
              <label className="form-label">Step 3: Number of Styles</label>
              <div className="btn-group">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn-group-option ${numThumbnails === num ? 'active' : ''}`}
                    onClick={() => setNumThumbnails(num)}
                    disabled={isSubmitting}
                  >
                    {num} Style{num > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="form-group" style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="form-group" style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <CheckCircle size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="action-button"
              disabled={isUploading || isSubmitting || !prompt || !headshotUrl}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate YouTube Thumbnails
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column: Previews and Streaming outputs */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="card-title">
            <ImageIcon size={20} className="logo-icon" />
            Generated Outputs
          </h2>

          {thumbnails.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '3rem' }}>
              <ImageIcon size={48} style={{ color: 'var(--text-muted)' }} />
              <p className="form-label" style={{ textAlign: 'center', margin: 0 }}>
                Configure the options and click Generate.
              </p>
              <p className="form-label" style={{ textAlign: 'center', margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Your generated images will appear here in real-time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Progress List */}
              <div className="progress-list">
                {thumbnails.map((t) => (
                  <div 
                    key={t.style_name} 
                    className={`progress-item ${t.status}`}
                  >
                    <span className="style-name">
                      {t.style_name.replace('_', ' ')} Style
                    </span>
                    <span className={`status-badge ${t.status}`}>
                      {t.status === 'uploaded' ? 'Ready' : t.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Outputs grid */}
              <div className="results-grid">
                {thumbnails.map((t) => {
                  if (t.status === 'uploaded' && t.imagekit_url) {
                    return (
                      <div key={t.id} className="result-card">
                        <div className="result-image-wrapper">
                          <img 
                            src={t.imagekit_url} 
                            alt={`${t.style_name} Style output`}
                            className="result-image"
                          />
                          <div className="result-overlay">
                            <span className="result-style">{t.style_name.replace('_', ' ')}</span>
                            <button
                              onClick={() => handleDownload(t.imagekit_url, t.style_name)}
                              className="download-icon-btn"
                              title="Download Thumbnail"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (t.status === 'generating' || t.status === 'pending') {
                    return (
                      <div key={t.style_name} className="result-card shimmer" style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                          <Loader2 className="spinner" style={{ width: '2rem', height: '2rem' }} />
                          <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {t.style_name.replace('_', ' ')} style...
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    return null;
                  }
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
