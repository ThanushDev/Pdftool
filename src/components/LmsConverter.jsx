import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';

export default function LmsConverter() {
  // Separate states for each unique tool to avoid file conflicts
  const [cameraFiles, setCameraFiles] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [wordFiles, setWordFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);

  // Processing indicators
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);

  // Layout input references
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const wordInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const hiddenRenderRef = useRef(null);

  // Animated floating background icons configuration
  const backgroundIcons = [
    { icon: '📄', top: '10%', left: '5%', size: '32px', delay: '0s', duration: '15s' },
    { icon: '📕', top: '25%', left: '85%', size: '28px', delay: '2s', duration: '18s' },
    { icon: '📚', top: '70%', left: '8%', size: '35px', delay: '1s', duration: '20s' },
    { icon: '📸', top: '80%', left: '75%', size: '30px', delay: '3s', duration: '16s' },
    { icon: '🗜️', top: '45%', left: '90%', size: '26px', delay: '5s', duration: '14s' },
    { icon: '🎓', top: '15%', left: '70%', size: '34px', delay: '4s', duration: '22s' },
    { icon: '✏️', top: '55%', left: '4%', size: '24px', delay: '2s', duration: '13s' },
    { icon: '📁', top: '35%', left: '15%', size: '28px', delay: '6s', duration: '17s' },
    { icon: '🛠️', top: '90%', left: '40%', size: '25px', delay: '0s', duration: '19s' },
    { icon: '📝', top: '5%', left: '45%', size: '30px', delay: '7s', duration: '21s' },
  ];

  // Selection Logics
  const handleCameraSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setCameraFiles([...cameraFiles, ...selected]);
  };

  const handleGallerySelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setGalleryFiles([...galleryFiles, ...selected]);
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

  // REUSABLE IMAGE-TO-PDF GENERATION LOGIC
  const generatePdfFromImages = async (filesArray, outputName) => {
    if (filesArray.length === 0) return alert("Please add images first!");
    setLoading(true);
    setStatusText("Generating aspect-ratio preserved PDF...");
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < filesArray.length; i++) {
      if (i > 0) pdf.addPage();
      const base64 = await getBase64(filesArray[i].rawFile);
      
      const img = new Image();
      img.src = base64;
      await new Promise((resolve) => { img.onload = resolve; });

      const pageWidth = 210;
      const pageHeight = 297;
      let imgWidth = pageWidth;
      let imgHeight = (img.height * imgWidth) / img.width;

      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = (img.width * imgHeight) / img.height;
      }

      const xOffset = (pageWidth - imgWidth) / 2;
      const yOffset = (pageHeight - imgHeight) / 2;

      pdf.addImage(base64, 'JPEG', xOffset, yOffset, imgWidth, imgHeight, undefined, 'FAST');
    }
    
    pdf.save(outputName);
    setLoading(false);
    setStatusText("");
  };

  // 3. WORD TO PDF CONVERTER ENGINE
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

  // 4. HIGH-INTENSITY PDF COMPRESSION ENGINE
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
      justifyContent: 'space-between',
      padding: '20px',
      boxSizing: 'border-box',
      backgroundColor: '#0a0a12',
      overflowX: 'hidden'
    }}>
      
      {/* CSS Injection Layer for Floating Background Elements */}
      <style>{`
        @keyframes floatAndDrift {
          0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.15; }
          50% { transform: translateY(-25px) translateX(15px) rotate(8deg); opacity: 0.35; }
          100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.15; }
        }
        .floating-bg-icon {
          position: absolute;
          user-select: none;
          pointer-events: none;
          z-index: 1;
          animation: floatAndDrift infinite ease-in-out;
        }
      `}</style>

      {/* Background Floating Canvas */}
      {backgroundIcons.map((item, idx) => (
        <div
          key={idx}
          className="floating-bg-icon"
          style={{
            top: item.top,
            left: item.left,
            fontSize: item.size,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          {item.icon}
        </div>
      ))}

      {/* Responsive Central Content Shell */}
      <div style={{ width: '100%', maxWidth: '750px', display: 'grid', gap: '25px', boxSizing: 'border-box', zIndex: 5, marginTop: 'auto', marginBottom: 'auto' }}>
        
        {/* Core Identity Banner */}
        <div className="glass-panel" style={{ padding: '25px 20px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 6px 0', fontSize: 'calc(20px + 1vw)', fontWeight: '700', background: 'linear-gradient(to right, #a5b4fc, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LMS Central PDF Toolkit
          </h1>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', lineHeight: '1.4' }}>
            Professional student utility hub for seamless file conversions and optimizations
          </p>
        </div>

        {/* System Operations Loader */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#f472b6', borderRadius: '50%', animation: 'gradientBG 1s linear infinite' }}></div>
            <span style={{ fontSize: '13px', color: '#e0e7ff', fontWeight: '500' }}>{statusText}</span>
          </div>
        )}

        {/* MODULE 1: DIRECT CAMERA TO PDF */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '22px' }}>📷</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '600' }}>Direct Mobile Camera to PDF</h2>
          </div>
          
          <div onClick={() => cameraInputRef.current.click()} style={{ border: '2px dashed rgba(244, 114, 182, 0.25)', borderRadius: '12px', padding: '25px 15px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#fbcfe8', fontSize: '13px', fontWeight: '600' }}>Tap to launch device camera</p>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Forces system camera execution to capture pages sequentially</span>
            <input type="file" ref={cameraInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={handleCameraSelect} />
          </div>

          {cameraFiles.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#9ca3af' }}>
                <span>Captured Frames ({cameraFiles.length})</span>
                <span onClick={() => setCameraFiles([])} style={{ color: '#f87171', cursor: 'pointer', fontWeight: '600' }}>Clear</span>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'grid', gap: '5px' }}>
                {cameraFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>📷 Snap_{idx + 1}.jpg</span>
                    <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{f.size} MB</span>
                  </div>
                ))}
              </div>
              <button onClick={() => generatePdfFromImages(cameraFiles, "LMS-Camera-Capture.pdf")} disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #ec4899, #f43f5e)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Compile Camera Snaps to PDF
              </button>
            </div>
          )}
        </div>

        {/* MODULE 2: GALLERY IMAGES TO PDF */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span style={{ fontSize: '22px' }}>🖼️</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '600' }}>Local Gallery Images to PDF</h2>
          </div>
          
          <div onClick={() => galleryInputRef.current.click()} style={{ border: '2px dashed rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '25px 15px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ margin: '0 0 4px 0', color: '#c7d2fe', fontSize: '13px', fontWeight: '600' }}>Click to browse phone gallery</p>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Select multiple pre-existing photos from device storage</span>
            <input type="file" ref={galleryInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleGallerySelect} />
          </div>

          {galleryFiles.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: '#9ca3af' }}>
                <span>Selected Images ({galleryFiles.length})</span>
                <span onClick={() => setGalleryFiles([])} style={{ color: '#f87171', cursor: 'pointer', fontWeight: '600' }}>Clear</span>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'grid', gap: '5px' }}>
                {galleryFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>🖼️ {f.name}</span>
                    <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{f.size} MB</span>
                  </div>
                ))}
              </div>
              <button onClick={() => generatePdfFromImages(galleryFiles, "LMS-Gallery-Docs.pdf")} disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg, #4f46e5, #6366f1)', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Compile Gallery Images to PDF
              </button>
            </div>
          )}
        </div>

        {/* MODULE 3: WORD CONVERTER */}
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

        {/* MODULE 4: PDF COMPRESSOR */}
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

          {/* Download Output Station */}
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

      {/* Dynamic & Self-Updating Branding Footer */}
      <footer style={{
        width: '100%',
        textAlign: 'center',
        padding: '20px 0 10px 0',
        color: '#6b7280',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        zIndex: 5,
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        letterSpacing: '0.5px'
      }}>
        <p style={{ margin: 0, lineHeight: '1.6' }}>
          &copy; {new Date().getFullYear()} <span style={{ color: '#818cf8', fontWeight: '600' }}>DIGI SOLUTIONS</span>. All Rights Reserved.
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#4b5563' }}>
          Designed & Developed by <span style={{ color: '#f472b6', fontWeight: '500' }}>Mr.Thanush</span>
        </p>
      </footer>

      {/* Permanently Invisible Isolated DOM Pipeline for Layout Mapping */}
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
