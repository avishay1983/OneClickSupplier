from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
from utils.ai import generate_content

router = APIRouter(prefix="/api/documents", tags=["documents"])

class ClassifyRequest(BaseModel):
    imageBase64: str
    expectedType: Optional[str] = None

@router.post("/classify")
async def classify_document(request: ClassifyRequest):
    prompt = """
    אתה מומחה לזיהוי וסיווג מסמכים עסקיים בעברית.
    נתח את התמונה וקבע איזה סוג מסמך זה.

    סוגי המסמכים האפשריים:
    1. bookkeeping_cert - אישור ניהול ספרים
    2. tax_cert - אישור ניכוי מס במקור
    3. bank_confirmation - צילום המחאה או אישור בנק
    4. invoice_screenshot - צילום חשבונית
    5. unknown - לא ניתן לזהות

    החזר תשובה בפורמט JSON בלבד:
    {
      "detected_type": "bookkeeping_cert/tax_cert/bank_confirmation/invoice_screenshot/unknown",
      "confidence": "high/medium/low",
      "detected_type_hebrew": "שם הסוג בעברית",
      "reason": "הסבר קצר"
    }
    """
    
    # decode base64
    try:
        header, encoded = request.imageBase64.split(",", 1)
        image_data = base64.b64decode(encoded)
        mime_type = header.split(":")[1].split(";")[0]
    except:
        # Fallback if no header
        image_data = base64.b64decode(request.imageBase64)
        mime_type = "image/jpeg"

    result = await generate_content(prompt, image_data, mime_type)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    # Add match info
    if request.expectedType:
        result["is_match"] = result.get("detected_type") == request.expectedType
        result["expected_type"] = request.expectedType

    return result

class ExtractDataRequest(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/jpeg"
    documentType: str

@router.post("/extract-data")
async def extract_document_data(request: ExtractDataRequest):
    prompt = f"""
    אתה מומחה OCR מקצועי לחילוץ נתונים מתמונות של מסמכים עסקיים ישראליים (סוג: {request.documentType}).
    חלץ את השדות הבאים:
    1. company_id (ח.פ/ע.מ - 9 ספרות)
    2. company_name
    3. phone, mobile, fax, email
    4. city, street, street_number, postal_code
    5. bank_number, branch_number, account_number

    החזר JSON בלבד עם המפתחות הנ"ל (ערכים null אם לא נמצא).
    """
    
    try:
        if "," in request.imageBase64:
             header, encoded = request.imageBase64.split(",", 1)
             image_data = base64.b64decode(encoded)
             mime_type = header.split(":")[1].split(";")[0]
        else:
             image_data = base64.b64decode(request.imageBase64)
             mime_type = request.mimeType

    except:
        raise HTTPException(status_code=400, detail="Invalid base64")

    result = await generate_content(prompt, image_data, mime_type)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return {"success": True, "extracted": result}

class ExtractTextRequest(BaseModel):
    textContent: str
    documentType: str

@router.post("/extract-text")
async def extract_document_text(request: ExtractTextRequest):
    prompt = f"""
    אתה מומחה לחילוץ נתונים ממסמכים עסקיים ישראליים.
    המסמך הוא מסוג: {request.documentType}
    הטקסט חולץ מהמסמך:
    {request.textContent}
    
    אנא חלץ ממנו את כל הפרטים העסקיים (ח.פ, שם, כתובת, טלפונים, בנק).
    החזר JSON בלבד.
    """
    
    result = await generate_content(prompt) # No image, just text prompt
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return {"success": True, "extracted": result, "documentType": request.documentType}

class ExtractBankRequest(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/jpeg"

@router.post("/extract-bank-details")
async def extract_bank_details(request: ExtractBankRequest):
    prompt = """
    אתה מומחה OCR לחילוץ פרטי בנק.
    חפש: מספר בנק (2 ספרות), מספר סניף (3-4 ספרות), מספר חשבון.
    אם זו המחאה (צ'ק) - סרוק את הפס המגנטי למטה.
    
    החזר JSON:
    {
      "bank_number": "XX",
      "branch_number": "XXX",
      "account_number": "XXXXXX",
      "confidence": "high/medium/low",
      "document_type": "check/bank_confirmation/other"
    }
    """
    
    try:
        if "," in request.imageBase64:
             header, encoded = request.imageBase64.split(",", 1)
             image_data = base64.b64decode(encoded)
             mime_type = header.split(":")[1].split(";")[0]
        else:
             image_data = base64.b64decode(request.imageBase64)
             mime_type = request.mimeType
    except:
         raise HTTPException(status_code=400, detail="Invalid base64")

    result = await generate_content(prompt, image_data, mime_type)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    return {"success": True, "extracted": result}

class DetectSignatureRequest(BaseModel):
    imageBase64: str
    signerType: str # vp / procurement_manager

@router.post("/detect-signature")
async def detect_signature_position(request: DetectSignatureRequest):
    label = "סמנכ\"ל" if request.signerType == "vp" else "מנהל רכש"
    prompt = f"""
    נתח את התמונה ומצא את קו החתימה הריק עבור "{label}".
    החזר JSON עם מיקום (אחוזים משמאל ומלמטה):
    {{
      "x_percent": number (0-100),
      "y_percent": number (0-100),
      "found": boolean
    }}
    """
    
    try:
        if "," in request.imageBase64:
             header, encoded = request.imageBase64.split(",", 1)
             image_data = base64.b64decode(encoded)
             mime_type = header.split(":")[1].split(";")[0]
        else:
             image_data = base64.b64decode(request.imageBase64)
             mime_type = "image/jpeg"
    except:
         raise HTTPException(status_code=400, detail="Invalid base64")

    result = await generate_content(prompt, image_data, mime_type)
    
    if "error" in result:
         # Fallback default positions
         if request.signerType == "vp":
             return {"x_percent": 12, "y_percent": 18, "found": False}
         else:
             return {"x_percent": 44, "y_percent": 18, "found": False}
             
    return result
