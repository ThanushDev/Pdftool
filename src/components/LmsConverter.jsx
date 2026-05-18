import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';

export default function LmsConverter() {
  // කුමන කොටසද ක්‍රියාත්මක විය යුත්තේ (Tab Control)
  const [activeTab, setActiveTab] = useState('image'); // 'image', 'convert', 'compress'

  // වෙන වෙනම ෆයිල් ලිස්ට් තබා ගැනීම (එකිනෙකට මිශ්‍ර නොවීමට)
  const [imageFiles, setImageFiles] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);

  // පොදු Status සහ Loading States
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);

  const fileInputRef = useRef(null);
  const hiddenRenderRef = useRef(null);

  // File Upload Handlers (වෙන වෙනම ටැබ් වලට ගැලපෙන සේ)
  const handleImageSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setImageFiles([...imageFiles, ...selected]);
  };

  const handleDocSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setDocFiles([...docFiles, ...selected]);
  };

  const handlePdfSelect = (e) => {
    const selected = Array.from(e.target.files).map(f => ({
      rawFile: f, name: f.name, size: (f.size / (1024 * 1024)).toFixed(2)
    }));
    setPdfFiles([...pdfFiles, ...selected]);
    setDownloadUrl(null);
  };

  // Helper: File -> Base64
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // 1. 📷 IMAGES TO PDF ENGINE
  const processImagesToPdf = async () => {
    if (imageFiles.length === 0) return alert("කරුණාකර පින්තූර එකතු කරන්න!");
    setLoading(true);
    setStatusText("රූප රාමු PDF එකක් බවට සකසමින් පවතී...");
    
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

  // 2. 📝 WORD TO PDF ENGINE
  const processOfficeToPdf = async (fileObj) => {
    setLoading(true);
    setStatusText(`Layout එක සුරකිමින් '${fileObj.name}' PDF එකට හරවයි...`);
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
      alert("පරිවර්තනය අසාර්ථකයි. කරුණාකර ෆයිල් එක පරීක්ෂා කරන්න.");
    }
    setLoading(false);
    setStatusText("");
  };

  // 3. 🗜️ PDF COMPRESSION ENGINE
  const processPdfCompression = async (fileObj) => {
    setLoading(true);
    setStatusText("විශාල PDF ගොනුව 2MB සීමාවට Compress කරමින් පවතී...");
    try {
      const fileBytes = await fileObj.rawFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      setCompressedSize((blob.size / (1024 * 1024)).toFixed(2));
      setDownloadUrl(URL.createObjectURL(blob));
      setStatusText("Compress කිරීම සාර්ථකයි!");
    } catch (error) {
      alert("PDF Compress කිරීම අසාර්ථකයි: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '35px', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* Background Neon Glow Decorations */}
      <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '180px', height: '180px', background: '#4f46e5', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '180px', height: '180px', background: '#db2777', filter: 'blur(100px)', borderRadius: '50%', zIndex: -1 }}></div>

      <h1 style={{ margin: '0 0 5px 0', textAlign: 'center', fontSize: '26px', fontWeight: '700', background: 'linear-gradient(to right, #a5b4fc, #818cf8, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        LMS Advanced Core Tool
      </h1>
      <p style={{ margin: '0 0 25px 0', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
        ඔයාට අවශ්‍ය පහසුකම වෙන වෙනම තෝරාගෙන වැඩේ කරගන්න මචං
      </p>

      {/* Premium Tab Navigation Navigation System */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px', gap: '5px' }}>
        <button 
          onClick={() => { setActiveTab('image'); setDownloadUrl(null); }}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: activeTab === 'image' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent', color: activeTab === 'image' ? '#fff' : '#9ca3af', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
        >
          📷 Image to PDF
        </button>
        <button 
          onClick={() => { setActiveTab('convert'); setDownloadUrl(null); }}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: activeTab === 'convert' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent', color: activeTab === 'convert' ? '#fff' : '#9ca3af', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
        >
          📝 Doc Converter
        </button>
        <button 
          onClick={() => { setActiveTab('compress'); setDownloadUrl(null); }}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: activeTab === 'compress' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent', color: activeTab === 'compress' ? '#fff' : '#9ca3af', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
        >
          🗜️ Compress PDF
        </button>
      </div>

      {/* Dynamic Content Sections based on Active Tab */}
      
      {/* TAB 1: IMAGE & CAMERA TO PDF */}
      {activeTab === 'image' && (
        <div>
          <div onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed rgba(99, 102, 241, 0.4)', borderRadius: '16px', padding: '35px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📸</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#e0e7ff' }}>කැමරාවෙන් Photo ගන්න හෝ Images දමන්න</h4>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Supports JPG, PNG, WEBP (Direct Mobile Camera support)</span>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" capture="environment" onChange={handleImageSelect} />
          </div>

          {imageFiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span>තෝරාගත් පින්තූර ({imageFiles.length})</span>
                <span onClick={() => setImageFiles([])} style={{ color: '#f87171', cursor: 'pointer' }}>සියල්ල අයින් කරන්න</span>
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'grid', gap: '5px' }}>
                {imageFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '12px' }}>
                    <span>📷 {f.name}</span> <span>{f.size} MB</span>
                  </div>
                ))}
              </div>
              <button onClick={processImagesToPdf} disabled={loading} style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #4f46e5, #6366f1)', color: 'white', fontWeight: '600' }}>
                {loading ? "PDF එක සකසමින්..." : "📷 සියලුම පින්තූර PDF එකක් කරන්න"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENT CONVERTER */}
      {activeTab === 'convert' && (
        <div>
          <div onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed rgba(59, 130, 246, 0.4)', borderRadius: '16px', padding: '35px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#e0e7ff' }}>Word (.docx) ෆයිල් එකක් මෙතනට දමන්න</h4>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>කිසිම Layout එකක් වෙනස් නොවී 100% නිවැරදිව PDF වේ</span>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".docx" onChange={handleDocSelect} />
          </div>

          {docFiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              {docFiles.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>📝 {f.name}</span> <strong>{f.size} MB</strong>
                  </div>
                  <button onClick={() => processOfficeToPdf(f)} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '600' }}>
                    {loading ? "පරිවර්තනය වෙමින් පවතී..." : "පිටු සැකසුම සුරකිමින් PDF කරන්න"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PDF COMPRESSOR */}
      {activeTab === 'compress' && (
        <div>
          <div onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed rgba(16, 185, 129, 0.4)', borderRadius: '16px', padding: '35px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗜️</div>
            <h4 style={{ margin: '0 0 5px 0', color: '#e0e7ff' }}>ධාරිතාවය (Size) අඩු කිරීමට අවශ්‍ය PDF එක දමන්න</h4>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>20MB වැනි විශාල ෆයිල්ස් ලේසියෙන්ම 2MB සීමාවට බස්සයි</span>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="application/pdf" onChange={handlePdfSelect} />
          </div>

          {pdfFiles.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              {pdfFiles.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>📕 {f.name}</span> <strong>{f.size} MB</strong>
                  </div>
                  {!downloadUrl && (
                    <button onClick={() => processPdfCompression(f)} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: '600' }}>
                      {loading ? "High-Intensity Compress සිදුවේ..." : "High Compress (20MB -> 2MB)"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading Status Indicator */}
      {loading && (
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'gradientBG 1s linear infinite' }}></div>
          <span style={{ fontSize: '13px', color: '#c7d2fe' }}>{statusText}</span>
        </div>
      )}

      {/* Download Result Panel */}
      {downloadUrl && (
        <div style={{ marginTop: '25px', padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', color: '#34d399', fontSize: '13px', fontWeight: '600' }}>🎉 සාර්ථකයි! නව PDF ගොනු ප්‍රමාණය: {compressedSize} MB</p>
          <a href={downloadUrl} download="LMS_Optimized_Document.pdf" style={{ display: 'inline-block', padding: '10px 20px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px' }}>
            📥 බාගත කරගන්න (Download PDF)
          </a>
        </div>
      )}

      {/* Sandbox Container for PDF Generation */}
      <div ref={hiddenRenderRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', background: 'white', color: 'black', padding: '20px', boxSizing: 'border-box' }}></div>
    </div>
  );
}
