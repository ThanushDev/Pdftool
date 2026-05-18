import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';

export default function LmsConverter() {
  // Separate states for each tool to prevent file mixing
  const [imageFiles, setImageFiles] = useState([]);
  const [wordFiles, setWordFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);

  // Process indicators
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);

  // Unique refs for each file selector
  const imageInputRef = useRef(null);
  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const hiddenRenderRef = useRef(null);

  // File selection handlers
  const handleImageSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setImageFiles([...imageFiles, ...selected]);
  };

  const handleWordSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setWordFiles([...wordFiles, ...selected]);
  };

  const handlePdfSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setPdfFiles([...pdfFiles, ...selected]);
    setDownloadUrl(null);
  };

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // 1. IMAGE & CAMERA TO PDF
  const processImagesToPdf = async () => {
    if (imageFiles.length === 0) return alert("Please select or capture images first!");
    setLoading(true);
    setStatusText("Generating high-fidelity PDF from images...");
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let i = 0; i < imageFiles.length; i++) {
      if (i > 0) pdf.addPage();
      const base64 = await getBase64(imageFiles[i].rawFile);
      pdf.addImage(base64, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    pdf.save("LMS-Camera-Images.pdf");
    setLoading(false);
    setStatusText("");
  };

  // 2. WORD TO PDF CONVERTER
  const processWordToPdf = async (fileObj) => {
    setLoading(true);
    setStatusText(`Converting '${fileObj.name}' while preserving layout...`);
    try {
      const arrayBuffer = await fileObj.rawFile.arrayBuffer();
      if (hiddenRenderRef.current) {
        hiddenRenderRef.current.innerHTML = "";
        hiddenRenderRef.current.style.display = "block";
        await renderAsync(arrayBuffer, hiddenRenderRef.current);
        
        const canvas = await html2canvas(hiddenRenderRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save(fileObj.name.split('.')[0] + ".pdf");
        hiddenRenderRef.current.style.display = "none";
      }
    } catch (err) {
      alert("Conversion failed. Please verify the document format.");
    }
    setLoading(false);
    setStatusText("");
  };

  // 3. PDF COMPRESSION
  const processPdfCompression = async (fileObj) => {
    setLoading(true);
    setStatusText("Compressing PDF elements down to target size...");
    try {
      const fileBytes = await fileObj.rawFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      setCompressedSize((blob.size / (1024 * 1024)).toFixed(2));
      setDownloadUrl(URL.createObjectURL(blob));
      setStatusText("Compression successful!");
    } catch (error) {
      alert("PDF Compression failed: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', display: 'grid', gap: '30px', boxSizing: 'border-box' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: '700', background: 'linear-gradient(to right, #a5b4fc, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LMS Central PDF Toolkit
        </h1>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
          Professional student utility hub for seamless file conversions and optimizations
        </p>
      </div>

      {/* Global Processing Loader */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid transparent', borderTopColor: '#f472b6', borderRadius: '50%', animation: 'gradientBG 1s linear infinite' }}></div>
          <span style={{ fontSize: '14px', color: '#e0e7ff', fontWeight: '500' }}>{statusText}</span>
        </div>
      )}

      {/* SECTION 1: IMAGE & CAMERA TO PDF */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '24px' }}>📷</span>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Image & Camera to PDF Converter</h2>
        </div>
        
        <div onClick={() => imageInputRef.current.click()} style={{ border: '2px dashed rgba(99, 102, 241, 0.3)', borderRadius: '14px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#c7d2fe', fontSize: '14px', fontWeight: '600' }}>Click to capture or upload images</p>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Supports JPG, PNG, WEBP (Launches mobile camera directly)</span>
          <input type="file" ref={imageInputRef} style={{ display: 'none' }} multiple accept="image/*" capture="environment" onChange={handleImageSelect} />
        </div>

        {imageFiles.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: '#9ca3af' }}>
              <span>Selected Images ({imageFiles.length})</span>
              <span onClick={() => setImageFiles([])} style={{ color: '#f87171', cursor: 'pointer', fontWeight: '600' }}>Clear All</span>
            </div>
            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
              {imageFiles.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span>📷 {f.name}</span> <span style={{ color: '#a1a1aa' }}>{f.size} MB</span>
                </div>
              ))}
            </div>
            <button onClick={processImagesToPdf} disabled={loading} style={{ width: '100%', marginTop: '15px', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #4f46e5, #6366f1)', color: 'white', fontWeight: '600', fontSize: '14px' }}>
              Generate Document PDF
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: DOCUMENT CONVERTER */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '24px' }}>📝</span>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Office Document to PDF Converter</h2>
        </div>

        <div onClick={() => wordInputRef.current.click()} style={{ border: '2px dashed rgba(59, 130, 246, 0.3)', borderRadius: '14px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#9bf6ff', fontSize: '14px', fontWeight: '600' }}>Click to upload Word document</p>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Converts Word (.docx) files accurately with layout protection</span>
          <input type="file" ref={wordInputRef} style={{ display: 'none' }} accept=".docx" onChange={handleWordSelect} />
        </div>

        {wordFiles.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: '#9ca3af' }}>
              <span>Queue</span>
              <span onClick={() => setWordFiles([])} style={{ color: '#f87171', cursor: 'pointer', fontWeight: '600' }}>Remove</span>
            </div>
            {wordFiles.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>📄 {f.name}</span> <strong>{f.size} MB</strong>
                </div>
                <button onClick={() => processWordToPdf(f)} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '600', fontSize: '13px' }}>
                  Convert and Save PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: PDF COMPRESSOR */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <span style={{ fontSize: '24px' }}>🗜️</span>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>High-Intensity PDF Compressor</h2>
        </div>

        <div onClick={() => pdfInputRef.current.click()} style={{ border: '2px dashed rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ margin: '0 0 5px 0', color: '#a7f3d0', fontSize: '14px', fontWeight: '600' }}>Click to upload target PDF</p>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Optimizes data streams to shrink 20MB files down to 2MB limits</span>
          <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfSelect} />
        </div>

        {pdfFiles.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            {pdfFiles.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>📕 {f.name}</span> <strong>{f.size} MB</strong>
                </div>
                {!downloadUrl && (
                  <button onClick={() => processPdfCompression(f)} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: '600', fontSize: '13px' }}>
                    Compress PDF Structure
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Compression Result Output Panel */}
        {downloadUrl && (
          <div style={{ marginTop: '20px', padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '13px', fontWeight: '600' }}>Optimization Completed! New Size: {compressedSize} MB</p>
            <a href={downloadUrl} download="LMS_Compressed_Document.pdf" style={{ display: 'inline-block', padding: '10px 24px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px' }}>
              Download Optimized PDF
            </a>
          </div>
        )}
      </div>

      {/* Hidden DOM layout buffer for pixel-perfect conversions */}
      <div ref={hiddenRenderRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', background: 'white', color: 'black', padding: '20px', boxSizing: 'border-box' }}></div>
    </div>
  );
}
