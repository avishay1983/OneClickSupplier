import os
import json
from typing import Optional, Dict, Any, List

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    print("Warning: google-generativeai not installed. AI features will be disabled.")

def configure_gemini():
    if not HAS_GENAI:
        return False
        
    api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        print("Warning: GOOGLE_GEMINI_API_KEY not found")
        return False
    genai.configure(api_key=api_key)
    return True

def clean_json_string(text: str) -> str:
    """Removes markdown code blocks if present."""
    if "```json" in text:
        text = text.replace("```json", "").replace("```", "")
    elif "```" in text:
        text = text.replace("```", "")
    return text.strip()

async def generate_content(
    prompt: str, 
    image_data: Optional[bytes] = None, 
    mime_type: str = "image/jpeg",
    model_name: str = "gemini-2.0-flash"
) -> Dict[str, Any]:
    """
    Generates content using Gemini. if image_data is provided, it performs multimodal generation.
    Returns parsed JSON if possible, or a dict with 'text' key.
    """
    if not HAS_GENAI:
        return {"error": "google-generativeai library not installed"}
        
    if not configure_gemini():
        return {"error": "API key not configured"}
        
    try:
        model = genai.GenerativeModel(model_name)
        
        parts = [prompt]
        if image_data:
            parts.append({
                "mime_type": mime_type,
                "data": image_data
            })
            
        response = await model.generate_content_async(
            parts,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json" # Ask for JSON directly
            )
        )
        
        text = response.text
        cleaned_text = clean_json_string(text)
        
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            return {"error": "Failed to parse JSON", "raw_text": text}
            
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"error": str(e)}
