/**
 * Convert the first page of a PDF file to a base64 image using pdf.js via CDN
 */
export async function pdfToImage(file: File): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Dynamically load pdf.js from CDN
    const pdfjsLib = await loadPdfJs();
    if (!pdfjsLib) {
      console.error('Failed to load pdf.js');
      return null;
    }

    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Set scale for good quality (2x for clarity)
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render the page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];
    
    return {
      base64,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    return null;
  }
}

// Load pdf.js dynamically from CDN
let pdfjsLibCache: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLibCache) {
    return pdfjsLibCache;
  }

  try {
    // Check if already loaded globally
    if ((window as any).pdfjsLib) {
      pdfjsLibCache = (window as any).pdfjsLib;
      return pdfjsLibCache;
    }

    // Load the script dynamically
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load pdf.js'));
      document.head.appendChild(script);
    });

    // Set worker
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    pdfjsLibCache = pdfjsLib;
    return pdfjsLibCache;
  } catch (error) {
    console.error('Error loading pdf.js:', error);
    return null;
  }
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
