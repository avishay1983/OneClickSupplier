import os
import json
import base64
from typing import Optional, Dict, Any, List

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# Configuration from environment variables
DEFAULT_AI_PROVIDER = os.environ.get("AI_PROVIDER", "gemini").lower()
DEFAULT_OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")

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

async def _generate_with_gemini(
    prompt: str, 
    image_data: Optional[bytes] = None, 
    mime_type: str = "image/jpeg",
    model_name: str = DEFAULT_GEMINI_MODEL
) -> Dict[str, Any]:
    if not HAS_GENAI:
        return {"error": "google-generativeai library not installed"}
        
    if not configure_gemini():
        return {"error": "Gemini API key not configured"}
        
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
                response_mime_type="application/json"
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

async def _generate_with_openai(
    prompt: str, 
    image_data: Optional[bytes] = None, 
    mime_type: str = "image/jpeg",
    model_name: str = DEFAULT_OPENAI_MODEL
) -> Dict[str, Any]:
    if not HAS_OPENAI:
        return {"error": "openai library not installed"}
        
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OPENAI_API_KEY not found in environment"}
        
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        messages = []
        content = [{"type": "text", "text": prompt}]
        
        if image_data:
            base64_image = base64.b64encode(image_data).decode('utf-8')
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}"
                }
            })
            
        messages.append({"role": "user", "content": content})
        
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        text = response.choices[0].message.content
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "Failed to parse JSON", "raw_text": text}
            
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return {"error": str(e)}

async def generate_content(
    prompt: str, 
    image_data: Optional[bytes] = None, 
    mime_type: str = "image/jpeg",
    model_name: Optional[str] = None,
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatcher for AI content generation.
    """
    target_provider = (provider or DEFAULT_AI_PROVIDER).lower()
    
    if target_provider == "openai":
        return await _generate_with_openai(
            prompt, 
            image_data, 
            mime_type, 
            model_name or DEFAULT_OPENAI_MODEL
        )
    else:
        # Default to gemini
        return await _generate_with_gemini(
            prompt, 
            image_data, 
            mime_type, 
            model_name or DEFAULT_GEMINI_MODEL
        )
