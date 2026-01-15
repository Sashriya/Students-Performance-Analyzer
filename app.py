from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pypdf import PdfReader
from PIL import Image
import io
import re


# =====================================================================
# 1) CONFIGURE GEMINI 3 USING OFFICIAL FORMAT
# =====================================================================
client = genai.Client(api_key="")     # ← YOUR KEY
MODEL = "gemini-3-flash-preview"                        # stable & fast


# =====================================================================
# 2) FASTAPI SETUP
# =====================================================================
app = FastAPI(title="AI Student Performance Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# 3) UTILS
# =====================================================================
BAD_WORDS = ["fuck", "shit", "bitch"]
BAD_RE = re.compile("|".join(re.escape(w) for w in BAD_WORDS), re.IGNORECASE)

def clean_text(text):
    if not text:
        return ""
    return BAD_RE.sub("****", text)


def extract_pdf(file):
    reader = PdfReader(file.file)
    final = ""
    for p in reader.pages:
        final += (p.extract_text() or "") + "\n"
    return final


def load_image(file):
    data = file.file.read()
    return Image.open(io.BytesIO(data))


# =====================================================================
# 4) MARKSHEET ANALYZER — MAIN LOGIC
# =====================================================================
@app.post("/analyze-marksheet")
async def analyze_marksheet(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(400, "Upload your marksheet.")

    filename = image.filename.lower()

    # Handle PDF
    if filename.endswith(".pdf"):
        extracted_text = extract_pdf(image)
        parts = [{"text": get_mark_prompt(extracted_text)}]

    # Handle Image
    else:
        img = load_image(image)
        parts = [
            {"text": get_mark_prompt("")},
            img
        ]

    response = client.models.generate_content(
        model=MODEL,
        contents=parts
    )

    cleaned = clean_text(getattr(response, "text", ""))
    return {"result": cleaned}


# =====================================================================
# 5) MARKSHEET ANALYSIS PROMPT — PURE JSON
# =====================================================================
def get_mark_prompt(text):
    return f"""
You are an expert student performance analyzer.

Extract subjects and marks, identify LOW MARKS subjects,
and explain WHY the student might be weak in those subjects.

Then give:
- Friendly Tanglish advice like a senior/machi
- Local slang (da, dei — but polite & friendly)
- Use decent language and keep them in stable mindset
- Don't use demotivating language and advice
- Strong motivation
- Proper JSON only

STRICT JSON FORMAT:

{{
  "subjects_detected": [],
  "marks": {{}},
  "low_mark_subjects": [],
  "reasons": [],
  "tanglish_advice": [],
  "study_plan": [],
  "motivation": "string"
}}

Analyze this marksheet text:
{text}
"""


# =====================================================================
# 6) FOLLOW-UP — ASK STUDENT REASON
# =====================================================================
@app.post("/student-reason")
async def student_reason(request: Request):
    data = await request.json()
    reason = data.get("reason", "")

    prompt = f"""
The student says: "{reason}"

Give friendly Tanglish feedback:
- what mistake they are doing
- how to fix it
- 5 simple habits
- motivational line

STRICT JSON:

{{
  "analysis": "",
  "fix": "",
  "habits": [],
  "motivation": ""
}}
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=[{"text": prompt}]
    )

    cleaned = clean_text(response.text)
    return {"result": cleaned}


# =====================================================================
# 7) CHATBOT — FRIENDLY AI
# =====================================================================
@app.post("/chatbot")
async def chatbot(request: Request):
    data = await request.json()
    msg = (data.get("message") or "").strip()

    if msg == "":
        return {"reply": "Hi da 💛 eppdi irukka?"}

    prompt = f"""
You are a friendly Tanglish Tamil AI friend.
Talk like: casual, cute emojis, local slang, caring, helpful.
Keep the conversation short.

User: {msg}
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=[{"text": prompt}]
    )

    cleaned = clean_text(response.text)
    return {"reply": cleaned}


# =====================================================================
# 8) RUN UVICORN
# =====================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
