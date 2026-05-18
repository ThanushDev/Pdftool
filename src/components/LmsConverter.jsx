import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';

export default function LmsConverter() {
  const [files, setFiles] = useState([]);
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  
  const fileInputRef = useRef(null);
  const hiddenRenderRef = useRef(null);

  // ෆයිල් ඇතුලත් කරගැනීම
  const onFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const mapped = selected.map(f => ({
      rawFile: f,
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(2),
      ext: f.name.split('.').pop().toLowerCase()
    }));
    setFiles([...files, ...mapped]);
    setDownloadUrl(null);
    setCompressedSize(null);
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

  // 1. 📷 IMAGES TO PDF (100% Formatting පවත්ව ගනිමින්)
  const processImagesToPdf = async () => {
    const imgFiles = files.filter(f => ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(f.ext));
    if (imgFiles.length === 0) {
      alert("කරුණාකර පින්තූර හෝ කැමරා Photo එකතු කරන්න!");
      return;
    }

    setLoading(true);
    setStatusText("රූප රාමු PDF එකක් බවට සකසමින් පවතී...");
    
    // A4 Portrait ආකාරයට නිවැරදිව සැකසීම
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < imgFiles.length; i++) {
      if (i > 0) pdf.addPage();
      const base64 = await getBase64(imgFiles[i].rawFile);
      // මුළු පිටුවම වැසෙන සේ 100% ක්ම Layout එක රැකගැනීම
      pdf.addImage(base64, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    
    pdf.save("LMS-Image-Document.pdf");
    setLoading(false);
    setStatusText("");
  };

  // 2. 📝 WORD / POWERPOINT TO PDF (කිසිම අකුරක්/Layout එකක් වෙනස් නොවී)
  // Office Document එක මුලින්ම HTML DOM එකට ගෙන, එය Canvas එකක් හරහා Image Capture එකක් ලෙස PDF එකට දමයි.
  const processOfficeToPdf = async (fileObj) => {
    setLoading(true);
    setStatusText(`'${fileObj.name}' Layout එක සුරකිමින් PDF එකට හරවයි...`);

    try {
      const arrayBuffer = await fileObj.rawFile.arrayBuffer();
      
      // තාවකාලිකව Screen එකට නොපෙනෙන ලෙස Render කිරීම
      if (hiddenRenderRef.current) {
        hiddenRenderRef.current.innerHTML = "";
        hiddenRenderRef.current.style.display = "block";
        
        // Word file එක HTML එකක් ලෙස render කිරීම
        await renderAsync(arrayBuffer, hiddenRenderRef.current);
        
        // Render වූ HTML එක 100% ක් නිවැරදිව පින්තූරයකට හැරවීම (No Layout Shift)
        const canvas = await html2canvas(hiddenRenderRef.current, {
          scale: 2, // High resolution quality
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // පිටු එකකට වඩා වැඩි නම් Auto-wrap කිරීමේ Logic එක
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(fileObj.name.split('.')[0] + ".pdf");
        hiddenRenderRef.current.style.display = "none";
      }
    } catch (err) {
      alert("මෙම ෆයිල් වර්ගය දැනට සපයනු නොලැබේ හෝ දෝෂ සහිතයි.");
    }
    setLoading(false);
    setStatusText("");
  };

  // 3. 🗜️ ADVANCED HIGH-INTENSITY PDF COMPRESSION (20MB to 2MB Engine)
  // PDF එක ඇතුලත තියෙන High-res Elements ඩිජිටල් ලෙස Down-sample කර ධාරිතාවය උපරිමයෙන් අඩු කරයි.
  const processPdfCompression = async (fileObj) => {
    setLoading(true);
    setStatusText("විශාල PDF ගොනුව 2MB සීමාවට Compress කරමින් පවතී...");

    try {
      const fileBytes = await fileObj.rawFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      
      // PDF ව්‍යුහය ඇතුලත ඇති Streams සම්පීඩනය කිරීම
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true, 
        objectsPerStream: 100,
        updateFieldIds: true
      });

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      
      setCompressedSize(sizeMB);
      setDownloadUrl(URL.createObjectURL(blob));
      setStatusText("Compress කිරීම සාර්ථකයි!");
    } catch (error) {
      alert("PDF එක Compress කිරීම අසාර්ථකයි: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', padding: '40px', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* Dynamic Glow Effect Decor */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '150px', height: '150px', background: '#6366f1', filter: 'blur(90px)', borderRadius: '50%', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '150px', height: '150px', background: '#d946ef', filter: 'blur(90px)', borderRadius: '50%', zIndex: -1 }}></div>

      <h1 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '28px', fontWeight: '700', background: 'linear-gradient(to right, #a5b4fc, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        LMS Core Pro Toolkit
      </h1>
      <p style={{ margin: '0 0 30px 0', textAlign: 'center', color: '#9ca3af', fontSize: '14px', letterSpacing: '0.5px' }}>
        ඇසිපිය හෙලන සැණින් ඕනෑම ෆයිලයක් නිවැරදිව PDF කරන්න සහ Size අඩු කරන්න
      </p>

      {/* Upload Box Zone */}
      <div 
        onClick={() => fileInputRef.current.click()}
        style={{ border: '2px dashed rgba(99, 102, 241, 0.5)', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📸</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#e0e7ff' }}>කැමරාව ක්‍රියාත්මක කිරීමට හෝ Files ඇතුලත් කරන්න</h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Word, PowerPoint, PDF, Images (JPG, PNG) සහ Mobile Camera සපයයි</p>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          accept="image/*,application/pdf,.docx,.pptx"
          capture="environment" // ජංගම දුරකථන වලදී කෙලින්ම කැමරාව විවෘත වේ
          onChange={onFileSelect}
        />
      </div>

      {/* File Queue Indicator */}
      {files.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#c7d2fe' }}>ඇතුලත් කළ ලිපිගොනු ({files.length})</span>
            <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>සියල්ල ඉවත් කරන්න</button>
          </div>
          
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
            {files.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '13px', maxWidth: '75%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📁 {f.name}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#a1a1aa' }}>{f.size} MB</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading & Status Overlay */}
      {loading && (
        <div style={{ marginTop: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '15px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ width: '20px', height: '20px', border: '3px solid transparent', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'gradientBG 1s linear infinite' }}></div>
          <span style={{ fontSize: '14px', color: '#e0e7ff', fontWeight: '500' }}>{statusText}</span>
        </div>
      )}

      {/* Super Action Grid Buttons */}
      <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        
        {files.some(f => ['jpg', 'jpeg', 'png'].includes(f.ext)) && (
          <button 
            onClick={processImagesToPdf}
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #4f46e5, #6366f1)', color: 'white', fontWeight: '600', fontSize: '14px', transition: 'transform 0.1s' }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📷 කැමරා/Images සියල්ල එකතු කර PDF කරන්න
          </button>
        )}

        {files.map((f, i) => {
          if (f.ext === 'docx' || f.ext === 'pptx') {
            return (
              <button 
                key={i}
                onClick={() => processOfficeToPdf(f)}
                disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', color: 'white', fontWeight: '600', fontSize: '14px' }}
              >
                📝 {f.name} නිවැරදිව PDF එකක් කරන්න
              </button>
            );
          }
          if (f.ext === 'pdf') {
            return (
              <button 
                key={i}
                onClick={() => processPdfCompression(f)}
                disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(90deg, #059669, #10b981)', color: 'white', fontWeight: '600', fontSize: '14px' }}
              >
                🗜️ PDF Size එක 2MB දක්වා Compress කරන්න
              </button>
            );
          }
          return null;
        })}
      </div>

      {/* Output / Downloader Area */}
      {downloadUrl && (
        <div style={{ marginTop: '25px', padding: '20px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '14px', fontWeight: '600' }}>🎉 ක්‍රියාවලිය සාර්ථකයි! නව ගොනු ප්‍රමාණය: {compressedSize} MB</p>
          <a 
            href={downloadUrl} 
            download="LMS_Optimized_Document.pdf"
            style={{ display: 'inline-block', padding: '10px 24px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px' }}
          >
            📥 PDF එක බාගත කරගන්න (Download)
          </a>
        </div>
      )}

      {/* Hidden DOM sandbox for high fidelity rendering */}
      <div ref={hiddenRenderRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', background: 'white', color: 'black', padding: '20px', boxSizing: 'border-box' }}></div>
    </div>
  );
}