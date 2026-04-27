import os
import asyncio
from dotenv import load_dotenv
import sys

# Add backend to path to import ai utils
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from utils.ai import generate_content

async def test_openai():
    print("Testing OpenAI configuration...")
    load_dotenv('backend/.env')
    
    api_key = os.environ.get("OPENAI_API_KEY")
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")
    
    print(f"API Key found: {'Yes' if api_key else 'No'}")
    print(f"Model: {model}")
    
    if not api_key:
        print("Error: OPENAI_API_KEY not found in .env")
        return

    # Try a simple completion
    prompt = "Say hello in JSON format with a 'message' key"
    print(f"Sending prompt: {prompt}")
    
    result = await generate_content(
        prompt=prompt,
        provider="openai",
        model_name=model
    )
    
    if "error" in result:
        print(f"Error from API: {result['error']}")
    else:
        print(f"Success! Response: {result.get('text')}")

if __name__ == "__main__":
    asyncio.run(test_openai())
