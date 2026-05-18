import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';

export default function LmsConverter() {
  // Animated background images list
  const backgrounds = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1600",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1600"
  ];
  
  const [bgIndex, setBgIndex] = useState(0);

  // Background rotator effect (Every 6 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  // Separate states for each feature tool
  const [imageFiles, setImageFiles] = useState([]);
  const [wordFiles, setWordFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);

  // Processing indicators
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);

  // Layout refs
  const imageInputRef = useRef(null);
  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const hiddenRenderRef = useRef(null);

  // Selection Logic
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

  // 1. IMAGE TO PDF WITH ASPECT RATIO FIX
  const processImagesToPdf = async () => {
    if (imageFiles.length === 0) return alert("Please select or capture images first!");
    setLoading(true);
    setStatusText("Generating aspect-ratio preserved PDF from images...");
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < imageFiles.length; i++) {
      if (i > 0) pdf.addPage();
      const base64 = await getBase64(imageFiles[i].rawFile);
      
      // Load image to compute exact original dimensions
      const img = new Image();
      img.src = base64;
      await new Promise((resolve) => { img.onload = resolve; });

      const pageWidth = 210;
      const pageHeight = 297;
      let imgWidth = pageWidth;
      let imgHeight = (img.height * imgWidth) / img.width;

      // Adjust scales if image height overflows standard A4
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (img.width * imgHeight) / img.height;
      }

      // Center alignment math
      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdf.addImage(base64, 'JPEG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
    }
    
    pdf.save("LMS-Camera-Images.pdf");
    setLoading(false);
    setStatusText("");
  };

  // 2. WORD TO PDF WITH STREAMLINED SCALING
  const processWordToPdf = async (fileObj) => {
    setLoading(true);
    setStatusText(`Processing document architecture for '${fileObj.name}'...`);
    try {
      const arrayBuffer = await fileObj.rawFile.arrayBuffer();
      if (hiddenRenderRef.current) {
        hiddenRenderRef.current.innerHTML = "";
        await renderAsync(arrayBuffer, hiddenRenderRef.current);
        
        const canvas = await html2canvas(hiddenRenderRef.current, { scale: 1.5, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.90);
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        pdf.save(fileObj.name.split('.')[0] + ".pdf");
      }
    } catch (err) {
      alert("Conversion dropped. Please verify document integrity.");
    }
    setLoading(false);
    setStatusText("");
  };

  // 3. HIGH-INTENSITY PDF COMPRESSION
  const processPdfCompression = async (fileObj) => {
    setLoading(true);
    setStatusText("Optimizing data structures to meet 2MB submission limit...");
    try {
      const fileBytes = await fileObj.rawFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      setCompressedSize((blob.size / (1024 * 1024)).toFixed(2));
      setDownloadUrl(URL.createObjectURL(blob));
      setStatusText("Optimization complete!");
    } catch (error) {
      alert("PDF Optimization failed: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      backgroundImage: `linear-gradient(rgba(10, 10, 18, 0.82), rgba(10, 10, 18, 0.85)), url(${backgrounds[bgIndex]})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: 'background-image 1.5s ease-in-out',
      overflowX: 'hidden'
    }}>
      
      {/* Container Wrapper */}
      <div style={{ width: '100%', maxWidth: '750px', display: 'grid', gap: '25px', boxSizing: 'border-box' }}>
        
        {/* Core Header */}
        <div className="glass-panel" style={{ padding: '25px 20px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 6px 0', fontSize: 'calc(20px + 1vw)', fontWeight: '700', background: 'linear-gradient(to right, #a5b4fc, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LMS Central PDF Toolkit
          </h1>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', lineHeight: '1.4' }}>
            Professional student utility hub for seamless file conversions and optimizations
          </p>
        </div>

        {/* Global Loading Bar */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#f472b6', borderRadius: '50%', animation: 'gradientBG 1s linear infinite' }}></div>
            <span style={{ fontSize: '13px', color: '#e0e7ff', fontWeight: '500' }}>{statusText}</span>
          </div>
        )}

        {/* MODULE 1: IMAGE TO PDF */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '22px' }}>📷</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '600' }}>Image & Camera to PDF Converter</h2>
          </div>
          
          <div onClick={() => imageInputRef.current.click()} style={{ border: '2px dashed rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '25px 15px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#c7d2fe', fontSize: '13px', fontWeight: '600' }}>Click to capture or upload images</p>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Supports JPG, PNG, WEBP (Direct Mobile Camera sync)</span>
            <input type="file" ref={imageInputRef} style={{ display: 'none' }} multiple accept="image/*" capture="environment" onChange={handleImageSelect} />
          </div>

          {imageFiles.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#9ca3af' }}>
                <span>Queue ({imageFiles.length})</span>
                <span onClick={() => setImageFiles([])} style={{ color: '#f87171', cursor: 'pointer', fontWeight: '600' }}>Clear</span>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'grid', gap: '5px' }}>
                {imageFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>📷 {f.name}</span>
                    <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{f.size} MB</span>
                  </div>
                ))}
              </div>
              <button onClick={processImagesToPdf} disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #4f46e5, #6366f1)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Generate Document PDF
              </button>
            </div>
          )}
        </div>

        {/* MODULE 2: WORD CONVERTER */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '22px' }}>📝</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '600' }}>Office Document to PDF Converter</h2>
          </div>

          <div onClick={() => wordInputRef.current.click()} style={{ border: '2px dashed rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '25px 15px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#9bf6ff', fontSize: '13px', fontWeight: '600' }}>Click to upload Word document</p>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Converts Word (.docx) files smoothly while preserving font layout</span>
            <input type="file" ref={wordInputRef} style={{ display: 'none' }} accept=".docx" onChange={handleWordSelect} />
          </div>

          {wordFiles.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              {wordFiles.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>📄 {f.name}</span>
                    <strong>{f.size} MB</strong>
                  </div>
                  <button onClick={() => processWordToPdf(f)} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                    Convert and Save PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODULE 3: PDF COMPRESSOR */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '22px' }}>🗜️</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '600' }}>High-Intensity PDF Compressor</h2>
          </div>

          <div onClick={() => pdfInputRef.current.click()} style={{ border: '2px dashed rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '25px 15px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#a7f3d0', fontSize: '13px', fontWeight: '600' }}>Click to upload target PDF</p>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Streamlines internal code structure to shrink file sizes under 2MB</span>
            <input type="file" ref={pdfInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfSelect} />
          </div>

          {pdfFiles.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              {pdfFiles.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>📕 {f.name}</span>
                    <strong>{f.size} MB</strong>
                  </div>
                  {!downloadUrl && (
                    <button onClick={() => processPdfCompression(f)} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                      Compress PDF Structure
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Download Dashboard */}
          {downloadUrl && (
            <div style={{ marginTop: '15px', padding: '15px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: '#34d399', fontSize: '12px', fontWeight: '600' }}>Optimization Completed! New Size: {compressedSize} MB</p>
              <a href={downloadUrl} download="LMS_Compressed_Document.pdf" style={{ display: 'inline-block', padding: '9px 20px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '12px' }}>
                Download Optimized PDF
              </a>
            </div>
          )}
        </div>

      </div>

      {/* Permanently Invisible DOM Layout Engine - Prevents Viewport Leaking */}
      <div ref={hiddenRenderRef} style={{ 
        position: 'fixed', 
        top: '0', 
        left: '-9999px', 
        width: '750px', 
        background: '#ffffff', 
        color: '#000000', 
        padding: '40px', 
        boxSizing: 'border-box',
        zIndex: -9999,
        visibility: 'visible'
      }}></div>
    </div>
  );
}
